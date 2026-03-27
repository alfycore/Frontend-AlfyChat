'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpenIcon,
  KeyIcon,
  ZapIcon,
  CodeIcon,
  ServerIcon,
  TerminalIcon,
  ShieldCheckIcon,
  TagIcon,
  GlobeIcon,
  CopyIcon,
  CheckIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from '@/components/icons';
import { Accordion, Card, Chip, ScrollShadow, Separator } from '@heroui/react';
import { cn } from '@/lib/utils';
import { useLang, LANGS, type Lang } from '../lang-context';

/* ═══════════════════════════════════════════════════════════ */
/*  Primitives partagées                                       */
/* ═══════════════════════════════════════════════════════════ */

function PageHeader({
  icon,
  title,
  description,
  badge,
}: {
  icon: any;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <div className="mb-8 flex items-start gap-4">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent/10 ring-1 ring-accent-soft-hover">
        <icon size={22} className="text-accent" />
      </div>
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {badge && (
            <Chip size="sm" color="success" variant="soft">
              <Chip.Label className="text-[10px] font-bold">{badge}</Chip.Label>
            </Chip>
          )}
        </div>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-accent/60">
      {children}
    </h2>
  );
}

function InfoCard({
  color,
  title,
  children,
}: {
  color: 'blue' | 'green' | 'violet' | 'amber' | 'red';
  title: string;
  children: React.ReactNode;
}) {
  const styles: Record<string, string> = {
    blue:   'bg-blue-500/8 border-blue-500/20 text-blue-400',
    green:  'bg-green-500/8 border-green-500/20 text-green-400',
    violet: 'bg-violet-500/8 border-violet-500/20 text-violet-400',
    amber:  'bg-amber-500/8 border-amber-500/20 text-amber-400',
    red:    'bg-red-500/8 border-red-500/20 text-red-400',
  };
  return (
    <div className={cn('rounded-xl border p-4', styles[color])}>
      <p className="mb-1.5 text-xs font-bold">{title}</p>
      <div className="text-[11px] leading-relaxed opacity-80">{children}</div>
    </div>
  );
}

function CodeBlock({ code, lang = 'js', title }: { code: string; lang?: string; title?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      {title && (
        <div className="flex items-center justify-between border-b border-border/60 bg-surface/80 px-4 py-2">
          <span className="font-mono text-[11px] text-muted">{title}</span>
          <div className="flex items-center gap-2">
            <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-[9px] text-muted/60">{lang}</span>
            <button
              onClick={copy}
              aria-label="Copier"
              className="flex size-6 items-center justify-center rounded hover:bg-surface"
            >
              <copied ? CheckIcon : CopyIcon size={12}
                className={copied ? 'text-green-400' : 'text-muted'} />
            </button>
          </div>
        </div>
      )}
      <ScrollShadow orientation="horizontal">
        <pre className="bg-[#0d1117] p-4 text-[12px] leading-relaxed">
          <code className="whitespace-pre font-mono text-gray-300">{code}</code>
        </pre>
      </ScrollShadow>
    </div>
  );
}

/** Bloc de code multi-langage : lit le lang courant depuis le contexte */
function MultiCodeBlock({
  examples,
  title,
  fallback = 'js',
}: {
  examples: Partial<Record<Lang, string>>;
  title?: string;
  fallback?: Lang;
}) {
  const { lang } = useLang();
  const currentLang = lang as Lang;
  const code = examples[currentLang] ?? examples[fallback] ?? '';
  const meta = LANGS.find((l) => l.id === currentLang) ?? LANGS[0];
  return <CodeBlock lang={meta.ext} title={title} code={code} />;
}

