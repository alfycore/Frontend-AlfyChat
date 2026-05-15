'use client';

// ==========================================
// ALFYCHAT - SFU TRANSPORT (mediasoup-client)
// Gère le cycle de vie des transports WebRTC
// côté client pour les appels via SFU mediasoup.
//
// Utilisé par use-call.ts quand callMode === 'sfu'
// (appels groupe >10 participants + appels serveur).
// ==========================================

import { useRef, useCallback, useState } from 'react';
import { socketService } from '@/lib/socket';

// Types minimaux de mediasoup-client (évite l'import direct)
type Device = import('mediasoup-client').Device;
type Transport = import('mediasoup-client').types.Transport;
type Producer = import('mediasoup-client').types.Producer;
type Consumer = import('mediasoup-client').types.Consumer;

export interface SfuRemoteStream {
  userId: string;
  stream: MediaStream;
  kind: 'audio' | 'video';
  producerId: string;
}

interface SfuState {
  deviceLoaded: boolean;
  sendTransportReady: boolean;
  recvTransportReady: boolean;
}

export function useSfuTransport() {
  const deviceRef = useRef<Device | null>(null);
  const sendTransportRef = useRef<Transport | null>(null);
  const recvTransportRef = useRef<Transport | null>(null);
  const producersRef = useRef<Map<string, Producer>>(new Map());  // kind → producer
  const consumersRef = useRef<Map<string, Consumer>>(new Map());   // consumerId → consumer

  const [sfuState, setSfuState] = useState<SfuState>({
    deviceLoaded: false,
    sendTransportReady: false,
    recvTransportReady: false,
  });

  // remoteStreams: producerId → MediaStream (même format que le P2P)
  const [sfuRemoteStreams, setSfuRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

  // ── Charger le Device mediasoup-client avec les capabilities du router ──────
  const loadDevice = useCallback(async (callId: string): Promise<boolean> => {
    try {
      const { Device: MsDevice } = await import('mediasoup-client');

      const device = new MsDevice();

      // Récupérer les RTP capabilities depuis le media-server (via gateway)
      const caps = await new Promise<Record<string, unknown>>((resolve, reject) => {
        socketService.emitWithAck('SFU_GET_RTP_CAPABILITIES', { callId }, (res: Record<string, unknown>) => {
          if (res?.error) reject(new Error(res.error as string));
          else resolve(res);
        });
      });

      await device.load({ routerRtpCapabilities: caps.rtpCapabilities as any });
      deviceRef.current = device;
      setSfuState((s) => ({ ...s, deviceLoaded: true }));
      return true;
    } catch (err) {
      console.error('[SFU] Impossible de charger le Device:', err);
      return false;
    }
  }, []);

  // ── Créer un transport ────────────────────────────────────────────────────────
  const createTransport = useCallback(async (
    callId: string,
    direction: 'send' | 'recv',
  ): Promise<Transport | null> => {
    const device = deviceRef.current;
    if (!device) return null;

    try {
      const transportData = await new Promise<Record<string, unknown>>((resolve, reject) => {
        socketService.emitWithAck('SFU_CREATE_TRANSPORT', { callId, direction }, (res: Record<string, unknown>) => {
          if (res?.error) reject(new Error(res.error as string));
          else resolve(res);
        });
      });

      const { transportId, iceParameters, iceCandidates, dtlsParameters } = transportData as any;

      const transport = direction === 'send'
        ? device.createSendTransport({ id: transportId, iceParameters, iceCandidates, dtlsParameters })
        : device.createRecvTransport({ id: transportId, iceParameters, iceCandidates, dtlsParameters });

      // ── Connexion DTLS ──
      transport.on('connect', ({ dtlsParameters: dtls }: any, callback: () => void, errback: (err: Error) => void) => {
        socketService.emitWithAck('SFU_CONNECT_TRANSPORT', {
          callId,
          transportId: transport.id,
          dtlsParameters: dtls,
        }, (res: Record<string, unknown>) => {
          if (res?.error) errback(new Error(res.error as string));
          else callback();
        });
      });

      // ── Produce (send transport uniquement) ──
      if (direction === 'send') {
        transport.on('produce', (
          { kind, rtpParameters, appData }: any,
          callback: (params: { id: string }) => void,
          errback: (err: Error) => void,
        ) => {
          socketService.emitWithAck('SFU_PRODUCE', {
            callId,
            transportId: transport.id,
            kind,
            rtpParameters,
            appData,
          }, (res: Record<string, unknown>) => {
            if (res?.error) errback(new Error(res.error as string));
            else callback({ id: res.producerId as string });
          });
        });
      }

      if (direction === 'send') {
        sendTransportRef.current = transport;
        setSfuState((s) => ({ ...s, sendTransportReady: true }));
      } else {
        recvTransportRef.current = transport;
        setSfuState((s) => ({ ...s, recvTransportReady: true }));
      }

      return transport;
    } catch (err) {
      console.error(`[SFU] Erreur création transport ${direction}:`, err);
      return null;
    }
  }, []);

  // ── Produire les tracks locaux ────────────────────────────────────────────────
  const produceTrack = useCallback(async (
    track: MediaStreamTrack,
    callId: string,
    encodings?: RTCRtpEncodingParameters[],
  ): Promise<Producer | null> => {
    const transport = sendTransportRef.current;
    if (!transport) return null;

    try {
      const producer = await transport.produce({
        track,
        encodings: encodings as any,
        codecOptions: track.kind === 'audio'
          ? { opusStereo: true, opusDtx: true }
          : undefined,
      });

      producersRef.current.set(track.kind, producer);

      producer.on('transportclose', () => {
        producersRef.current.delete(track.kind);
      });

      return producer;
    } catch (err) {
      console.error('[SFU] Erreur produce track:', err);
      return null;
    }
  }, []);

  // ── Consommer un producer distant ────────────────────────────────────────────
  const consumeProducer = useCallback(async (
    callId: string,
    producerId: string,
    userId: string,
    kind: 'audio' | 'video',
  ): Promise<void> => {
    const device = deviceRef.current;
    const transport = recvTransportRef.current;
    if (!device || !transport) return;

    try {
      const consumerData = await new Promise<Record<string, unknown>>((resolve, reject) => {
        socketService.emitWithAck('SFU_CONSUME', {
          callId,
          producerId,
          rtpCapabilities: device.rtpCapabilities,
          recvTransportId: transport.id,
        }, (res: Record<string, unknown>) => {
          if (res?.error) reject(new Error(res.error as string));
          else resolve(res);
        });
      });

      const { consumerId, rtpParameters, paused } = consumerData as any;

      const consumer = await transport.consume({
        id: consumerId,
        producerId,
        kind,
        rtpParameters,
      });

      consumersRef.current.set(consumerId, consumer);

      // Créer le MediaStream depuis le consumer
      const stream = new MediaStream([consumer.track]);

      setSfuRemoteStreams((prev) => {
        const next = new Map(prev);
        // Clé: userId pour audio/voix, `${userId}_screen` pour vidéo screen share
        const key = kind === 'video' ? `${userId}_screen` : userId;
        const existing = prev.get(key);
        if (existing) {
          existing.addTrack(consumer.track);
          next.set(key, existing);
        } else {
          next.set(key, stream);
        }
        return next;
      });

      // Resume le consumer (toujours commencer en paused)
      if (paused) {
        socketService.emitWithAck('SFU_RESUME_CONSUMER', { callId, consumerId }, () => {});
        await consumer.resume();
      }

      consumer.on('transportclose', () => {
        consumersRef.current.delete(consumerId);
        setSfuRemoteStreams((prev) => {
          const next = new Map(prev);
          next.delete(userId);
          next.delete(`${userId}_screen`);
          return next;
        });
      });

      (consumer as any).on('producerclose', () => {
        consumersRef.current.delete(consumerId);
        setSfuRemoteStreams((prev) => {
          const next = new Map(prev);
          const key = kind === 'video' ? `${userId}_screen` : userId;
          next.delete(key);
          return next;
        });
      });
    } catch (err) {
      console.error(`[SFU] Erreur consume producer ${producerId}:`, err);
    }
  }, []);

  // ── Initialisation complète pour un appel ────────────────────────────────────
  const initSfu = useCallback(async (
    callId: string,
    localStream: MediaStream | null,
  ): Promise<void> => {
    const ok = await loadDevice(callId);
    if (!ok) return;

    await createTransport(callId, 'send');
    await createTransport(callId, 'recv');

    // Produire les tracks locaux
    if (localStream && sendTransportRef.current) {
      const audioTrack = localStream.getAudioTracks()[0];
      const videoTrack = localStream.getVideoTracks()[0];

      if (audioTrack) {
        await produceTrack(audioTrack, callId);
      }
      if (videoTrack) {
        // Simulcast 3 couches pour la vidéo
        await produceTrack(videoTrack, callId, [
          { rid: 'r0', maxBitrate: 100_000 },
          { rid: 'r1', maxBitrate: 300_000 },
          { rid: 'r2', maxBitrate: 900_000 },
        ]);
      }
    }
  }, [loadDevice, createTransport, produceTrack]);

  // ── Fermeture propre ─────────────────────────────────────────────────────────
  const closeSfu = useCallback((callId: string) => {
    for (const [kind, producer] of producersRef.current) {
      socketService.emitWithAck('SFU_CLOSE_PRODUCER', { callId, producerId: producer.id }, () => {});
      producer.close();
    }
    producersRef.current.clear();

    for (const [, consumer] of consumersRef.current) {
      consumer.close();
    }
    consumersRef.current.clear();

    sendTransportRef.current?.close();
    sendTransportRef.current = null;
    recvTransportRef.current?.close();
    recvTransportRef.current = null;

    setSfuRemoteStreams(new Map());
    setSfuState({ deviceLoaded: false, sendTransportReady: false, recvTransportReady: false });
  }, []);

  return {
    sfuState,
    sfuRemoteStreams,
    producersRef,
    consumersRef,
    initSfu,
    closeSfu,
    consumeProducer,
    produceTrack,
  };
}
