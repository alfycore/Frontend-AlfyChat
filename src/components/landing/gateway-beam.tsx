"use client"

import { useRef } from "react"
import {
  UsersIcon, MessageCircleIcon, PhoneIcon, BotIcon, ServerIcon, MediaIcon, GlobeIcon,
} from "@/components/icons"
import { AnimatedBeam } from "@/components/ui/animated-beam"
import { cn } from "@/lib/utils"

const Circle = ({
  className,
  children,
  ref,
}: {
  className?: string
  children?: React.ReactNode
  ref?: React.RefObject<HTMLDivElement | null>
}) => (
  <div
    ref={ref}
    className={cn(
      "z-10 flex size-10 items-center justify-center rounded-full border-2 border-border bg-background p-2 shadow-sm",
      className,
    )}
  >
    {children}
  </div>
)

export function GatewayBeam({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const clientRef = useRef<HTMLDivElement>(null)
  const gatewayRef = useRef<HTMLDivElement>(null)
  const usersRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const callsRef = useRef<HTMLDivElement>(null)
  const botsRef = useRef<HTMLDivElement>(null)
  const serversRef = useRef<HTMLDivElement>(null)
  const mediaRef = useRef<HTMLDivElement>(null)
  const friendsRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex h-full w-full items-center justify-between p-10",
        className,
      )}
    >
      {/* Client (gauche) */}
      <div className="flex flex-col items-center justify-center gap-1">
        <Circle ref={clientRef} className="size-12">
          <GlobeIcon size={20} className="text-muted-foreground" />
        </Circle>
        <span className="text-[9px] font-medium text-muted-foreground">Client</span>
      </div>

      {/* Gateway (centre) */}
      <div className="flex flex-col items-center justify-center gap-1">
        <Circle ref={gatewayRef} className="size-14 border-primary/40 bg-primary shadow-md">
          <img src="/logo/Alfychat.svg" alt="Gateway" className="size-7" />
        </Circle>
        <span className="text-[9px] font-semibold text-primary">Gateway</span>
      </div>

      {/* Microservices (droite, colonne) */}
      <div className="flex flex-col items-center justify-center gap-2">
        <Circle ref={usersRef}>
          <UsersIcon size={16} className="text-muted-foreground" />
        </Circle>
        <Circle ref={messagesRef}>
          <MessageCircleIcon size={16} className="text-muted-foreground" />
        </Circle>
        <Circle ref={callsRef}>
          <PhoneIcon size={16} className="text-muted-foreground" />
        </Circle>
        <Circle ref={friendsRef}>
          <UsersIcon size={16} className="text-muted-foreground" />
        </Circle>
        <Circle ref={serversRef}>
          <ServerIcon size={16} className="text-muted-foreground" />
        </Circle>
        <Circle ref={mediaRef}>
          <MediaIcon size={16} className="text-muted-foreground" />
        </Circle>
        <Circle ref={botsRef}>
          <BotIcon size={16} className="text-muted-foreground" />
        </Circle>
      </div>

      {/* Beam client → gateway */}
      <AnimatedBeam containerRef={containerRef} fromRef={clientRef} toRef={gatewayRef} gradientStartColor="#7c3aed" gradientStopColor="#9E7AFF" duration={3} />

      {/* Beams gateway → services */}
      <AnimatedBeam containerRef={containerRef} fromRef={gatewayRef} toRef={usersRef}    gradientStartColor="#9E7AFF" gradientStopColor="#7c3aed" duration={3}   />
      <AnimatedBeam containerRef={containerRef} fromRef={gatewayRef} toRef={messagesRef} gradientStartColor="#9E7AFF" gradientStopColor="#7c3aed" duration={3.5} delay={0.2} />
      <AnimatedBeam containerRef={containerRef} fromRef={gatewayRef} toRef={callsRef}    gradientStartColor="#9E7AFF" gradientStopColor="#7c3aed" duration={4}   delay={0.4} />
      <AnimatedBeam containerRef={containerRef} fromRef={gatewayRef} toRef={friendsRef}  gradientStartColor="#9E7AFF" gradientStopColor="#7c3aed" duration={3.5} delay={0.6} />
      <AnimatedBeam containerRef={containerRef} fromRef={gatewayRef} toRef={serversRef}  gradientStartColor="#9E7AFF" gradientStopColor="#7c3aed" duration={3}   delay={0.8} />
      <AnimatedBeam containerRef={containerRef} fromRef={gatewayRef} toRef={mediaRef}    gradientStartColor="#9E7AFF" gradientStopColor="#7c3aed" duration={4}   delay={1.0} />
      <AnimatedBeam containerRef={containerRef} fromRef={gatewayRef} toRef={botsRef}     gradientStartColor="#9E7AFF" gradientStopColor="#7c3aed" duration={3.5} delay={1.2} />
    </div>
  )
}