function HttpBadge({ method }: { method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT' }) {
  const styles: Record<string, string> = {
    GET:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    POST:   'bg-blue-500/15 text-blue-400 border-blue-500/20',
    PATCH:  'bg-amber-500/15 text-amber-400 border-amber-500/20',
    DELETE: 'bg-red-500/15 text-red-400 border-red-500/20',
    PUT:    'bg-violet-500/15 text-violet-400 border-violet-500/20',
  };
  return (
    <span className={cn('inline-flex shrink-0 rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider', styles[method])}>
      {method}
    </span>
  );
}

function EndpointRow({ method, path, desc }: { method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT'; path: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-surface/40 px-3 py-2.5 hover:bg-surface/70 transition-colors">
      <HttpBadge method={method} />
      <div>
        <code className="text-xs font-semibold text-foreground">{path}</code>
        <p className="mt-0.5 text-[11px] text-muted">{desc}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  Exemples de code multi-langage                            */
/* ═══════════════════════════════════════════════════════════ */

const EX = {

  /*── INSTALL ──────────────────────────────────────────────*/
  install: {
    js:     `npm install socket.io-client dotenv`,
    ts:     `npm install socket.io-client dotenv\nnpm install -D @types/node typescript`,
    python: `pip install python-socketio[websockets] requests python-dotenv aiohttp`,
    java: `<!-- Maven pom.xml -->\n<dependency>\n    <groupId>io.socket</groupId>\n    <artifactId>socket.io-client</artifactId>\n    <version>2.1.0</version>\n</dependency>`,
  },

  /*── BOT PRINCIPAL ────────────────────────────────────────*/
  botMain: {
    js: `require('dotenv').config();
const { io } = require('socket.io-client');

const BOT_TOKEN = process.env.BOT_TOKEN;
const API_BASE  = 'https://gateway.alfychat.app/api';

const socket = io('https://gateway.alfychat.app', {
  auth: { token: BOT_TOKEN, type: 'bot' },
});

socket.on('connect',    () => console.log('🤖 Bot connecté !'));
socket.on('disconnect', () => console.log('❌ Déconnecté'));

socket.on('NEW_MESSAGE', async ({ content, channelId }) => {
  if (content === '!ping') {
    await fetch(\`\${API_BASE}/messages\`, {
      method: 'POST',
      headers: { 'Authorization': \`Bot \${BOT_TOKEN}\`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId, content: '🏓 Pong !' }),
    });
  }
});`,
    ts: `import dotenv from 'dotenv';
import { io, Socket } from 'socket.io-client';

dotenv.config();

const BOT_TOKEN: string = process.env.BOT_TOKEN!;
const API_BASE  = 'https://gateway.alfychat.app/api';

interface Message {
  id: string;
  content: string;
  channelId: string;
  authorId: string;
}

const socket: Socket = io('https://gateway.alfychat.app', {
  auth: { token: BOT_TOKEN, type: 'bot' },
});

socket.on('connect',    () => console.log('🤖 Bot connecté !'));
socket.on('disconnect', () => console.log('❌ Déconnecté'));

socket.on('NEW_MESSAGE', async (msg: Message) => {
  if (msg.content === '!ping') {
    await fetch(\`\${API_BASE}/messages\`, {
      method: 'POST',
      headers: { 'Authorization': \`Bot \${BOT_TOKEN}\`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId: msg.channelId, content: '🏓 Pong !' }),
    });
  }
});`,
    python: `import os, asyncio, aiohttp, socketio
from dotenv import load_dotenv

load_dotenv()
BOT_TOKEN = os.environ['BOT_TOKEN']
API_BASE  = 'https://gateway.alfychat.app/api'

sio = socketio.AsyncClient()

@sio.event
async def connect():
    print('🤖 Bot connecté !')

@sio.event
async def disconnect():
    print('❌ Déconnecté')

@sio.on('NEW_MESSAGE')
async def on_message(data):
    if data.get('content') == '!ping':
        async with aiohttp.ClientSession() as session:
            await session.post(
                f'{API_BASE}/messages',
                headers={'Authorization': f'Bot {BOT_TOKEN}'},
                json={'channelId': data['channelId'], 'content': '🏓 Pong !'},
            )

async def main():
    await sio.connect(
        'https://gateway.alfychat.app',
        auth={'token': BOT_TOKEN, 'type': 'bot'},
    )
    await sio.wait()

if __name__ == '__main__':
    asyncio.run(main())`,
    java: `import io.socket.client.IO;
import io.socket.client.Socket;
import org.json.JSONObject;
import java.net.URI;
import java.net.http.*;
import java.util.Map;

public class AlfyBot {
    static final String BOT_TOKEN = System.getenv("BOT_TOKEN");
    static final String API_BASE  = "https://gateway.alfychat.app/api";

    public static void main(String[] args) throws Exception {
        IO.Options opts = IO.Options.builder()
            .setAuth(Map.of("token", BOT_TOKEN, "type", "bot"))
            .build();

        Socket socket = IO.socket(URI.create("https://gateway.alfychat.app"), opts);

        socket.on(Socket.EVENT_CONNECT, a ->
            System.out.println("🤖 Bot connecté !"));

        socket.on("NEW_MESSAGE", args2 -> {
            JSONObject msg = (JSONObject) args2[0];
            try {
                if ("!ping".equals(msg.getString("content"))) {
                    sendMessage(msg.getString("channelId"), "🏓 Pong !");
                }
            } catch (Exception e) { e.printStackTrace(); }
        });

        socket.connect();
        Thread.sleep(Long.MAX_VALUE);
    }

    static void sendMessage(String channelId, String content) throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        String body = new JSONObject()
            .put("channelId", channelId)
            .put("content", content).toString();

        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create(API_BASE + "/messages"))
            .header("Authorization", "Bot " + BOT_TOKEN)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();
        client.send(req, HttpResponse.BodyHandlers.ofString());
    }
}`,
  },

  /*── AUTHENTIFICATION ─────────────────────────────────────*/
  authRequest: {
    js: `const BOT_TOKEN = process.env.BOT_TOKEN;

const res = await fetch('https://gateway.alfychat.app/api/bots/authenticate', {
  method: 'POST',
  headers: {
    'Authorization': \`Bot \${BOT_TOKEN}\`,
    'Content-Type': 'application/json',
  },
});

const data = await res.json();
console.log('Connecté :', data.bot.name);`,
    ts: `interface BotInfo {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'maintenance';
  isVerified: boolean;
  prefix: string;
  serverCount: number;
}

interface AuthResponse {
  success: boolean;
  bot: BotInfo;
}

const BOT_TOKEN: string = process.env.BOT_TOKEN!;

const res = await fetch('https://gateway.alfychat.app/api/bots/authenticate', {
  method: 'POST',
  headers: {
    'Authorization': \`Bot \${BOT_TOKEN}\`,
    'Content-Type': 'application/json',
  },
});

const data: AuthResponse = await res.json();
console.log('Connecté :', data.bot.name);`,
    python: `import os, requests

BOT_TOKEN = os.environ['BOT_TOKEN']

res = requests.post(
    'https://gateway.alfychat.app/api/bots/authenticate',
    headers={
        'Authorization': f'Bot {BOT_TOKEN}',
        'Content-Type': 'application/json',
    }
)

data = res.json()
print(f"Connecté : {data['bot']['name']}")`,
    java: `import java.net.URI;
import java.net.http.*;

public class Auth {
    static String BOT_TOKEN = System.getenv("BOT_TOKEN");

    public static void main(String[] args) throws Exception {
        HttpClient client = HttpClient.newHttpClient();

        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create("https://gateway.alfychat.app/api/bots/authenticate"))
            .header("Authorization", "Bot " + BOT_TOKEN)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.noBody())
            .build();

        HttpResponse<String> res = client.send(req, HttpResponse.BodyHandlers.ofString());
        System.out.println(res.body());
    }
}`,
  },

  /*── SEND MESSAGE ─────────────────────────────────────────*/
  sendMessage: {
    js: `async function sendMessage(channelId, content, options = {}) {
  const res = await fetch('https://gateway.alfychat.app/api/messages', {
    method: 'POST',
    headers: {
      'Authorization': \`Bot \${process.env.BOT_TOKEN}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ channelId, content, ...options }),
  });
  return res.json();
}

// Envoi simple
await sendMessage('channel-id', 'Bonjour !');

// En réponse à un message
await sendMessage('channel-id', 'Je te réponds !', { replyToId: 'msg-id' });`,
    ts: `interface SendOptions {
  replyToId?: string;
  attachments?: string[];
}

async function sendMessage(
  channelId: string,
  content: string,
  options: SendOptions = {},
): Promise<{ id: string; content: string }> {
  const res = await fetch('https://gateway.alfychat.app/api/messages', {
    method: 'POST',
    headers: {
      'Authorization': \`Bot \${process.env.BOT_TOKEN}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ channelId, content, ...options }),
  });
  return res.json();
}

// Envoi simple
await sendMessage('channel-id', 'Bonjour !');

// En réponse
await sendMessage('channel-id', 'Je te réponds !', { replyToId: 'msg-id' });`,
    python: `import os, aiohttp

async def send_message(channel_id: str, content: str, **options) -> dict:
    async with aiohttp.ClientSession() as session:
        async with session.post(
            'https://gateway.alfychat.app/api/messages',
            headers={'Authorization': f"Bot {os.environ['BOT_TOKEN']}"},
            json={'channelId': channel_id, 'content': content, **options},
        ) as res:
            return await res.json()

# Envoi simple
await send_message('channel-id', 'Bonjour !')

# En réponse
await send_message('channel-id', 'Je te réponds !', replyToId='msg-id')`,
    java: `import java.net.URI;
import java.net.http.*;
import org.json.JSONObject;

public class MessageApi {
    private static final String BASE = "https://gateway.alfychat.app/api";
    private static final String TOKEN = System.getenv("BOT_TOKEN");
    private static final HttpClient HTTP = HttpClient.newHttpClient();

    public static JSONObject sendMessage(String channelId, String content) throws Exception {
        JSONObject body = new JSONObject()
            .put("channelId", channelId)
            .put("content", content);

        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create(BASE + "/messages"))
            .header("Authorization", "Bot " + TOKEN)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body.toString()))
            .build();

        var res = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
        return new JSONObject(res.body());
    }
}`,
  },

  /*── WEBSOCKET CONNECTION ─────────────────────────────────*/
  wsConnect: {
    js: `const { io } = require('socket.io-client');

const socket = io('https://gateway.alfychat.app', {
  auth: { token: process.env.BOT_TOKEN, type: 'bot' },
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

socket.on('connect',    () => console.log('✅ Connecté au Gateway'));
socket.on('disconnect', () => console.log('❌ Déconnecté'));
socket.on('connect_error', (err) => console.error('Erreur :', err.message));`,
    ts: `import { io, Socket } from 'socket.io-client';

const socket: Socket = io('https://gateway.alfychat.app', {
  auth: { token: process.env.BOT_TOKEN!, type: 'bot' },
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

socket.on('connect',       () => console.log('✅ Connecté au Gateway'));
socket.on('disconnect',    () => console.log('❌ Déconnecté'));
socket.on('connect_error', (err: Error) => console.error('Erreur :', err.message));`,
    python: `import os, asyncio, socketio

sio = socketio.AsyncClient(reconnection=True, reconnection_attempts=10)

@sio.event
async def connect():
    print('✅ Connecté au Gateway')

@sio.event
async def disconnect():
    print('❌ Déconnecté')

async def main():
    await sio.connect(
        'https://gateway.alfychat.app',
        auth={'token': os.environ['BOT_TOKEN'], 'type': 'bot'},
        transports=['websocket'],
    )
    await sio.wait()

asyncio.run(main())`,
    java: `import io.socket.client.*;
import java.net.URI;
import java.util.Map;

public class GatewayConnection {
    public static void main(String[] args) throws Exception {
        IO.Options opts = IO.Options.builder()
            .setReconnection(true)
            .setReconnectionAttempts(10)
            .setReconnectionDelay(1000)
            .setAuth(Map.of(
                "token", System.getenv("BOT_TOKEN"),
                "type",  "bot"
            ))
            .build();

        Socket socket = IO.socket(
            URI.create("https://gateway.alfychat.app"), opts);

        socket.on(Socket.EVENT_CONNECT,
            a -> System.out.println("✅ Connecté au Gateway"));

        socket.on(Socket.EVENT_DISCONNECT,
            a -> System.out.println("❌ Déconnecté"));

        socket.connect();
        Thread.sleep(Long.MAX_VALUE);
    }
}`,
  },

  /*── COMMANDES ────────────────────────────────────────────*/
  commandHandler: {
    js: `class CommandHandler {
  constructor(prefix = '!') {
    this.prefix = prefix;
    this.commands = new Map();
  }

  register(name, handler, { cooldown = 0 } = {}) {
    this.commands.set(name, { handler, cooldown, cooldowns: new Map() });
  }

  async handle(message) {
    if (!message.content.startsWith(this.prefix)) return;
    const [name, ...args] = message.content.slice(this.prefix.length).split(' ');
    const cmd = this.commands.get(name.toLowerCase());
    if (!cmd) return;

    const now  = Date.now();
    const last = cmd.cooldowns.get(message.authorId) || 0;
    if (now - last < cmd.cooldown * 1000) return; // encore en cooldown
    cmd.cooldowns.set(message.authorId, now);

    await cmd.handler(message, args);
  }
}

// --- Utilisation ---
const handler = new CommandHandler('!');

handler.register('ping', async (msg) => {
  await sendMessage(msg.channelId, '🏓 Pong !');
}, { cooldown: 5 });

handler.register('aide', async (msg) => {
  const cmds = [...handler.commands.keys()].join(', ');
  await sendMessage(msg.channelId, \`📖 Commandes : \${cmds}\`);
});

socket.on('NEW_MESSAGE', (msg) => handler.handle(msg));`,
    ts: `interface Message {
  id: string;
  content: string;
  channelId: string;
  authorId: string;
}

type Handler = (msg: Message, args: string[]) => Promise<void>;

interface Command {
  handler: Handler;
  cooldown: number;
  cooldowns: Map<string, number>;
}

class CommandHandler {
  private commands = new Map<string, Command>();
  constructor(private prefix = '!') {}

  register(name: string, handler: Handler, opts: { cooldown?: number } = {}) {
    this.commands.set(name, {
      handler,
      cooldown: opts.cooldown ?? 0,
      cooldowns: new Map(),
    });
  }

  async handle(message: Message) {
    if (!message.content.startsWith(this.prefix)) return;
    const [name, ...args] = message.content.slice(this.prefix.length).split(' ');
    const cmd = this.commands.get(name.toLowerCase());
    if (!cmd) return;

    const now  = Date.now();
    const last = cmd.cooldowns.get(message.authorId) ?? 0;
    if (now - last < cmd.cooldown * 1000) return;
    cmd.cooldowns.set(message.authorId, now);

    await cmd.handler(message, args);
  }
}

const handler = new CommandHandler('!');

handler.register('ping', async (msg) => {
  await sendMessage(msg.channelId, '🏓 Pong !');
}, { cooldown: 5 });

socket.on('NEW_MESSAGE', (msg: Message) => handler.handle(msg));`,
    python: `import time, functools

class CommandHandler:
    def __init__(self, prefix='!'):
        self.prefix = prefix
        self.commands: dict = {}

    def register(self, name, cooldown=0):
        def decorator(fn):
            self.commands[name] = {
                'handler': fn,
                'cooldown': cooldown,
                'cooldowns': {},
            }
            return fn
        return decorator

    async def handle(self, message):
        if not message['content'].startswith(self.prefix):
            return
        parts = message['content'][len(self.prefix):].split(' ')
        name, args = parts[0].lower(), parts[1:]
        cmd = self.commands.get(name)
        if not cmd:
            return
        now  = time.time()
        last = cmd['cooldowns'].get(message['authorId'], 0)
        if now - last < cmd['cooldown']:
            return
        cmd['cooldowns'][message['authorId']] = now
        await cmd['handler'](message, args)

handler = CommandHandler('!')

@handler.register('ping', cooldown=5)
async def ping(msg, args):
    await send_message(msg['channelId'], '🏓 Pong !')

@handler.register('aide')
async def aide(msg, args):
    cmds = ', '.join(handler.commands.keys())
    await send_message(msg['channelId'], f'📖 Commandes : {cmds}')

@sio.on('NEW_MESSAGE')
async def on_message(data):
    await handler.handle(data)`,
    java: `import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.BiConsumer;

public class CommandHandler {
    private final String prefix;
    private final Map<String, Command> commands = new HashMap<>();

    record Command(BiConsumer<JSONObject, List<String>> handler,
                   int cooldown,
                   ConcurrentHashMap<String, Long> cooldowns) {}

    public CommandHandler(String prefix) { this.prefix = prefix; }

    public void register(String name, int cooldown,
                         BiConsumer<JSONObject, List<String>> handler) {
        commands.put(name, new Command(handler, cooldown, new ConcurrentHashMap<>()));
    }

    public void handle(JSONObject msg) throws Exception {
        String content = msg.getString("content");
        if (!content.startsWith(prefix)) return;
        String[] parts = content.substring(prefix.length()).split(" ");
        String name   = parts[0].toLowerCase();
        var args = List.of(Arrays.copyOfRange(parts, 1, parts.length));
        Command cmd = commands.get(name);
        if (cmd == null) return;
        String uid = msg.getString("authorId");
        long now = System.currentTimeMillis();
        long last = cmd.cooldowns().getOrDefault(uid, 0L);
        if (now - last < cmd.cooldown() * 1000L) return;
        cmd.cooldowns().put(uid, now);
        cmd.handler().accept(msg, args);
    }

    // Enregistrement
    // handler.register("ping", 5, (msg, args) -> sendMessage(...));
}`,
  },

  /*── ERROR HANDLING ───────────────────────────────────────*/
  errorHandling: {
    js: `async function apiCall(path, options = {}) {
  const res = await fetch(\`https://gateway.alfychat.app/api\${path}\`, {
    headers: { 'Authorization': \`Bot \${process.env.BOT_TOKEN}\` },
    ...options,
  });

  if (res.status === 429) {
    const { retryAfter } = await res.json();
    console.warn(\`Rate limit atteint, retry dans \${retryAfter}s\`);
    await new Promise(r => setTimeout(r, retryAfter * 1000));
    return apiCall(path, options); // retry
  }

  if (!res.ok) {
    const err = await res.json();
    throw new Error(\`API Error \${res.status}: \${err.error}\`);
  }

  return res.json();
}`,
    ts: `interface ApiError {
  error: string;
  details?: { field: string; message: string }[];
  retryAfter?: number;
}

async function apiCall<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(\`https://gateway.alfychat.app/api\${path}\`, {
    headers: { 'Authorization': \`Bot \${process.env.BOT_TOKEN}\` },
    ...options,
  });

  if (res.status === 429) {
    const { retryAfter }: ApiError = await res.json();
    console.warn(\`Rate limit — retry dans \${retryAfter}s\`);
    await new Promise(r => setTimeout(r, (retryAfter ?? 30) * 1000));
    return apiCall<T>(path, options);
  }

  if (!res.ok) {
    const err: ApiError = await res.json();
    throw new Error(\`API \${res.status}: \${err.error}\`);
  }

  return res.json();
}`,
    python: `import asyncio, aiohttp, os

async def api_call(path: str, method='GET', **kwargs) -> dict:
    headers = {'Authorization': f"Bot {os.environ['BOT_TOKEN']}"}
    async with aiohttp.ClientSession() as session:
        async with session.request(
            method,
            f'https://gateway.alfychat.app/api{path}',
            headers=headers,
            **kwargs,
        ) as res:
            if res.status == 429:
                data = await res.json()
                retry = data.get('retryAfter', 30)
                print(f'Rate limit — retry dans {retry}s')
                await asyncio.sleep(retry)
                return await api_call(path, method, **kwargs)

            if not res.ok:
                data = await res.json()
                raise Exception(f"API {res.status}: {data.get('error')}")

            return await res.json()`,
    java: `import java.net.URI;
import java.net.http.*;
import java.time.Duration;

public class ApiClient {
    private static final HttpClient HTTP = HttpClient.newHttpClient();
    private static final String BASE = "https://gateway.alfychat.app/api";
    private static final String TOKEN = System.getenv("BOT_TOKEN");

    public static String call(String path, String method, String body) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
            .uri(URI.create(BASE + path))
            .header("Authorization", "Bot " + TOKEN)
            .header("Content-Type", "application/json");

        if ("POST".equals(method)) {
            builder.POST(HttpRequest.BodyPublishers.ofString(body));
        } else {
            builder.GET();
        }

        HttpResponse<String> res = HTTP.send(builder.build(),
            HttpResponse.BodyHandlers.ofString());

        if (res.statusCode() == 429) {
            // Extraire retryAfter du body JSON et attendre
            Thread.sleep(30_000);
            return call(path, method, body);
        }
        if (res.statusCode() >= 400) {
            throw new RuntimeException("API " + res.statusCode() + ": " + res.body());
        }
        return res.body();
    }
}`,
  },
};

/* ═══════════════════════════════════════════════════════════ */
/*  Sections de documentation                                 */
/* ═══════════════════════════════════════════════════════════ */

function IntroductionSection() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={BookOpenIcon}
        title="Introduction"
        description="Bienvenue dans la documentation de l'API Bot AlfyChat."
        badge="v2"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <InfoCard color="blue" title="API REST">
          CRUD complet via HTTP avec authentification par token Bearer.
        </InfoCard>
        <InfoCard color="green" title="WebSocket">
          Événements temps réel (Socket.io) — messages, présence, membres de serveur.
        </InfoCard>
        <InfoCard color="violet" title="Bots publics">
          Publiez votre bot dans le répertoire public et demandez la certification.
        </InfoCard>
      </div>

      <Card className="border border-border/60 bg-surface/40">
        <Card.Content className="p-5">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-accent/10">
                <GlobeIcon size={16} className="text-accent" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted">Base URL</p>
                <code className="font-mono text-sm font-bold text-accent">
                  https://gateway.alfychat.app
                </code>
              </div>
            </div>
            <Separator orientation="vertical" className="hidden h-8 sm:block" />
            <div>
              <p className="text-[11px] font-semibold text-muted">Préfixe routes bot</p>
              <code className="font-mono text-sm font-bold">/api/bots</code>
            </div>
            <Separator orientation="vertical" className="hidden h-8 sm:block" />
            <div>
              <p className="text-[11px] font-semibold text-muted">Content-Type</p>
              <code className="font-mono text-sm font-bold">application/json</code>
            </div>
          </div>
        </Card.Content>
      </Card>

      <div className="space-y-2">
        <SectionTitle>Capacités d&apos;un bot</SectionTitle>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            'Envoyer & modifier des messages',
            'Réagir aux commandes en temps réel',
            'Écouter les événements serveur',
            'Gérer un système de commandes',
            'Interagir avec les membres',
            'Demander la certification publique',
          ].map((cap) => (
            <div key={cap} className="flex items-center gap-2 rounded-lg border border-border/40 bg-surface/30 px-3 py-2.5 text-sm">
              <span className="size-1.5 shrink-0 rounded-full bg-accent" />
              {cap}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <SectionTitle>Format des réponses</SectionTitle>
        <CodeBlock
          lang="json"
          title="Structure standard"
          code={`// Succès
{
  "success": true,
  "data": { ... }      // ou "bot", "command", etc.
}

// Erreur
{
  "error": "Description de l'erreur",
  "details": [         // optionnel — validation errors
    { "field": "name", "message": "Requis (2–32 caractères)" }
  ]
}`}
        />
      </div>
    </div>
  );
}

function AuthSection() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={KeyIcon}
        title="Authentification"
        description="Chaque bot dispose d'un token unique à inclure dans chaque requête."
      />

      <InfoCard color="red" title="⚠️  Sécurité">
        <ul className="list-disc space-y-0.5 pl-4">
          <li>Ne commitez jamais le token dans un dépôt public</li>
          <li>Stockez-le dans une variable d&apos;environnement (<code>.env</code>)</li>
          <li>En cas de compromission, régénérez-le depuis le dashboard</li>
        </ul>
      </InfoCard>

      <CodeBlock
        lang="http"
        title="Header d'authentification"
        code={`Authorization: Bot VOTRE_TOKEN_ICI`}
      />

      <SectionTitle>Exemple d&apos;authentification</SectionTitle>
      <MultiCodeBlock
        title="Vérifier le token / authentifier le bot"
        examples={EX.authRequest}
      />

      <CodeBlock
        lang="json"
        title="Réponse — POST /api/bots/authenticate"
        code={`// 200 OK
{
  "success": true,
  "bot": {
    "id": "a1b2c3d4-...",
    "name": "MonBot",
    "status": "offline",
    "isVerified": false,
    "prefix": "!",
    "serverCount": 0
  }
}

// 401 Unauthorized
{ "error": "Token de bot invalide" }`}
      />

      <SectionTitle>Envoyer un message</SectionTitle>
      <MultiCodeBlock
        title="POST /api/messages"
        examples={EX.sendMessage}
      />
    </div>
  );
}

function QuickstartSection() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={ZapIcon}
        title="Démarrage rapide"
        description="Créez votre premier bot fonctionnel en 4 étapes."
      />

      <div className="space-y-6">
        {/* Step 1 */}
        <div className="flex gap-4">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">1</div>
          <div className="flex-1 space-y-2">
            <h4 className="text-sm font-semibold">Créer un bot dans le dashboard</h4>
            <p className="text-xs text-muted">
              Rendez-vous sur l&apos;onglet <strong>Mes Bots</strong>, cliquez sur{' '}
              <strong>Créer un bot</strong>, renseignez le nom et validez. Copiez ensuite
              le token affiché (il n&apos;est visible qu&apos;une seule fois).
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex gap-4">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">2</div>
          <div className="flex-1 space-y-2">
            <h4 className="text-sm font-semibold">Installer les dépendances</h4>
            <MultiCodeBlock title="" examples={EX.install} />
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex gap-4">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">3</div>
          <div className="flex-1 space-y-2">
            <h4 className="text-sm font-semibold">Créer le fichier principal</h4>
            <MultiCodeBlock
              title="bot.js / bot.ts / bot.py / AlfyBot.java"
              examples={EX.botMain}
            />
          </div>
        </div>

        {/* Step 4 */}
        <div className="flex gap-4">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">4</div>
          <div className="flex-1 space-y-2">
            <h4 className="text-sm font-semibold">Configurer l&apos;environnement et lancer</h4>
            <CodeBlock
              lang="bash"
              code={`# Créer le fichier .env
echo "BOT_TOKEN=votre_token_ici" > .env

# JavaScript / TypeScript
node bot.js     # ou: npx ts-node bot.ts

# Python
python bot.py

# Java (après compilation)
javac -cp ".;socket.io-client.jar:json.jar" AlfyBot.java
java  -cp ".;socket.io-client.jar:json.jar" AlfyBot`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function EndpointsSection() {
  return (
    <div className="space-y-8">
      <PageHeader
        icon={CodeIcon}
        title="Référence API"
        description="Liste complète des endpoints REST disponibles pour les bots."
      />

      {[
        {
          title: 'Gestion du bot',
          color: 'text-blue-400',
          routes: [
            { method: 'POST'   as const, path: '/api/bots',                          desc: 'Créer un bot' },
            { method: 'GET'    as const, path: '/api/bots/me',                       desc: 'Lister vos bots' },
            { method: 'GET'    as const, path: '/api/bots/public',                   desc: 'Bots publics (?search=&tag=)' },
            { method: 'GET'    as const, path: '/api/bots/:id',                      desc: "Détails d'un bot" },
            { method: 'PATCH'  as const, path: '/api/bots/:id',                      desc: 'Mettre à jour un bot' },
            { method: 'DELETE' as const, path: '/api/bots/:id',                      desc: 'Supprimer un bot' },
            { method: 'POST'   as const, path: '/api/bots/:id/regenerate-token',     desc: 'Régénérer le token' },
            { method: 'PATCH'  as const, path: '/api/bots/:id/status',               desc: 'Changer le statut (online/offline/maintenance)' },
            { method: 'POST'   as const, path: '/api/bots/authenticate',             desc: 'Authentifier le bot' },
          ],
        },
        {
          title: 'Commandes',
          color: 'text-violet-400',
          routes: [
            { method: 'GET'    as const, path: '/api/bots/:id/commands',             desc: 'Lister les commandes' },
            { method: 'POST'   as const, path: '/api/bots/:id/commands',             desc: 'Créer une commande' },
            { method: 'PATCH'  as const, path: '/api/bots/:id/commands/:cmdId',      desc: 'Modifier une commande' },
            { method: 'DELETE' as const, path: '/api/bots/:id/commands/:cmdId',      desc: 'Supprimer une commande' },
          ],
        },
        {
          title: 'Serveurs',
          color: 'text-emerald-400',
          routes: [
            { method: 'POST'   as const, path: '/api/bots/:id/servers',              desc: 'Ajouter dans un serveur' },
            { method: 'DELETE' as const, path: '/api/bots/:id/servers/:serverId',    desc: "Retirer d'un serveur" },
            { method: 'GET'    as const, path: '/api/bots/servers/:serverId',        desc: "Bots d'un serveur" },
          ],
        },
        {
          title: 'Certification',
          color: 'text-amber-400',
          routes: [
            { method: 'POST'   as const, path: '/api/bots/:id/certification',        desc: 'Demander la certification' },
            { method: 'GET'    as const, path: '/api/bots/certification/pending',    desc: 'Demandes en attente (admin)' },
            { method: 'POST'   as const, path: '/api/bots/certification/:requestId/review', desc: 'Approuver/refuser (admin)' },
          ],
        },
        {
          title: 'Messages',
          color: 'text-pink-400',
          routes: [
            { method: 'POST'   as const, path: '/api/messages',                      desc: 'Envoyer un message' },
            { method: 'PATCH'  as const, path: '/api/messages/:id',                  desc: 'Modifier un message' },
            { method: 'DELETE' as const, path: '/api/messages/:id',                  desc: 'Supprimer un message' },
          ],
        },
      ].map((group) => (
        <div key={group.title}>
          <h3 className={cn('mb-3 text-sm font-bold', group.color)}>{group.title}</h3>
          <div className="space-y-1.5">
            {group.routes.map((r) => (
              <EndpointRow key={r.method + r.path} {...r} />
            ))}
          </div>
        </div>
      ))}

      <div className="space-y-4">
        <SectionTitle>Exemples CRUD</SectionTitle>
        <Accordion>
          <Accordion.Item id="create">
            <Accordion.Heading>
              <Accordion.Trigger>Créer un bot — POST /api/bots</Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="space-y-3">
                <MultiCodeBlock
                  title="Requête"
                  examples={{
                    js: `const res = await fetch(BASE + '/api/bots', {\n  method: 'POST',\n  headers: { 'Authorization': \`Bot \${TOKEN}\`, 'Content-Type': 'application/json' },\n  body: JSON.stringify({\n    name: 'MonBot',            // 2–32 caractères\n    description: 'Un super bot',\n    prefix: '!',\n  }),\n});\nconst { bot } = await res.json();\nconsole.log('Token :', bot.token); // Affiché une seule fois !`,
                    ts: `const res = await fetch(BASE + '/api/bots', {\n  method: 'POST',\n  headers: { 'Authorization': \`Bot \${TOKEN}\`, 'Content-Type': 'application/json' },\n  body: JSON.stringify({\n    name: 'MonBot',\n    description: 'Un super bot',\n    prefix: '!',\n  }),\n});\nconst { bot } = await res.json() as { bot: Bot & { token: string } };\nconsole.log('Token :', bot.token);`,
                    python: `res = requests.post(\n    f'{BASE}/api/bots',\n    headers={'Authorization': f'Bot {TOKEN}'},\n    json={'name': 'MonBot', 'description': 'Un super bot', 'prefix': '!'},\n)\nbot = res.json()['bot']\nprint(f"Token : {bot['token']}")`,
                    java: `JSONObject body = new JSONObject()\n    .put("name", "MonBot")\n    .put("description", "Un super bot")\n    .put("prefix", "!");\n\nHttpRequest req = HttpRequest.newBuilder()\n    .uri(URI.create(BASE + "/api/bots"))\n    .header("Authorization", "Bot " + TOKEN)\n    .header("Content-Type", "application/json")\n    .POST(HttpRequest.BodyPublishers.ofString(body.toString()))\n    .build();\n\nHttpResponse<String> res = HTTP.send(req, HttpResponse.BodyHandlers.ofString());\nJSONObject bot = new JSONObject(res.body()).getJSONObject("bot");\nSystem.out.println("Token : " + bot.getString("token"));`,
                  }}
                />
                <CodeBlock lang="json" title="Réponse (201)" code={`{\n  "success": true,\n  "bot": {\n    "id": "uuid...",\n    "name": "MonBot",\n    "token": "abc123...",  // ⚠️ UNE seule fois\n    "prefix": "!",\n    "status": "offline",\n    "isPublic": false\n  }\n}`} />
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item id="update">
            <Accordion.Heading>
              <Accordion.Trigger>Modifier un bot — PATCH /api/bots/:id</Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body>
                <MultiCodeBlock
                  title="Requête"
                  examples={{
                    js: `await fetch(\`\${BASE}/api/bots/\${botId}\`, {\n  method: 'PATCH',\n  headers: { 'Authorization': \`Bot \${TOKEN}\`, 'Content-Type': 'application/json' },\n  body: JSON.stringify({\n    name: 'NouveauNom',\n    description: 'Nouvelle description',\n    prefix: '!!',\n    isPublic: true,\n    tags: ['Modération', 'Fun'],\n  }),\n});`,
                    ts: `await fetch(\`\${BASE}/api/bots/\${botId}\`, {\n  method: 'PATCH',\n  headers: { 'Authorization': \`Bot \${TOKEN}\`, 'Content-Type': 'application/json' },\n  body: JSON.stringify({\n    name: 'NouveauNom',\n    isPublic: true,\n    tags: ['Modération', 'Fun'] as string[],\n  }),\n});`,
                    python: `requests.patch(\n    f'{BASE}/api/bots/{bot_id}',\n    headers={'Authorization': f'Bot {TOKEN}'},\n    json={'name': 'NouveauNom', 'isPublic': True, 'tags': ['Modération', 'Fun']},\n)`,
                    java: `JSONObject body = new JSONObject()\n    .put("name", "NouveauNom")\n    .put("isPublic", true)\n    .put("tags", new JSONArray(List.of("Modération", "Fun")));\n\nHttpRequest req = HttpRequest.newBuilder()\n    .uri(URI.create(BASE + "/api/bots/" + botId))\n    .header("Authorization", "Bot " + TOKEN)\n    .header("Content-Type", "application/json")\n    .method("PATCH", HttpRequest.BodyPublishers.ofString(body.toString()))\n    .build();\nHTTP.send(req, HttpResponse.BodyHandlers.ofString());`,
                  }}
                />
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </div>
    </div>
  );
}

function WebSocketSection() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={ServerIcon}
        title="WebSocket & Temps réel"
        description="Connectez votre bot au Gateway Socket.io pour recevoir des événements en temps réel."
      />

      <SectionTitle>Connexion au Gateway</SectionTitle>
      <MultiCodeBlock title="Initialiser la connexion WebSocket" examples={EX.wsConnect} />

      <div className="space-y-2">
        <SectionTitle>Événements disponibles</SectionTitle>
        <div className="overflow-hidden rounded-xl border border-border/60">
          <div className="grid grid-cols-3 border-b border-border/60 bg-surface/60 px-4 py-2 text-[10px] font-bold uppercase text-muted/60">
            <span>Événement</span>
            <span>Description</span>
            <span>Payload principal</span>
          </div>
          {[
            { event: 'NEW_MESSAGE',      desc: 'Nouveau message',          payload: 'id, content, authorId, channelId' },
            { event: 'MESSAGE_UPDATED',  desc: 'Message modifié',          payload: 'id, content, channelId' },
            { event: 'MESSAGE_DELETED',  desc: 'Message supprimé',         payload: 'id, channelId' },
            { event: 'TYPING_INDICATOR', desc: "Frappe en cours",          payload: 'userId, channelId, isTyping' },
            { event: 'PRESENCE_UPDATE',  desc: 'Statut de présence',       payload: 'userId, status, isOnline' },
            { event: 'MEMBER_JOINED',    desc: 'Nouveau membre serveur',   payload: 'serverId, userId, username' },
            { event: 'MEMBER_LEFT',      desc: 'Membre quitté',            payload: 'serverId, userId' },
            { event: 'BOT_ADDED',        desc: 'Bot ajouté à un serveur',  payload: 'botId, serverId' },
          ].map((e, i) => (
            <div key={e.event} className={cn('grid grid-cols-3 px-4 py-2.5', i % 2 === 0 ? 'bg-background/20' : 'bg-surface/20')}>
              <code className="text-[11px] font-semibold text-emerald-400">{e.event}</code>
              <span className="text-[11px] text-muted">{e.desc}</span>
              <code className="text-[10px] text-muted/60">{e.payload}</code>
            </div>
          ))}
        </div>
      </div>

      <SectionTitle>Écouter les messages et répondre</SectionTitle>
      <MultiCodeBlock
        title="Écouter NEW_MESSAGE et répondre"
        examples={{
          js: `socket.on('NEW_MESSAGE', async (msg) => {\n  // Ignorer les messages du bot lui-même\n  if (msg.authorType === 'bot') return;\n\n  if (msg.content === '!info') {\n    await sendMessage(msg.channelId, [\n      '🤖 **MonBot v1.0**',\n      'Préfixe : !',\n      'Serveurs : ' + serverCount,\n    ].join('\\n'));\n  }\n});\n\nsocket.on('MEMBER_JOINED', async ({ serverId, username }) => {\n  const welcomeChannel = getWelcomeChannel(serverId);\n  if (welcomeChannel) {\n    await sendMessage(welcomeChannel, \`👋 Bienvenue, **\${username}** !\`);\n  }\n});`,
          ts: `socket.on('NEW_MESSAGE', async (msg: Message) => {\n  if (msg.authorType === 'bot') return;\n\n  if (msg.content === '!info') {\n    await sendMessage(msg.channelId, '🤖 MonBot v1.0');\n  }\n});\n\nsocket.on('MEMBER_JOINED', async (data: { serverId: string; username: string }) => {\n  const ch = getWelcomeChannel(data.serverId);\n  if (ch) await sendMessage(ch, \`👋 Bienvenue, **\${data.username}** !\`);\n});`,
          python: `@sio.on('NEW_MESSAGE')\nasync def on_message(data):\n    if data.get('authorType') == 'bot':\n        return\n    if data['content'] == '!info':\n        await send_message(data['channelId'], '🤖 MonBot v1.0')\n\n@sio.on('MEMBER_JOINED')\nasync def on_joined(data):\n    ch = get_welcome_channel(data['serverId'])\n    if ch:\n        await send_message(ch, f"👋 Bienvenue, **{data['username']}** !")`,
          java: `socket.on("NEW_MESSAGE", args -> {\n    JSONObject msg = (JSONObject) args[0];\n    if ("bot".equals(msg.optString("authorType"))) return;\n    try {\n        if ("!info".equals(msg.getString("content"))) {\n            sendMessage(msg.getString("channelId"), "🤖 MonBot v1.0");\n        }\n    } catch (Exception e) { e.printStackTrace(); }\n});\n\nsocket.on("MEMBER_JOINED", args -> {\n    JSONObject data = (JSONObject) args[0];\n    String ch = getWelcomeChannel(data.optString("serverId"));\n    if (ch != null) {\n        try { sendMessage(ch, "👋 Bienvenue, **" + data.getString("username") + "** !"); }\n        catch (Exception e) { e.printStackTrace(); }\n    }\n});`,
        }}
      />
    </div>
  );
}

function CommandsSection() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={TerminalIcon}
        title="Système de commandes"
        description="Gérez les commandes de votre bot avec un système flexible et extensible."
      />

      <InfoCard color="blue" title="ℹ️  Bonne pratique">
        Enregistrez vos commandes via l&apos;API (<code>POST /api/bots/:id/commands</code>) pour
        qu&apos;elles apparaissent dans le profil public de votre bot. Le handler local reste
        responsable de l&apos;exécution.
      </InfoCard>

      <SectionTitle>Handler de commandes</SectionTitle>
      <MultiCodeBlock title="Gestionnaire de commandes avec cooldown" examples={EX.commandHandler} />

      <SectionTitle>Enregistrer les commandes via l&apos;API</SectionTitle>
      <MultiCodeBlock
        title="POST /api/bots/:id/commands"
        examples={{
          js: `const commands = [\n  { name: 'ping',  description: 'Vérifie la latence',       usage: '!ping',         cooldown: 5 },\n  { name: 'aide',  description: 'Affiche les commandes',   usage: '!aide',         cooldown: 10 },\n  { name: 'ban',   description: 'Bannit un utilisateur',  usage: '!ban @user',    cooldown: 0 },\n];\n\nfor (const cmd of commands) {\n  await fetch(\`\${BASE}/api/bots/\${BOT_ID}/commands\`, {\n    method: 'POST',\n    headers: { 'Authorization': \`Bot \${TOKEN}\`, 'Content-Type': 'application/json' },\n    body: JSON.stringify(cmd),\n  });\n}`,
          ts: `interface CommandDef {\n  name: string;\n  description: string;\n  usage: string;\n  cooldown?: number;\n}\n\nconst commands: CommandDef[] = [\n  { name: 'ping', description: 'Vérifie la latence', usage: '!ping', cooldown: 5 },\n  { name: 'aide', description: 'Affiche les commandes', usage: '!aide' },\n];\n\nfor (const cmd of commands) {\n  await fetch(\`\${BASE}/api/bots/\${BOT_ID}/commands\`, {\n    method: 'POST',\n    headers: { 'Authorization': \`Bot \${TOKEN}\`, 'Content-Type': 'application/json' },\n    body: JSON.stringify(cmd),\n  });\n}`,
          python: `commands = [\n    {'name': 'ping',  'description': 'Vérifie la latence',     'usage': '!ping',   'cooldown': 5},\n    {'name': 'aide',  'description': 'Affiche les commandes',  'usage': '!aide',   'cooldown': 10},\n]\n\nfor cmd in commands:\n    requests.post(\n        f'{BASE}/api/bots/{BOT_ID}/commands',\n        headers={'Authorization': f'Bot {TOKEN}'},\n        json=cmd,\n    )`,
          java: `String[] names = {"ping", "aide"};\nString[] descs = {"Vérifie la latence", "Affiche les commandes"};\nString[] usages = {"!ping", "!aide"};\n\nfor (int i = 0; i < names.length; i++) {\n    JSONObject cmd = new JSONObject()\n        .put("name", names[i])\n        .put("description", descs[i])\n        .put("usage", usages[i])\n        .put("cooldown", 5);\n\n    HttpRequest req = HttpRequest.newBuilder()\n        .uri(URI.create(BASE + "/api/bots/" + BOT_ID + "/commands"))\n        .header("Authorization", "Bot " + TOKEN)\n        .header("Content-Type", "application/json")\n        .POST(HttpRequest.BodyPublishers.ofString(cmd.toString()))\n        .build();\n    HTTP.send(req, HttpResponse.BodyHandlers.ofString());\n}`,
        }}
      />
    </div>
  );
}

function CertificationSection() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={ShieldCheckIcon}
        title="Certification"
        description="Obtenez le badge vérifié pour votre bot et gagnez en visibilité."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="border border-border/60 bg-surface/40">
          <Card.Header>
            <Card.Title className="text-sm">Critères requis</Card.Title>
          </Card.Header>
          <Card.Content>
            <ul className="space-y-1.5 text-[12px] text-muted">
              {['Bot fonctionnel et stable','Description claire','Politique de confidentialité','Contenu conforme aux CGU','Au moins 1 serveur actif','Commandes documentées'].map((c) => (
                <li key={c} className="flex items-center gap-2">
                  <span className="size-1 shrink-0 rounded-full bg-emerald-400" />
                  {c}
                </li>
              ))}
            </ul>
          </Card.Content>
        </Card>
        <Card className="border border-accent-soft-hover bg-accent/5">
          <Card.Header>
            <Card.Title className="text-sm text-accent">Avantages</Card.Title>
          </Card.Header>
          <Card.Content>
            <ul className="space-y-1.5 text-[12px] text-muted">
              {['Badge ✓ visible partout','Priorité dans la recherche','Badge "Verified Dev" sur votre profil','Fonctionnalités avancées','Support prioritaire'].map((a) => (
                <li key={a} className="flex items-center gap-2">
                  <span className="size-1 shrink-0 rounded-full bg-accent" />
                  {a}
                </li>
              ))}
            </ul>
          </Card.Content>
        </Card>
      </div>

      <SectionTitle>Demander la certification</SectionTitle>
      <MultiCodeBlock
        title="POST /api/bots/:id/certification"
        examples={{
          js: `const res = await fetch(\`\${BASE}/api/bots/\${BOT_ID}/certification\`, {\n  method: 'POST',\n  headers: { 'Authorization': \`Bot \${TOKEN}\`, 'Content-Type': 'application/json' },\n  body: JSON.stringify({\n    reason: 'MonBot est utilisé par 50+ serveurs. Il propose la modération automatique et les logs.'\n           + ' Politique de confidentialité : https://monbot.fr/privacy',\n  }),\n});\nconst data = await res.json();\nconsole.log('Demande soumise :', data.requestId);`,
          ts: `const res = await fetch(\`\${BASE}/api/bots/\${BOT_ID}/certification\`, {\n  method: 'POST',\n  headers: { 'Authorization': \`Bot \${TOKEN}\`, 'Content-Type': 'application/json' },\n  body: JSON.stringify({ reason: 'Description de la demande...' }),\n});\nconst data = await res.json() as { success: boolean; requestId: string };\nconsole.log('Request ID :', data.requestId);`,
          python: `res = requests.post(\n    f'{BASE}/api/bots/{BOT_ID}/certification',\n    headers={'Authorization': f'Bot {TOKEN}'},\n    json={'reason': 'MonBot est utilisé par 50+ serveurs. Politique : https://monbot.fr/privacy'},\n)\nprint(f"Demande soumise : {res.json()['requestId']}")`,
          java: `JSONObject body = new JSONObject()\n    .put("reason", "MonBot est utilisé par 50+ serveurs. Politique : https://monbot.fr/privacy");\n\nHttpRequest req = HttpRequest.newBuilder()\n    .uri(URI.create(BASE + "/api/bots/" + BOT_ID + "/certification"))\n    .header("Authorization", "Bot " + TOKEN)\n    .header("Content-Type", "application/json")\n    .POST(HttpRequest.BodyPublishers.ofString(body.toString()))\n    .build();\n\nHttpResponse<String> res = HTTP.send(req, HttpResponse.BodyHandlers.ofString());\nJSONObject data = new JSONObject(res.body());\nSystem.out.println("Demande soumise : " + data.getString("requestId"));`,
        }}
      />
    </div>
  );
}

function ErrorsSection() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={TagIcon}
        title="Erreurs & Rate Limits"
        description="Référence des codes d'erreur et stratégies de gestion."
      />

      <div className="overflow-hidden rounded-xl border border-border/60">
        <div className="border-b border-border/60 bg-surface/60 px-4 py-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted/60">Codes HTTP</span>
        </div>
        {[
          { code: 200, label: 'OK',                    desc: 'Requête réussie',               color: 'text-emerald-400' },
          { code: 201, label: 'Created',               desc: 'Ressource créée',               color: 'text-emerald-400' },
          { code: 400, label: 'Bad Request',           desc: 'Données invalides/manquantes',  color: 'text-amber-400'   },
          { code: 401, label: 'Unauthorized',          desc: 'Token invalide ou absenting',   color: 'text-red-400'     },
          { code: 403, label: 'Forbidden',             desc: 'Permissions insuffisantes',     color: 'text-red-400'     },
          { code: 404, label: 'Not Found',             desc: 'Ressource introuvable',         color: 'text-orange-400'  },
          { code: 429, label: 'Too Many Requests',     desc: 'Rate limit atteint',            color: 'text-red-400'     },
          { code: 500, label: 'Internal Server Error', desc: 'Erreur serveur',                color: 'text-red-400'     },
          { code: 502, label: 'Bad Gateway',           desc: 'Microservice indisponible',     color: 'text-red-400'     },
        ].map((e, i) => (
          <div key={e.code} className={cn('flex items-center gap-4 px-4 py-3', i % 2 === 0 ? 'bg-background/20' : 'bg-surface/20')}>
            <code className={cn('w-9 shrink-0 font-mono text-sm font-bold', e.color)}>{e.code}</code>
            <span className="w-28 shrink-0 text-[11px] font-semibold text-foreground/70">{e.label}</span>
            <span className="text-[11px] text-muted">{e.desc}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <SectionTitle>Rate limits</SectionTitle>
        <div className="overflow-hidden rounded-xl border border-border/60">
          {[
            { route: 'Global',                          limit: '100 req / 60s' },
            { route: 'POST /messages',                  limit: '5 msg / 5s par channel' },
            { route: 'PATCH /bots/:id',                 limit: '2 req / 10s' },
            { route: 'POST /bots/:id/regenerate-token', limit: '1 req / 60s' },
          ].map((r, i) => (
            <div key={r.route} className={cn('flex items-center justify-between px-4 py-2.5', i % 2 === 0 ? 'bg-background/20' : 'bg-surface/20')}>
              <code className="font-mono text-xs">{r.route}</code>
              <Chip size="sm" variant="soft" color="warning">
                <Chip.Label className="text-[10px]">{r.limit}</Chip.Label>
              </Chip>
            </div>
          ))}
        </div>
      </div>

      <SectionTitle>Gestion des erreurs</SectionTitle>
      <MultiCodeBlock title="Wrapper API avec retry sur rate limit" examples={EX.errorHandling} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  Map des sections                                          */
/* ═══════════════════════════════════════════════════════════ */

const SECTIONS = {
  introduction:  { title: 'Introduction',      icon: BookOpenIcon,    Component: IntroductionSection },
  auth:          { title: 'Authentification',   icon: KeyIcon,         Component: AuthSection },
  quickstart:    { title: 'Démarrage rapide',   icon: ZapIcon,         Component: QuickstartSection },
  endpoints:     { title: 'Référence API',      icon: CodeIcon,        Component: EndpointsSection },
  websocket:     { title: 'WebSocket',          icon: ServerIcon,      Component: WebSocketSection },
  commands:      { title: 'Commandes',          icon: TerminalIcon,    Component: CommandsSection },
  certification: { title: 'Certification',      icon: ShieldCheckIcon, Component: CertificationSection },
  errors:        { title: 'Erreurs & Limits',   icon: TagIcon,         Component: ErrorsSection },
} as const;

type SectionSlug = keyof typeof SECTIONS;
const SLUGS = Object.keys(SECTIONS) as SectionSlug[];

/* ═══════════════════════════════════════════════════════════ */
/*  Page dynamique                                            */
/* ═══════════════════════════════════════════════════════════ */

export default function DocSlugPage() {
  const params = useParams<{ slug: string }>();
  const slug   = params.slug as SectionSlug;

  const section = SECTIONS[slug];
  if (!section) return notFound();

  const idx      = SLUGS.indexOf(slug);
  const prevSlug = SLUGS[idx - 1];
  const nextSlug = SLUGS[idx + 1];

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <section.Component />

      {/* Navigation Précédent / Suivant */}
      <div className="mt-12 flex items-center justify-between border-t border-border/60 pt-6">
        {prevSlug ? (
          <Link
            href={`/developers/docs/${prevSlug}`}
            className="group flex items-center gap-2 rounded-xl border border-border/60 bg-surface/40 px-4 py-3 text-sm font-medium text-muted no-underline transition-all hover:border-accent/30 hover:bg-surface hover:text-foreground"
          >
            <ArrowLeftIcon size={14} className="transition-transform group-hover:-translate-x-0.5" />
            <span className="text-xs text-muted/60">Précédent</span>
            <span className="ml-1">{SECTIONS[prevSlug].title}</span>
          </Link>
        ) : <div />}

        {nextSlug ? (
          <Link
            href={`/developers/docs/${nextSlug}`}
            className="group flex items-center gap-2 rounded-xl border border-border/60 bg-surface/40 px-4 py-3 text-sm font-medium text-muted no-underline transition-all hover:border-accent/30 hover:bg-surface hover:text-foreground"
          >
            <span>{SECTIONS[nextSlug].title}</span>
            <span className="ml-1 text-xs text-muted/60">Suivant</span>
            <ArrowRightIcon size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        ) : <div />}
      </div>
    </div>
  );
}
