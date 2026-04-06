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
  BotIcon,
  PlusIcon,
  MessageCircleIcon,
  LockIcon,
  WifiIcon,
  AlertTriangleIcon,
  UserPlusIcon,
} from '@/components/icons';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useLang, LANGS, type Lang } from '../lang-context';

/* ═══════════════════════════════════════════════════════════ */
/*  Primitives partagées                                       */
/* ═══════════════════════════════════════════════════════════ */

function PageHeader({
  icon: Icon,
  title,
  description,
  badge,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <div className="mb-8 flex items-start gap-4">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent/10 ring-1 ring-accent-soft-hover">
        <Icon size={22} className="text-accent" />
      </div>
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {badge && (
            <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0">{badge}</Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
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
          <span className="font-mono text-[11px] text-muted-foreground">{title}</span>
          <div className="flex items-center gap-2">
            <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground/60">{lang}</span>
            <button
              onClick={copy}
              aria-label="Copier"
              className="flex size-6 items-center justify-center rounded hover:bg-surface"
            >
              {copied ? <CheckIcon size={12} className="text-green-400" /> : <CopyIcon size={12} className="text-muted-foreground" />}
            </button>
          </div>
        </div>
      )}
      <div className="overflow-auto">
        <pre className="bg-[#0d1117] p-4 text-[12px] leading-relaxed">
          <code className="whitespace-pre font-mono text-gray-300">{code}</code>
        </pre>
      </div>
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
        <p className="mt-0.5 text-[11px] text-muted-foreground">{desc}</p>
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

  /*── BOT CREATION ─────────────────────────────────────────*/
  botCreate: {
    js: `const res = await fetch('https://gateway.alfychat.app/api/bots', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + process.env.USER_JWT,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'MonBot',
    prefix: '!',
    description: 'Un bot utile pour ma communauté',
    isPublic: false,
  }),
});

const { bot } = await res.json();
console.log('Bot créé ! ID    :', bot.id);
console.log('Token (1 seule fois) :', bot.token);`,
    ts: `interface CreateBotPayload {
  name: string;         // 2–32 caractères
  prefix: string;       // 1–5 caractères
  description?: string; // max 200 caractères
  avatarUrl?: string;
  isPublic?: boolean;
}

const res = await fetch('https://gateway.alfychat.app/api/bots', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${process.env.USER_JWT}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'MonBot',
    prefix: '!',
    description: 'Un bot utile',
    isPublic: false,
  } satisfies CreateBotPayload),
});

const { bot } = await res.json();
console.log('Token :', bot.token);`,
    python: `import os, requests

res = requests.post(
    'https://gateway.alfychat.app/api/bots',
    headers={'Authorization': f"Bearer {os.environ['USER_JWT']}"},
    json={
        'name': 'MonBot',
        'prefix': '!',
        'description': 'Un bot utile',
        'isPublic': False,
    },
)

bot = res.json()['bot']
print(f"Bot créé ! ID={bot['id']} Token={bot['token']}")`,
    java: `String json = "{\\"name\\":\\"MonBot\\",\\"prefix\\":\\"!\\",\\"isPublic\\":false}";
HttpRequest req = HttpRequest.newBuilder()
    .uri(URI.create("https://gateway.alfychat.app/api/bots"))
    .header("Authorization", "Bearer " + System.getenv("USER_JWT"))
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(json))
    .build();
System.out.println(HttpClient.newHttpClient()
    .send(req, HttpResponse.BodyHandlers.ofString()).body());`,
  },

  /*── BOT PERMISSIONS ──────────────────────────────────────*/
  botPermissionsCheck: {
    js: `const PERMISSIONS = {
  SEND_MESSAGES:   1 << 0,  // 1
  READ_MESSAGES:   1 << 1,  // 2
  MANAGE_MESSAGES: 1 << 2,  // 4
  KICK_MEMBERS:    1 << 3,  // 8
  BAN_MEMBERS:     1 << 4,  // 16
  MANAGE_CHANNELS: 1 << 5,  // 32
  ADMINISTRATOR:   1 << 6,  // 64
};

function hasPermission(botPerms, permission) {
  return (botPerms & PERMISSIONS.ADMINISTRATOR) !== 0 ||
         (botPerms & permission) !== 0;
}

// Combiner des permissions
const readWrite = PERMISSIONS.SEND_MESSAGES | PERMISSIONS.READ_MESSAGES; // 3

if (hasPermission(readWrite, PERMISSIONS.SEND_MESSAGES)) {
  console.log('Le bot peut envoyer des messages');
}`,
    ts: `const PERMISSIONS = {
  SEND_MESSAGES:   1 << 0,
  READ_MESSAGES:   1 << 1,
  MANAGE_MESSAGES: 1 << 2,
  KICK_MEMBERS:    1 << 3,
  BAN_MEMBERS:     1 << 4,
  MANAGE_CHANNELS: 1 << 5,
  ADMINISTRATOR:   1 << 6,
} as const;

type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

function hasPermission(botPerms: number, permission: Permission): boolean {
  return (botPerms & PERMISSIONS.ADMINISTRATOR) !== 0 ||
         (botPerms & permission) !== 0;
}

// Récupérer les perms du bot sur un serveur
const res = await fetch(
  'https://gateway.alfychat.app/api/bots/me/servers/SERVER_ID',
  { headers: { 'Authorization': \`Bot \${process.env.BOT_TOKEN}\` } },
);
const { permissions } = await res.json();
console.log('Peut envoyer :', hasPermission(permissions, PERMISSIONS.SEND_MESSAGES));`,
    python: `PERMISSIONS = {
    'SEND_MESSAGES':   1 << 0,
    'READ_MESSAGES':   1 << 1,
    'MANAGE_MESSAGES': 1 << 2,
    'KICK_MEMBERS':    1 << 3,
    'BAN_MEMBERS':     1 << 4,
    'MANAGE_CHANNELS': 1 << 5,
    'ADMINISTRATOR':   1 << 6,
}

def has_permission(bot_perms: int, permission: int) -> bool:
    return bool(bot_perms & PERMISSIONS['ADMINISTRATOR']) or \\
           bool(bot_perms & permission)

import os, requests
res = requests.get(
    'https://gateway.alfychat.app/api/bots/me/servers/SERVER_ID',
    headers={'Authorization': f"Bot {os.environ['BOT_TOKEN']}"},
)
perms = res.json()['permissions']
print('Peut envoyer :', has_permission(perms, PERMISSIONS['SEND_MESSAGES']))`,
    java: `public class Permissions {
    public static final int SEND_MESSAGES   = 1 << 0; // 1
    public static final int READ_MESSAGES   = 1 << 1; // 2
    public static final int MANAGE_MESSAGES = 1 << 2; // 4
    public static final int KICK_MEMBERS    = 1 << 3; // 8
    public static final int BAN_MEMBERS     = 1 << 4; // 16
    public static final int MANAGE_CHANNELS = 1 << 5; // 32
    public static final int ADMINISTRATOR   = 1 << 6; // 64

    public static boolean has(int perms, int perm) {
        return (perms & ADMINISTRATOR) != 0 || (perms & perm) != 0;
    }
}

// Vérification :
if (Permissions.has(botPerms, Permissions.SEND_MESSAGES)) {
    sendMessage(channelId, "Je peux envoyer !");
}`,
  },

  /*── GATEWAY LOGIN (JWT) ───────────────────────────────────*/
  gatewayLogin: {
    js: `const res = await fetch('https://gateway.alfychat.app/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com', password: 'motdepasse' }),
});

const { token, refreshToken, user } = await res.json();
sessionStorage.setItem('token', token);
console.log('Connecté en tant que :', user.username);`,
    ts: `interface LoginResponse {
  token: string;        // JWT — valide 7 jours
  refreshToken: string; // valide 30 jours
  user: {
    id: string;
    username: string;
    email: string;
    avatar?: string;
    isVerified: boolean;
  };
}

const res = await fetch('https://gateway.alfychat.app/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com', password: 'motdepasse' }),
});

const data: LoginResponse = await res.json();
sessionStorage.setItem('token', data.token);
console.log('Connecté :', data.user.username);`,
    python: `import requests

res = requests.post(
    'https://gateway.alfychat.app/api/auth/login',
    json={'email': 'user@example.com', 'password': 'motdepasse'},
)

data = res.json()
token = data['token']
print(f"Connecté : {data['user']['username']}")`,
    java: `String json = "{\\"email\\":\\"user@example.com\\",\\"password\\":\\"motdepasse\\"}";
HttpRequest req = HttpRequest.newBuilder()
    .uri(URI.create("https://gateway.alfychat.app/api/auth/login"))
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(json))
    .build();
String body = HttpClient.newHttpClient()
    .send(req, HttpResponse.BodyHandlers.ofString()).body();
System.out.println(body);`,
  },

  /*── GATEWAY EVENTS ───────────────────────────────────────*/
  gatewayEventsListen: {
    js: `import { io } from 'socket.io-client';

const socket = io('https://gateway.alfychat.app', {
  auth: { token: sessionStorage.getItem('token') },
});

socket.on('READY', ({ userId, guilds }) => {
  console.log('Connecté', userId, '—', guilds.length, 'serveur(s)');
});

socket.on('MESSAGE_CREATE', (msg) => {
  console.log(\`[\${msg.channelId}] \${msg.author.username}: \${msg.content}\`);
});

socket.on('MESSAGE_UPDATE', (msg) => {
  console.log('Édité :', msg.id, '→', msg.content);
});

socket.on('MESSAGE_DELETE', ({ id, channelId }) => {
  console.log('Supprimé :', id, 'dans', channelId);
});

socket.on('PRESENCE_UPDATE', ({ userId, status }) => {
  console.log(\`\${userId} est maintenant \${status}\`);
});

socket.on('FRIEND_REQUEST', ({ from }) => {
  console.log('Demande d\\'ami de', from.username);
});

// Maintenir la connexion active
setInterval(() => socket.emit('HEARTBEAT'), 30_000);`,
    ts: `import { io, Socket } from 'socket.io-client';

interface Message {
  id: string; content: string;
  channelId: string;
  author: { id: string; username: string; avatar?: string };
  createdAt: string;
}

const socket: Socket = io('https://gateway.alfychat.app', {
  auth: { token: sessionStorage.getItem('token')! },
});

socket.on('READY', ({ userId }: { userId: string }) =>
  console.log('READY', userId));

socket.on('MESSAGE_CREATE', (m: Message) =>
  console.log(\`[\${m.channelId}] \${m.author.username}: \${m.content}\`));

socket.on('MESSAGE_UPDATE', (m: Message) =>
  console.log('EDIT', m.id));

socket.on('MESSAGE_DELETE', ({ id }: { id: string }) =>
  console.log('DEL', id));

socket.on('PRESENCE_UPDATE',
  ({ userId, status }: { userId: string; status: string }) =>
    console.log(userId, '→', status));

// Heartbeat
setInterval(() => socket.emit('HEARTBEAT'), 30_000);`,
    python: `import os, asyncio, socketio

sio = socketio.AsyncClient()

@sio.event
async def connect():
    print('Connecté au gateway')

@sio.on('READY')
async def on_ready(data):
    print(f"userId={data['userId']}, serveurs={len(data['guilds'])}")

@sio.on('MESSAGE_CREATE')
async def on_message(data):
    author = data['author']['username']
    print(f"[{data['channelId']}] {author}: {data['content']}")

@sio.on('PRESENCE_UPDATE')
async def on_presence(data):
    print(f"{data['userId']} → {data['status']}")

@sio.on('FRIEND_REQUEST')
async def on_friend_req(data):
    print(f"Demande de {data['from']['username']}")

async def heartbeat():
    while True:
        await asyncio.sleep(30)
        await sio.emit('HEARTBEAT')

async def main():
    await sio.connect('https://gateway.alfychat.app',
                      auth={'token': os.environ['USER_JWT']})
    asyncio.create_task(heartbeat())
    await sio.wait()

asyncio.run(main())`,
    java: `Socket socket = IO.socket(
    URI.create("https://gateway.alfychat.app"),
    IO.Options.builder().setAuth(Map.of("token", jwtToken)).build()
);

socket.on("READY", args -> {
    JSONObject d = (JSONObject) args[0];
    System.out.println("READY userId=" + d.optString("userId"));
});

socket.on("MESSAGE_CREATE", args -> {
    JSONObject m = (JSONObject) args[0];
    System.out.println("MSG: " + m.optString("content"));
});

socket.on("PRESENCE_UPDATE", args -> {
    JSONObject d = (JSONObject) args[0];
    System.out.println(d.optString("userId") + " → " + d.optString("status"));
});

// Heartbeat toutes les 30s
new Timer().scheduleAtFixedRate(new TimerTask() {
    public void run() { socket.emit("HEARTBEAT"); }
}, 0, 30_000);

socket.connect();`,
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
        <CardContent className="p-5">
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
        </CardContent>
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
        <div className="divide-y divide-border/40 rounded-xl border border-border/60">
          <details className="group">
            <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium select-none hover:bg-surface/40">
              Créer un bot — POST /api/bots
            </summary>
            <div className="space-y-3 px-4 pb-4 pt-2">
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
            </div>
          </details>
          <details className="group">
            <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium select-none hover:bg-surface/40">
              Modifier un bot — PATCH /api/bots/:id
            </summary>
            <div className="px-4 pb-4 pt-2">
                <MultiCodeBlock
                  title="Requête"
                  examples={{
                    js: `await fetch(\`\${BASE}/api/bots/\${botId}\`, {\n  method: 'PATCH',\n  headers: { 'Authorization': \`Bot \${TOKEN}\`, 'Content-Type': 'application/json' },\n  body: JSON.stringify({\n    name: 'NouveauNom',\n    description: 'Nouvelle description',\n    prefix: '!!',\n    isPublic: true,\n    tags: ['Modération', 'Fun'],\n  }),\n});`,
                    ts: `await fetch(\`\${BASE}/api/bots/\${botId}\`, {\n  method: 'PATCH',\n  headers: { 'Authorization': \`Bot \${TOKEN}\`, 'Content-Type': 'application/json' },\n  body: JSON.stringify({\n    name: 'NouveauNom',\n    isPublic: true,\n    tags: ['Modération', 'Fun'] as string[],\n  }),\n});`,
                    python: `requests.patch(\n    f'{BASE}/api/bots/{bot_id}',\n    headers={'Authorization': f'Bot {TOKEN}'},\n    json={'name': 'NouveauNom', 'isPublic': True, 'tags': ['Modération', 'Fun']},\n)`,
                    java: `JSONObject body = new JSONObject()\n    .put("name", "NouveauNom")\n    .put("isPublic", true)\n    .put("tags", new JSONArray(List.of("Modération", "Fun")));\n\nHttpRequest req = HttpRequest.newBuilder()\n    .uri(URI.create(BASE + "/api/bots/" + botId))\n    .header("Authorization", "Bot " + TOKEN)\n    .header("Content-Type", "application/json")\n    .method("PATCH", HttpRequest.BodyPublishers.ofString(body.toString()))\n    .build();\nHTTP.send(req, HttpResponse.BodyHandlers.ofString());`,
                  }}
                />
            </div>
          </details>
        </div>
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
          <CardHeader>
            <CardTitle className="text-sm">Critères requis</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-[12px] text-muted">
              {['Bot fonctionnel et stable','Description claire','Politique de confidentialité','Contenu conforme aux CGU','Au moins 1 serveur actif','Commandes documentées'].map((c) => (
                <li key={c} className="flex items-center gap-2">
                  <span className="size-1 shrink-0 rounded-full bg-emerald-400" />
                  {c}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="border border-accent-soft-hover bg-accent/5">
          <CardHeader>
            <CardTitle className="text-sm text-accent">Avantages</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-[12px] text-muted">
              {['Badge ✓ visible partout','Priorité dans la recherche','Badge "Verified Dev" sur votre profil','Fonctionnalités avancées','Support prioritaire'].map((a) => (
                <li key={a} className="flex items-center gap-2">
                  <span className="size-1 shrink-0 rounded-full bg-accent" />
                  {a}
                </li>
              ))}
            </ul>
          </CardContent>
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
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-400">{r.limit}</span>
            </div>
          ))}
        </div>
      </div>

      <SectionTitle>Gestion des erreurs</SectionTitle>
      <MultiCodeBlock title="Wrapper API avec retry sur rate limit" examples={EX.errorHandling} />
    </div>
  );
}

/* ─── Bot Creation ─────────────────────────────────────────── */
function BotCreationSection() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={PlusIcon}
        title="Créer un Bot"
        description="Enregistrez un bot via l'API REST, récupérez son token et gérez ses métadonnées."
      />

      <InfoCard color="blue" title="Prérequis">
        Un compte AlfyChat actif est requis. Vous pouvez créer jusqu'à <strong>5 bots</strong> par
        compte. Le bot est lié à votre compte utilisateur et nécessite votre JWT pour être créé.
      </InfoCard>

      <div className="space-y-2">
        <SectionTitle>Créer un bot</SectionTitle>
        <EndpointRow method="POST" path="/api/bots" desc="Crée un nouveau bot et retourne son token (affiché une seule fois)" />
        <MultiCodeBlock title="POST /api/bots — Créer un bot" examples={EX.botCreate} />
      </div>

      <div className="space-y-2">
        <SectionTitle>Réponse 201 Created</SectionTitle>
        <CodeBlock lang="json" title="Corps de la réponse" code={`{
  "success": true,
  "bot": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "MonBot",
    "prefix": "!",
    "description": "Un bot utile pour ma communauté",
    "token": "abc123...64hexchars",  // ← Stocker immédiatement !
    "isVerified": false,
    "isPublic": false,
    "avatarUrl": null,
    "serverCount": 0,
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
}`} />
      </div>

      <div className="space-y-2">
        <SectionTitle>Autres opérations</SectionTitle>
        <div className="space-y-1.5">
          <EndpointRow method="GET"    path="/api/bots"                      desc="Liste tous vos bots (token masqué)" />
          <EndpointRow method="GET"    path="/api/bots/:id"                  desc="Détails d'un bot spécifique" />
          <EndpointRow method="PATCH"  path="/api/bots/:id"                  desc="Modifier nom, préfixe, description, avatar, visibilité" />
          <EndpointRow method="DELETE" path="/api/bots/:id"                  desc="Supprimer définitivement le bot et ses données" />
          <EndpointRow method="POST"   path="/api/bots/:id/regenerate-token" desc="Générer un nouveau token — invalide l'ancien immédiatement" />
        </div>
      </div>

      <InfoCard color="amber" title="Token — Une seule exposition">
        Le token est retourné <strong>uniquement à la création</strong>. Les autres lectures renvoient
        le token masqué. Si vous le perdez, régénérez-le via <code>/regenerate-token</code> — l'ancien
        token sera définitivement invalidé.
      </InfoCard>
    </div>
  );
}

/* ─── Bot Messages ─────────────────────────────────────────── */
function BotMessagesSection() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={MessageCircleIcon}
        title="Envoyer des messages"
        description="Envoyez des messages dans des salons, en DM ou en réponse à un message existant via l'API REST."
      />

      <div className="space-y-2">
        <SectionTitle>Envoyer dans un salon</SectionTitle>
        <EndpointRow method="POST" path="/api/messages" desc="Envoie un message (salon texte, DM ou fil)" />
        <MultiCodeBlock title="POST /api/messages" examples={EX.sendMessage} />
      </div>

      <div className="space-y-2">
        <SectionTitle>Payload complet</SectionTitle>
        <CodeBlock lang="json" title="Corps de la requête" code={`{
  "channelId":   "string",           // Obligatoire — ID du salon ou DM
  "content":     "string",           // Texte (1–2000 caractères)
  "replyToId":   "string | null",    // Optionnel — citer un message
  "attachments": ["url1", "url2"]    // Optionnel — liens médias hébergés
}`} />
      </div>

      <div className="space-y-2">
        <SectionTitle>Réponse 201 Created</SectionTitle>
        <CodeBlock lang="json" title="Message créé" code={`{
  "success": true,
  "message": {
    "id":        "m1a2b3c4-...",
    "content":   "Bonjour !",
    "channelId": "c1a2b3c4-...",
    "authorId":  "bot-id",
    "author":    { "id": "bot-id", "username": "MonBot", "isBot": true },
    "replyTo":   null,
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
}`} />
      </div>

      <div className="space-y-2">
        <SectionTitle>Autres opérations sur les messages</SectionTitle>
        <div className="space-y-1.5">
          <EndpointRow method="GET"    path="/api/messages/:channelId" desc="Lire l'historique paginé d'un salon (param: limit, before)" />
          <EndpointRow method="PATCH"  path="/api/messages/:id"        desc="Modifier le contenu d'un message (auteur uniquement)" />
          <EndpointRow method="DELETE" path="/api/messages/:id"        desc="Supprimer un message (auteur ou MANAGE_MESSAGES)" />
        </div>
      </div>

      <InfoCard color="violet" title="Temps réel automatique">
        Chaque message posté via REST déclenche automatiquement l'événement <code>MESSAGE_CREATE</code>
        sur le WebSocket du salon concerné. Tous les clients connectés reçoivent la notification sans
        action supplémentaire de votre part.
      </InfoCard>
    </div>
  );
}

/* ─── Bot Permissions ──────────────────────────────────────── */
function BotPermissionsSection() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={ShieldCheckIcon}
        title="Permissions"
        description="Les permissions sont stockées en bitmask entier — chaque bit représente une capacité distincte."
      />

      <div className="space-y-2">
        <SectionTitle>Table des permissions</SectionTitle>
        <div className="overflow-hidden rounded-xl border border-border/60">
          {([
            { value: 1,   name: 'SEND_MESSAGES',   desc: 'Envoyer des messages dans les salons' },
            { value: 2,   name: 'READ_MESSAGES',   desc: 'Lire l\'historique des salons' },
            { value: 4,   name: 'MANAGE_MESSAGES', desc: 'Supprimer ou modifier des messages d\'autres membres' },
            { value: 8,   name: 'KICK_MEMBERS',    desc: 'Exclure des membres du serveur' },
            { value: 16,  name: 'BAN_MEMBERS',     desc: 'Bannir définitivement des membres' },
            { value: 32,  name: 'MANAGE_CHANNELS', desc: 'Créer, modifier et supprimer des salons' },
            { value: 64,  name: 'ADMINISTRATOR',   desc: 'Toutes les permissions — bypass complet du bitmask' },
          ] as const).map((p, i) => (
            <div key={p.name} className={cn('flex items-center gap-4 px-4 py-3 text-sm', i % 2 === 0 ? 'bg-background/20' : 'bg-surface/20')}>
              <code className="w-10 shrink-0 font-mono font-bold text-accent">{p.value}</code>
              <code className="w-36 shrink-0 font-mono text-[11px] text-violet-400">{p.name}</code>
              <span className="text-[11px] text-muted">{p.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <SectionTitle>Vérifier les permissions</SectionTitle>
        <MultiCodeBlock title="Vérifier si le bot possède une permission" examples={EX.botPermissionsCheck} />
      </div>

      <div className="space-y-2">
        <SectionTitle>Endpoints</SectionTitle>
        <div className="space-y-1.5">
          <EndpointRow method="GET"   path="/api/bots/me/servers"            desc="Liste les serveurs où le bot est présent avec les permissions associées" />
          <EndpointRow method="GET"   path="/api/bots/me/servers/:serverId"  desc="Permissions du bot sur un serveur spécifique" />
          <EndpointRow method="PATCH" path="/api/bots/me/servers/:serverId"  desc="Modifier les permissions (nécessite les droits admin du serveur)" />
        </div>
      </div>

      <InfoCard color="amber" title="ADMINISTRATOR (64)">
        Si ce bit est activé, le bot contourne <strong>toutes</strong> les vérifications de permissions.
        Équivalent d'un accès complet. À accorder uniquement en pleine confiance.
      </InfoCard>
    </div>
  );
}

/* ─── Gateway REST — Index ──────────────────────────────────── */
function RestBreadcrumb({ title }: { title: string }) {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-xs text-muted/60">
      <Link href="/developers/docs/gateway-rest" className="hover:text-accent no-underline transition-colors">Référence REST</Link>
      <span>/</span>
      <span className="text-foreground/80">{title}</span>
    </div>
  );
}

function GatewayRestSection() {
  return (
    <div className="space-y-8">
      <PageHeader
        icon={CodeIcon}
        title="Référence REST"
        description="Tous les endpoints HTTP du Gateway — organisés par domaine. Choisissez une section pour l'explorer en détail."
        badge="REST"
      />

      <Card className="border border-border/60 bg-surface/40">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-[11px] font-semibold text-muted mb-1">Base URL</p>
              <code className="font-mono text-sm font-bold text-accent">https://gateway.alfychat.app</code>
            </div>
            <Separator orientation="vertical" className="hidden sm:block h-8" />
            <div>
              <p className="text-[11px] font-semibold text-muted mb-1">Préfixe</p>
              <code className="font-mono text-sm font-bold">/api</code>
            </div>
            <Separator orientation="vertical" className="hidden sm:block h-8" />
            <div>
              <p className="text-[11px] font-semibold text-muted mb-1">Auth header</p>
              <code className="font-mono text-sm font-bold">Authorization: Bearer &lt;jwt&gt;</code>
            </div>
            <Separator orientation="vertical" className="hidden sm:block h-8" />
            <div>
              <p className="text-[11px] font-semibold text-muted mb-1">Auth bots</p>
              <code className="font-mono text-sm font-bold">Authorization: Bot &lt;token&gt;</code>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <SectionTitle>Sections détaillées</SectionTitle>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {([
            { slug: 'gateway-rest-auth',     icon: KeyIcon,          title: 'Auth & RGPD',            desc: 'Inscription, connexion, refresh token, révocation de session, export et suppression de données.', count: 6,  paths: ['/api/auth/*', '/api/rgpd/*'],      color: 'text-blue-400'   },
            { slug: 'gateway-rest-users',    icon: BookOpenIcon,     title: 'Utilisateurs',           desc: 'Profil, préférences, statut de présence et last-seen.',                                             count: 7,  paths: ['/api/users/*'],                    color: 'text-violet-400' },
            { slug: 'gateway-rest-messages', icon: MessageCircleIcon,title: 'Messages & Conversations',desc: 'Messages DM, conversations groupe, réactions, notifications et archive P2P.',                        count: 17, paths: ['/api/messages/*', '/api/conversations/*', '/api/archive/*'], color: 'text-emerald-400'},
            { slug: 'gateway-rest-friends',  icon: UserPlusIcon,     title: 'Amis & Appels',          desc: "Demandes d'ami, blocage et historique d'appels. Side-effects WebSocket documentés.",                count: 12, paths: ['/api/friends/*', '/api/calls/*'],  color: 'text-orange-400' },
            { slug: 'gateway-rest-servers',  icon: ServerIcon,       title: 'Serveurs',               desc: 'CRUD serveurs, channels, membres, rôles, invitations, fichiers et routing vers server-nodes.',      count: 26, paths: ['/api/servers/*'],                  color: 'text-teal-400'   },
            { slug: 'gateway-rest-bots',     icon: BotIcon,          title: 'Bots',                   desc: 'Création, authentification, commandes, gestion dans les serveurs et certification.',                count: 18, paths: ['/api/bots/*'],                     color: 'text-fuchsia-400'},
            { slug: 'gateway-rest-media',    icon: TerminalIcon,     title: 'Médias',                 desc: 'Upload multipart vers le CDN géo-distribué — avatars, banners, icons, pièces jointes.',            count: 3,  paths: ['/api/media/*', '/uploads/*'],      color: 'text-lime-400'   },
            { slug: 'gateway-rest-admin',    icon: ShieldCheckIcon,  title: 'Admin & Monitoring',     desc: 'Stats gateway, ban IP, monitoring des services, incidents, endpoints publics et internes.',         count: 20, paths: ['/api/admin/*', '/api/status', '/api/internal/*'], color: 'text-red-400'},
          ] as const).map((p) => (
            <Link
              key={p.slug}
              href={`/developers/docs/${p.slug}`}
              className="group flex flex-col gap-2 rounded-xl border border-border/60 bg-surface/30 p-4 no-underline transition-all hover:border-accent/30 hover:bg-surface/60"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p.icon size={14} className={cn('shrink-0', p.color)} />
                  <span className="text-sm font-bold text-foreground">{p.title}</span>
                </div>
                <span className="shrink-0 rounded-full bg-background/60 px-2 py-0.5 font-mono text-[10px] text-muted">{p.count} ep.</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">{p.desc}</p>
              <div className="flex flex-wrap gap-1">
                {p.paths.map((path) => (
                  <code key={path} className="rounded bg-background/60 px-1.5 py-0.5 font-mono text-[10px] text-accent/80">{path}</code>
                ))}
              </div>
              <span className="text-[11px] text-accent/60 group-hover:text-accent transition-colors">Voir la documentation →</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── REST — Auth & RGPD ────────────────────────────────────── */
function GatewayRestAuthSection() {
  return (
    <div className="space-y-8">
      <RestBreadcrumb title="Auth & RGPD" />
      <PageHeader icon={KeyIcon} title="Auth & RGPD" description="Inscription, connexion, refresh token, révocation de session et droits RGPD (export, suppression)." />

      <div>
        <h3 className="mb-3 text-sm font-bold text-blue-400">Authentification — /api/auth</h3>
        <div className="space-y-1.5">
          <EndpointRow method="POST" path="/api/auth/register" desc="Créer un compte — body: { username, email, password }" />
          <EndpointRow method="POST" path="/api/auth/login"    desc="Connexion — body: { email, password } → { token, refreshToken, user }" />
          <EndpointRow method="POST" path="/api/auth/refresh"  desc="Renouveler le JWT — body: { refreshToken } → { token, refreshToken }" />
          <EndpointRow method="POST" path="/api/auth/logout"   desc="Révoquer la session active — body: { refreshToken }" />
        </div>
        <div className="mt-4 space-y-3">
          <CodeBlock lang="js" title="POST /api/auth/register" code={`const res = await fetch('https://gateway.alfychat.app/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'alice',
    email:    'alice@example.com',
    password: 'My$ecureP@ssword1',
  }),
});
const { token, refreshToken, user } = await res.json();`} />
          <CodeBlock lang="json" title="Réponse POST /api/auth/login" code={`{
  "token":        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a1b2c3d4e5f67890...",
  "user": {
    "id":         "u1a2b3c4-...",
    "username":   "alice",
    "email":      "alice@example.com",
    "avatarUrl":  "https://media.alfychat.app/avatars/...",
    "isVerified": true,
    "role":       "user"
  }
}`} />
          <CodeBlock lang="js" title="POST /api/auth/refresh" code={`const res = await fetch('https://gateway.alfychat.app/api/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken: storedToken }),
});
const { token, refreshToken } = await res.json();`} />
        </div>
        <InfoCard color="amber" title="Durée de vie des tokens">
          Le <strong>JWT</strong> expire après <strong>15 minutes</strong>. Le <strong>refreshToken</strong> est valable <strong>1 an (365 jours)</strong>.
          Appelez <code>/api/auth/refresh</code> avant l&apos;expiration du JWT pour éviter de déconnecter l&apos;utilisateur.
        </InfoCard>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-amber-400">RGPD — /api/rgpd</h3>
        <div className="space-y-1.5">
          <EndpointRow method="GET"    path="/api/rgpd/export"  desc="Exporter toutes vos données personnelles — retourne un fichier ZIP" />
          <EndpointRow method="DELETE" path="/api/rgpd/account" desc="Supprimer définitivement votre compte et toutes vos données" />
        </div>
        <div className="mt-3">
          <CodeBlock lang="js" title="Export de données RGPD" code={`const res = await fetch('https://gateway.alfychat.app/api/rgpd/export', {
  headers: { 'Authorization': \`Bearer \${token}\` },
});
const blob = await res.blob();
const url  = URL.createObjectURL(blob);
// Le navigateur téléchargera le ZIP automatiquement`} />
        </div>
        <InfoCard color="red" title="Suppression irréversible">
          <code>DELETE /api/rgpd/account</code> est <strong>irréversible</strong>.
          Toutes les données sont supprimées dans les <strong>30 jours</strong> conformément au RGPD.
        </InfoCard>
      </div>
    </div>
  );
}

/* ─── REST — Utilisateurs ───────────────────────────────────── */
function GatewayRestUsersSection() {
  return (
    <div className="space-y-8">
      <RestBreadcrumb title="Utilisateurs" />
      <PageHeader icon={BookOpenIcon} title="Utilisateurs" description="Profil, préférences, statut de présence et dernière connexion." />

      <div>
        <h3 className="mb-3 text-sm font-bold text-violet-400">Profil — /api/users</h3>
        <div className="space-y-1.5">
          <EndpointRow method="GET"   path="/api/users/me"              desc="Profil complet de l'utilisateur connecté (nécessite un JWT valide)" />
          <EndpointRow method="PATCH" path="/api/users/me"              desc="Modifier le profil — body: { username?, displayName?, bio?, avatarUrl? }" />
          <EndpointRow method="GET"   path="/api/users/:id"             desc="Profil public d'un utilisateur par son ID" />
          <EndpointRow method="PATCH" path="/api/users/:id"             desc="Mettre à jour le profil (propre profil ou admin)" />
          <EndpointRow method="GET"   path="/api/users/:id/preferences" desc="Préférences (thème, langue, notifications) — auth requise" />
          <EndpointRow method="PATCH" path="/api/users/:id/status"      desc="Changer le statut — body: { status, customStatus? }" />
          <EndpointRow method="PATCH" path="/api/users/:id/last-seen"   desc="Mettre à jour la dernière connexion (appelé automatiquement)" />
        </div>
        <div className="mt-4 space-y-3">
          <CodeBlock lang="json" title="GET /api/users/me — réponse complète" code={`{
  "id":           "u1a2b3c4-d5e6-f7g8-h9i0-j1k2l3m4n5o6",
  "username":     "alice",
  "displayName":  "Alice 🌸",
  "email":        "alice@example.com",
  "avatarUrl":    "https://media.alfychat.app/avatars/alice-abc123.webp",
  "bio":          "Développeuse passionnée",
  "role":         "user",
  "isVerified":   true,
  "status":       "online",
  "customStatus": "🎵 En train de coder",
  "createdAt":    "2026-01-01T00:00:00.000Z",
  "lastSeenAt":   "2026-04-02T10:00:00.000Z"
}`} />
          <CodeBlock lang="js" title="PATCH /api/users/me — modifier le profil" code={`const res = await fetch('https://gateway.alfychat.app/api/users/me', {
  method: 'PATCH',
  headers: {
    'Authorization': \`Bearer \${token}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ displayName: 'Alice ✨', bio: 'Nouvelle bio !' }),
});
const { user } = await res.json();`} />
          <CodeBlock lang="json" title="PATCH /api/users/:id/status — valeurs possibles" code={`{ "status": "online" }    // En ligne
{ "status": "idle" }      // Absent
{ "status": "dnd" }       // Ne pas déranger
{ "status": "invisible" } // Hors ligne (visible uniquement par vous)

// Avec statut personnalisé
{ "status": "dnd", "customStatus": "🎮 En jeu" }`} />
        </div>
      </div>
    </div>
  );
}

/* ─── REST — Messages & Conversations ──────────────────────── */
function GatewayRestMessagesSection() {
  return (
    <div className="space-y-8">
      <RestBreadcrumb title="Messages & Conversations" />
      <PageHeader icon={MessageCircleIcon} title="Messages & Conversations" description="Messages DM, conversations groupe, réactions, participants, notifications et archive P2P." />

      <div>
        <h3 className="mb-3 text-sm font-bold text-emerald-400">Messages — /api/messages</h3>
        <div className="space-y-1.5">
          <EndpointRow method="GET"    path="/api/messages"                      desc="Lister les messages — query: conversationId (required), limit (50 par défaut), before (curseur UUID)" />
          <EndpointRow method="POST"   path="/api/messages"                      desc="Envoyer un message — body: { conversationId, content, replyToId? }" />
          <EndpointRow method="PATCH"  path="/api/messages/:id"                  desc="Modifier — body: { content } (auteur uniquement)" />
          <EndpointRow method="DELETE" path="/api/messages/:id"                  desc="Supprimer (auteur ou admin)" />
          <EndpointRow method="POST"   path="/api/messages/:id/reactions"        desc="Ajouter une réaction — body: { emoji }" />
          <EndpointRow method="DELETE" path="/api/messages/:id/reactions/:emoji" desc="Retirer une réaction (URL-encode l'emoji si nécessaire)" />
        </div>
        <div className="mt-4 space-y-3">
          <CodeBlock lang="js" title="Charger l'historique + pagination" code={`// Page 1
const res = await fetch(
  'https://gateway.alfychat.app/api/messages?conversationId=dm_abc&limit=50',
  { headers: { 'Authorization': \`Bearer \${token}\` } }
);
const { messages } = await res.json();

// Page 2 (pagination par curseur)
const older = await fetch(
  \`https://gateway.alfychat.app/api/messages?conversationId=dm_abc&limit=50&before=\${messages.at(-1).id}\`,
  { headers: { 'Authorization': \`Bearer \${token}\` } }
);`} />
          <CodeBlock lang="json" title="Réponse POST /api/messages" code={`{
  "id":             "m1a2b3c4-...",
  "conversationId": "dm_user1_user2",
  "senderId":       "u1a2b3c4-...",
  "content":        "Salut !",
  "replyToId":      null,
  "createdAt":      "2026-04-02T10:00:00.000Z",
  "isEdited":       false,
  "reactions":      []
}`} />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-sky-400">Conversations — /api/conversations</h3>
        <div className="space-y-1.5">
          <EndpointRow method="GET"    path="/api/conversations"                       desc="Lister toutes les conversations de l'utilisateur (DM + groupes)" />
          <EndpointRow method="POST"   path="/api/conversations"                       desc="Créer — body: { type: 'dm'|'group', participantIds[], name? }" />
          <EndpointRow method="PATCH"  path="/api/conversations/:id"                   desc="Modifier — body: { name?, avatarUrl? } (groupes uniquement)" />
          <EndpointRow method="DELETE" path="/api/conversations/:id"                   desc="Supprimer (admin / propriétaire)" />
          <EndpointRow method="POST"   path="/api/conversations/:id/participants"      desc="Ajouter un participant — body: { userId }" />
          <EndpointRow method="DELETE" path="/api/conversations/:id/participants/:uid" desc="Retirer un participant du groupe" />
          <EndpointRow method="POST"   path="/api/conversations/:id/leave"             desc="Quitter un groupe (désabonnement propre)" />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-pink-400">Notifications — /api/notifications</h3>
        <div className="space-y-1.5">
          <EndpointRow method="GET"   path="/api/notifications"      desc="Liste des notifications non-lues (DMs, demandes d'ami, mentions)" />
          <EndpointRow method="PATCH" path="/api/notifications/read" desc="Marquer toutes les notifications comme lues" />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-cyan-400">Archive DM (système hybride) — /api/archive</h3>
        <div className="space-y-1.5">
          <EndpointRow method="GET"  path="/api/archive/status/:convId" desc="Statut d'archivage d'une conversation" />
          <EndpointRow method="GET"  path="/api/archive/stats/:convId"  desc="Messages archivés, quota utilisé" />
          <EndpointRow method="GET"  path="/api/archive/quota/:convId"  desc="Vérifier le quota disponible avant archivage" />
          <EndpointRow method="POST" path="/api/archive/confirm"        desc="Confirmer la réception d'une archive P2P — body: { conversationId, archiveLogId }" />
          <EndpointRow method="GET"  path="/api/archive/message/:id"    desc="Récupérer un message archivé depuis le cache serveur" />
          <EndpointRow method="POST" path="/api/archive/cache"          desc="Mettre en cache des messages archivés — body: { messages[] }" />
        </div>
        <InfoCard color="blue" title="Système hybride DM">
          Les messages récents sont en base de données. Les anciens sont archivés <strong>côté client</strong> et échangeables
          entre pairs via les events WebSocket <code>DM_ARCHIVE_REQUEST</code> / <code>DM_ARCHIVE_PEER_RESPONSE</code>.
          Le serveur ne stocke que les métadonnées et un cache limité.
        </InfoCard>
      </div>
    </div>
  );
}

/* ─── REST — Amis & Appels ──────────────────────────────────── */
function GatewayRestFriendsSection() {
  return (
    <div className="space-y-8">
      <RestBreadcrumb title="Amis & Appels" />
      <PageHeader icon={UserPlusIcon} title="Amis & Appels" description="Gestion des amis, des demandes, du blocage et de l'historique des appels." />

      <div>
        <h3 className="mb-3 text-sm font-bold text-orange-400">Amis — /api/friends</h3>
        <div className="space-y-1.5">
          <EndpointRow method="GET"    path="/api/friends"                      desc="Liste des amis de l'utilisateur connecté" />
          <EndpointRow method="GET"    path="/api/friends/requests"             desc="Demandes d'ami → { received: [], sent: [] }" />
          <EndpointRow method="GET"    path="/api/friends/blocked"              desc="Liste des utilisateurs bloqués" />
          <EndpointRow method="POST"   path="/api/friends/request"              desc="Envoyer une demande — body: { toUserId, message? } ⚡ émet WS FRIEND_REQUEST au destinataire" />
          <EndpointRow method="POST"   path="/api/friends/requests/:id/accept"  desc="Accepter ⚡ émet WS FRIEND_ACCEPT aux deux utilisateurs" />
          <EndpointRow method="POST"   path="/api/friends/requests/:id/decline" desc="Refuser une demande" />
          <EndpointRow method="DELETE" path="/api/friends/:friendId"            desc="Supprimer un ami ⚡ émet WS FRIEND_REMOVE aux deux utilisateurs" />
          <EndpointRow method="POST"   path="/api/friends/:targetId/block"      desc="Bloquer un utilisateur" />
          <EndpointRow method="POST"   path="/api/friends/:targetId/unblock"    desc="Débloquer un utilisateur" />
        </div>
        <InfoCard color="blue" title="⚡ Side-effects WebSocket">
          Certaines routes amis déclenchent des notifications WebSocket <strong>en temps réel</strong>.
          Si le destinataire est hors ligne, il recevra l&apos;événement via <code>PENDING_PINGS</code> à sa prochaine connexion.
        </InfoCard>
        <div className="mt-4">
          <CodeBlock lang="js" title="Envoyer une demande d'ami" code={`const res = await fetch('https://gateway.alfychat.app/api/friends/request', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${token}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    toUserId: 'u2b3c4d5-...',
    message:  'Salut, je te connais du serveur AlfyChat !',
  }),
});
// L'utilisateur cible reçoit l'event WS FRIEND_REQUEST en temps réel`} />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-red-400">Appels — /api/calls</h3>
        <div className="space-y-1.5">
          <EndpointRow method="GET"  path="/api/calls"     desc="Historique des appels (manqués, effectués, reçus)" />
          <EndpointRow method="POST" path="/api/calls"     desc="Créer un appel (usage interne — préférer l'event WebSocket CALL_INITIATE)" />
          <EndpointRow method="GET"  path="/api/calls/:id" desc="Détails d'un appel spécifique (durée, participants, type)" />
        </div>
        <InfoCard color="amber" title="Appels WebRTC — via WebSocket uniquement">
          Pour initier un appel, utilisez l&apos;event WebSocket <code>CALL_INITIATE</code>.
          Tout le signaling WebRTC (offer / answer / ICE) se fait via Socket.IO.
          L&apos;API REST <code>/api/calls</code> sert uniquement à consulter l&apos;historique.
        </InfoCard>
      </div>
    </div>
  );
}

/* ─── REST — Serveurs ───────────────────────────────────────── */
function GatewayRestServersSection() {
  return (
    <div className="space-y-8">
      <RestBreadcrumb title="Serveurs" />
      <PageHeader icon={ServerIcon} title="Serveurs" description="CRUD serveurs, channels, membres, rôles, invitations et fichiers. Routing intelligent vers server-nodes." />

      <div>
        <h3 className="mb-3 text-sm font-bold text-teal-400">Serveurs — /api/servers</h3>
        <div className="space-y-1.5">
          <EndpointRow method="GET"    path="/api/servers"              desc="Serveurs dont l'utilisateur est membre" />
          <EndpointRow method="POST"   path="/api/servers"              desc="Créer un serveur — body: { name, iconUrl?, description? }" />
          <EndpointRow method="GET"    path="/api/servers/:id"          desc="Détails complets (channels, membres, rôles)" />
          <EndpointRow method="PATCH"  path="/api/servers/:id"          desc="Modifier — body: { name?, iconUrl?, bannerUrl? }" />
          <EndpointRow method="DELETE" path="/api/servers/:id"          desc="Supprimer le serveur (propriétaire uniquement)" />
          <EndpointRow method="POST"   path="/api/servers/join"         desc="Rejoindre via code d'invitation — body: { inviteCode }" />
          <EndpointRow method="POST"   path="/api/servers/:id/leave"    desc="Quitter un serveur" />
          <EndpointRow method="GET"    path="/api/servers/public/*"     desc="Annuaire des serveurs publics" />
          <EndpointRow method="GET"    path="/api/servers/discover/*"   desc="Découverte de serveurs recommandés" />
          <EndpointRow method="GET"    path="/api/servers/:id/node-token" desc="Token temporaire pour connexion directe au server-node" />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-teal-300">Channels — /api/servers/:id/channels</h3>
        <div className="space-y-1.5">
          <EndpointRow method="GET"    path="/api/servers/:id/channels"           desc="Liste des channels" />
          <EndpointRow method="POST"   path="/api/servers/:id/channels"           desc="Créer — body: { name, type: 'text'|'voice'|'announcement', position? }" />
          <EndpointRow method="PATCH"  path="/api/servers/:id/channels/:chId"     desc="Modifier — body: { name?, position?, isPrivate? }" />
          <EndpointRow method="DELETE" path="/api/servers/:id/channels/:chId"     desc="Supprimer le channel" />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-teal-300">Membres — /api/servers/:id/members</h3>
        <div className="space-y-1.5">
          <EndpointRow method="GET"    path="/api/servers/:id/members"            desc="Liste des membres (id, username, rôles, joinedAt)" />
          <EndpointRow method="DELETE" path="/api/servers/:id/members/:uid"       desc="Exclure (kick) — requiert permission KICK_MEMBERS" />
          <EndpointRow method="POST"   path="/api/servers/:id/bans/:uid"          desc="Bannir — body: { reason? } — requiert permission BAN_MEMBERS" />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-teal-300">Rôles — /api/servers/:id/roles</h3>
        <div className="space-y-1.5">
          <EndpointRow method="GET"    path="/api/servers/:id/roles"              desc="Liste des rôles" />
          <EndpointRow method="POST"   path="/api/servers/:id/roles"              desc="Créer — body: { name, color?, permissions? }" />
          <EndpointRow method="PATCH"  path="/api/servers/:id/roles/:roleId"      desc="Modifier — body: { name?, color?, permissions?, position? }" />
          <EndpointRow method="DELETE" path="/api/servers/:id/roles/:roleId"      desc="Supprimer le rôle" />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-teal-300">Invitations & Fichiers</h3>
        <div className="space-y-1.5">
          <EndpointRow method="GET"  path="/api/servers/invite/:code"        desc="Infos d'une invitation par code (sans auth requis)" />
          <EndpointRow method="POST" path="/api/servers/invites/:id"         desc="Créer une invitation — body: { maxUses?, expiresIn? }" />
          <EndpointRow method="POST" path="/api/servers/:id/files"           desc="Uploader un fichier — multipart/form-data" />
          <EndpointRow method="GET"  path="/api/servers/:id/files/:filename" desc="Télécharger un fichier du serveur" />
        </div>
      </div>

      <InfoCard color="violet" title="Server Nodes — routing intelligent">
        Les requêtes sur <code>/api/servers/:id/*</code> sont automatiquement redirigées vers le
        <strong> server-node</strong> hébergeant ce serveur si un node est connecté au gateway.
        En l&apos;absence de node actif, le microservice central <code>servers</code> traite la requête.
      </InfoCard>

      <CodeBlock lang="js" title="Créer un serveur" code={`const res = await fetch('https://gateway.alfychat.app/api/servers', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${token}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name:        'Mon Super Serveur',
    iconUrl:     'https://media.alfychat.app/icons/srv-icon.webp',
    description: 'Serveur de développement AlfyChat',
  }),
});
const { server } = await res.json();`} />
    </div>
  );
}

/* ─── REST — Bots ───────────────────────────────────────────── */
function GatewayRestBotsSection() {
  return (
    <div className="space-y-8">
      <RestBreadcrumb title="Bots" />
      <PageHeader icon={BotIcon} title="Bots" description="Création, authentification, commandes, gestion dans les serveurs et certification officielle." />

      <div>
        <h3 className="mb-3 text-sm font-bold text-fuchsia-400">CRUD Bots — /api/bots</h3>
        <div className="space-y-1.5">
          <EndpointRow method="GET"    path="/api/bots/me"     desc="Lister vos bots (JWT requis)" />
          <EndpointRow method="POST"   path="/api/bots"        desc="Créer — body: { name, prefix, description?, isPublic? }" />
          <EndpointRow method="GET"    path="/api/bots/:id"    desc="Détails d'un bot (public si isPublic=true)" />
          <EndpointRow method="PATCH"  path="/api/bots/:id"    desc="Modifier — body: { name?, prefix?, description?, isPublic?, tags? }" />
          <EndpointRow method="DELETE" path="/api/bots/:id"    desc="Supprimer le bot et révoquer son token" />
          <EndpointRow method="GET"    path="/api/bots/public" desc="Annuaire des bots publics — query: search, tag, page" />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-fuchsia-300">Auth & Token</h3>
        <div className="space-y-1.5">
          <EndpointRow method="POST"  path="/api/bots/authenticate"         desc="Authentifier le bot — header: Authorization: Bot &lt;token&gt; → infos bot" />
          <EndpointRow method="POST"  path="/api/bots/:id/regenerate-token" desc="Régénérer un nouveau token (invalide l'ancien immédiatement)" />
          <EndpointRow method="PATCH" path="/api/bots/:id/status"           desc="Changer le statut — body: { status: 'online'|'offline'|'maintenance' }" />
        </div>
        <div className="mt-3">
          <CodeBlock lang="js" title="Authentifier un bot" code={`const res = await fetch('https://gateway.alfychat.app/api/bots/authenticate', {
  method: 'POST',
  headers: { 'Authorization': \`Bot \${process.env.BOT_TOKEN}\` },
});
const { bot } = await res.json();
console.log('Bot:', bot.name, '| prefix:', bot.prefix);`} />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-fuchsia-300">Commandes — /api/bots/:id/commands</h3>
        <div className="space-y-1.5">
          <EndpointRow method="GET"    path="/api/bots/:id/commands"        desc="Lister les commandes enregistrées" />
          <EndpointRow method="POST"   path="/api/bots/:id/commands"        desc="Créer — body: { name, description, cooldown?, options? }" />
          <EndpointRow method="PATCH"  path="/api/bots/:id/commands/:cmdId" desc="Modifier une commande" />
          <EndpointRow method="DELETE" path="/api/bots/:id/commands/:cmdId" desc="Supprimer une commande" />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-fuchsia-300">Bots dans les serveurs</h3>
        <div className="space-y-1.5">
          <EndpointRow method="GET"    path="/api/bots/servers/:serverId"     desc="Bots installés dans un serveur" />
          <EndpointRow method="POST"   path="/api/bots/:id/servers"           desc="Ajouter le bot dans un serveur — body: { serverId }" />
          <EndpointRow method="DELETE" path="/api/bots/:id/servers/:serverId" desc="Retirer le bot d'un serveur" />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-amber-400">Certification</h3>
        <div className="space-y-1.5">
          <EndpointRow method="POST"  path="/api/bots/:id/certification"           desc="Soumettre une demande de certification" />
          <EndpointRow method="GET"   path="/api/bots/certification/pending"       desc="Demandes en attente (admin uniquement)" />
          <EndpointRow method="POST"  path="/api/bots/certification/:reqId/review" desc="Approuver/refuser — body: { approved: boolean, reason? } (admin)" />
        </div>
        <InfoCard color="violet" title="Badge de certification">
          Un bot certifié reçoit un badge ✅ visible dans l&apos;annuaire public.
          La certification est manuelle et validée par l&apos;équipe AlfyChat.
        </InfoCard>
      </div>
    </div>
  );
}

/* ─── REST — Médias ─────────────────────────────────────────── */
function GatewayRestMediaSection() {
  return (
    <div className="space-y-8">
      <RestBreadcrumb title="Médias" />
      <PageHeader icon={TerminalIcon} title="Médias" description="Upload multipart vers le CDN géo-distribué et téléchargement via les URLs de distribution." />

      <div>
        <h3 className="mb-3 text-sm font-bold text-lime-400">Upload — /api/media/upload</h3>
        <div className="space-y-1.5">
          <EndpointRow method="POST" path="/api/media/upload/:type" desc="Uploader — :type = avatars | banners | icons | attachments — query: ?location=EU|US" />
        </div>
        <div className="mt-4 space-y-3">
          <CodeBlock lang="bash" title="Upload via curl" code={`# Avatar (EU)
curl -X POST "https://gateway.alfychat.app/api/media/upload/avatars?location=EU" \\
  -H "Authorization: Bearer $TOKEN" \\
  -F "file=@mon-avatar.png"

# Pièce jointe
curl -X POST "https://gateway.alfychat.app/api/media/upload/attachments" \\
  -H "Authorization: Bearer $TOKEN" \\
  -F "file=@document.pdf"`} />
          <CodeBlock lang="js" title="Upload avec JavaScript (FormData)" code={`const formData = new FormData();
formData.append('file', fileInput.files[0]);

const res = await fetch(
  'https://gateway.alfychat.app/api/media/upload/avatars?location=EU',
  {
    method:  'POST',
    headers: { 'Authorization': \`Bearer \${token}\` },
    body:    formData,
    // Ne PAS définir Content-Type manuellement (boundary auto)
  }
);
const { url, path } = await res.json();`} />
          <CodeBlock lang="json" title="Réponse upload" code={`{
  "url":  "https://gateway.alfychat.app/api/media/EU/media-eu-1/avatars/user123-abc123.webp",
  "path": "avatars/user123-abc123.webp"
}`} />
        </div>
        <InfoCard color="blue" title="Types et limites">
          <strong>avatars / banners / icons</strong> : PNG, JPG, WEBP, GIF — max 10 MB — converti en WEBP automatiquement. <br />
          <strong>attachments</strong> : tous types — max 25 MB (utilisateurs) / 100 MB (bots certifiés).
        </InfoCard>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-lime-400">Téléchargement — CDN géo-distribué</h3>
        <div className="space-y-1.5">
          <EndpointRow method="GET" path="/api/media/:location/:serviceId/:folder/:filename" desc="Télécharger — :location = EU | US · :serviceId = id instance media" />
          <EndpointRow method="GET" path="/uploads/:folder/:filename"                        desc="URL legacy — redirigée automatiquement vers le service media" />
        </div>
        <InfoCard color="violet" title="CDN géographique">
          Les médias sont stockés sur l&apos;instance la plus proche de l&apos;utilisateur (EU ou US).
          Les URLs contiennent le location et l&apos;ID du service pour un routing direct sans lookup Redis.
        </InfoCard>
      </div>
    </div>
  );
}

/* ─── REST — Admin & Monitoring ─────────────────────────────── */
function GatewayRestAdminSection() {
  return (
    <div className="space-y-8">
      <RestBreadcrumb title="Admin & Monitoring" />
      <PageHeader icon={ShieldCheckIcon} title="Admin & Monitoring" description="Routes réservées aux administrateurs — stats, ban IP, monitoring des microservices et gestion des incidents." />

      <div>
        <h3 className="mb-3 text-sm font-bold text-red-400">Gateway — /api/admin/gateway</h3>
        <div className="space-y-1.5">
          <EndpointRow method="GET"    path="/api/admin/gateway/stats"      desc="Stats rate-limiting : requêtes/min, IPs bannies, hit rate" />
          <EndpointRow method="POST"   path="/api/admin/gateway/ban-ip"     desc="Bannir une IP — body: { ip, reason? }" />
          <EndpointRow method="DELETE" path="/api/admin/gateway/ban-ip/:ip" desc="Débannir une IP" />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-red-400">Monitoring — /api/admin/monitoring</h3>
        <div className="space-y-1.5">
          <EndpointRow method="GET" path="/api/admin/monitoring"                desc="Statut de tous les services + latence + historique 24h" />
          <EndpointRow method="GET" path="/api/admin/monitoring/service/:name"  desc="Historique d'un service — query: hours=24" />
          <EndpointRow method="GET" path="/api/admin/monitoring/users/chart"    desc="Graphique connexions — query: period=30min|10min|hour|day|month" />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-red-400">Services — /api/admin/services</h3>
        <div className="space-y-1.5">
          <EndpointRow method="GET"    path="/api/admin/services"       desc="Liste toutes les instances de microservices enregistrées" />
          <EndpointRow method="GET"    path="/api/admin/services/:type" desc="Instances filtrées par type (users, messages, media…)" />
          <EndpointRow method="POST"   path="/api/admin/services"       desc="Enregistrer manuellement une instance" />
          <EndpointRow method="PATCH"  path="/api/admin/services/:id"   desc="Activer / désactiver — body: { enabled: boolean }" />
          <EndpointRow method="DELETE" path="/api/admin/services/:id"   desc="Supprimer et bannir définitivement une instance" />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-red-400">Incidents — /api/admin/status/incidents</h3>
        <div className="space-y-1.5">
          <EndpointRow method="GET"    path="/api/admin/status/incidents"      desc="Liste des incidents — query: includeResolved=true" />
          <EndpointRow method="POST"   path="/api/admin/status/incidents"      desc="Créer — body: { title, severity, message?, services?, status? }" />
          <EndpointRow method="PATCH"  path="/api/admin/status/incidents/:id"  desc="Mettre à jour (résolution, update…)" />
          <EndpointRow method="DELETE" path="/api/admin/status/incidents/:id"  desc="Supprimer un incident" />
        </div>
        <InfoCard color="amber" title="Accès admin requis">
          Toutes les routes <code>/api/admin/*</code> nécessitent un JWT avec <code>role: &quot;admin&quot;</code>.
          Tout appel sans ce rôle retourne <code>403 Forbidden</code>.
        </InfoCard>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-gray-400">Public (sans authentification)</h3>
        <div className="space-y-1.5">
          <EndpointRow method="GET" path="/api/status" desc="Statut public des services, incidents actifs et uptime 90 jours" />
          <EndpointRow method="GET" path="/health"     desc="Health check du gateway — { status: 'ok', uptime, connections }" />
          <EndpointRow method="GET" path="/stats"      desc="Statistiques temps réel — { connections, rooms }" />
        </div>
        <div className="mt-3">
          <CodeBlock lang="json" title="GET /api/status" code={`{
  "services": [
    { "service": "users",    "status": "up",       "responseTimeMs": 12 },
    { "service": "messages", "status": "up",       "responseTimeMs": 8  },
    { "service": "media",    "status": "degraded", "responseTimeMs": 340 }
  ],
  "incidents": [],
  "uptime": {
    "users": [ { "date": "2026-04-01", "uptime": 100 }, ... ]
  }
}`} />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-slate-500">Interne — /api/internal (microservices uniquement)</h3>
        <div className="space-y-1.5">
          <EndpointRow method="POST" path="/api/internal/service/register"   desc="Enregistrer une instance — header: INTERNAL_SECRET — body: { id, serviceType, endpoint, domain, location, metrics }" />
          <EndpointRow method="POST" path="/api/internal/service/heartbeat"  desc="Heartbeat — body: { id, secret, metrics }" />
          <EndpointRow method="POST" path="/api/internal/service/deregister" desc="Arrêt gracieux — body: { id, secret }" />
          <EndpointRow method="GET"  path="/api/internal/service/list"       desc="Lister toutes les instances — header: X-Internal-Secret" />
        </div>
        <InfoCard color="red" title="Endpoints internes">
          Réservés aux microservices via <code>INTERNAL_SECRET</code>. Tout appel non autorisé retourne <code>401</code>.
          Ne jamais exposer ce secret côté client.
        </InfoCard>
      </div>
    </div>
  );
}



/* ─── Gateway WebSocket ─────────────────────────────────────── */
function GatewayWebSocketSection() {
  return (
    <div className="space-y-8">
      <PageHeader
        icon={WifiIcon}
        title="WebSocket — Socket.IO"
        description="Connexion temps réel via Socket.IO v4 — auth, rooms, heartbeat et gestion de la déconnexion."
      />

      <Card className="border border-border/60 bg-surface/40">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-[11px] font-semibold text-muted mb-1">URL WebSocket</p>
              <code className="font-mono text-sm font-bold text-accent">wss://gateway.alfychat.app</code>
            </div>
            <Separator orientation="vertical" className="hidden sm:block h-8" />
            <div>
              <p className="text-[11px] font-semibold text-muted mb-1">Librairie</p>
              <code className="font-mono text-sm font-bold">Socket.IO v4</code>
            </div>
            <Separator orientation="vertical" className="hidden sm:block h-8" />
            <div>
              <p className="text-[11px] font-semibold text-muted mb-1">Namespace bots</p>
              <code className="font-mono text-sm font-bold">/</code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connexion */}
      <div className="space-y-3">
        <SectionTitle>Connexion & authentification</SectionTitle>
        <p className="text-sm text-muted">
          Le token JWT est passé dans l&apos;option <code>auth</code> lors de la connexion.
          Le gateway le vérifie, charge le profil de l&apos;utilisateur, et émet <code>READY</code> en retour.
        </p>
        <CodeBlock lang="js" title="Connexion Socket.IO (utilisateur)" code={`import { io } from 'socket.io-client';

const socket = io('https://gateway.alfychat.app', {
  auth: { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

socket.on('connect',       () => console.log('✅ Connecté, id:', socket.id));
socket.on('disconnect',    (reason) => console.log('❌', reason));
socket.on('connect_error', (err) => console.error('Auth error:', err.message));

// Premier événement reçu après connexion réussie
socket.on('READY', (data) => {
  console.log('userId :', data.user.id);
  console.log('sessionId :', data.sessionId);
});`} />
        <CodeBlock lang="js" title="Connexion Socket.IO (bot)" code={`const socket = io('https://gateway.alfychat.app', {
  auth: { token: process.env.BOT_TOKEN, type: 'bot' },
});`} />
      </div>

      {/* READY event */}
      <div className="space-y-2">
        <SectionTitle>Événement READY</SectionTitle>
        <p className="text-xs text-muted">Reçu immédiatement après la connexion — contient l&apos;état initial de la session.</p>
        <CodeBlock lang="json" title="Payload READY" code={`{
  "user":      { "id": "u1a2b3c4-...", "username": "Alice", "avatarUrl": "..." },
  "sessionId": "s9z8y7x6-...",
  "servers":   [],
  "friends":   [],
  "conversations": []
}`} />
      </div>

      {/* Rooms */}
      <div className="space-y-2">
        <SectionTitle>Rooms Socket.IO</SectionTitle>
        <p className="text-xs text-muted">À la connexion, le gateway auto-rejoint les rooms suivantes :</p>
        <div className="overflow-hidden rounded-xl border border-border/60">
          {([
            { room: 'user:{userId}',              desc: 'Room personnelle — notifications directes (DM, demandes d\'ami, appels)' },
            { room: 'conversation:{convId}',      desc: 'Room d\'une conversation DM ou de groupe — auto-jointe pour toutes les convs existantes' },
            { room: 'server:{serverId}',          desc: 'Room d\'un serveur — events membres, rôles, channels' },
            { room: 'channel:{channelId}',        desc: 'Room d\'un channel textuel — messages du serveur' },
            { room: 'voice:{channelId}',          desc: 'Room vocale — signaling WebRTC entre participants' },
            { room: 'call:{callId}',              desc: 'Room d\'un appel — signaling offre/réponse/ICE' },
          ] as const).map((r, i) => (
            <div key={r.room} className={`flex items-start gap-3 px-4 py-3 ${i % 2 === 0 ? 'bg-background/20' : 'bg-surface/20'}`}>
              <code className="mt-0.5 shrink-0 font-mono text-xs font-bold text-accent">{r.room}</code>
              <span className="text-[11px] text-muted">{r.desc}</span>
            </div>
          ))}
        </div>
        <CodeBlock lang="js" title="Rejoindre une conversation manuellement" code={`// Rejoindre une conversation (DM ou groupe)
socket.emit('conversation:join', { conversationId: 'uuid-de-la-conv' });
// ou pour un nouveau DM avec un utilisateur :
socket.emit('conversation:join', { recipientId: 'user-id-du-destinataire' });

// Confirmation
socket.on('conversation:joined', ({ conversationId }) => {
  console.log('Rejoint :', conversationId);
});`} />
      </div>

      {/* Heartbeat */}
      <div className="space-y-2">
        <SectionTitle>Heartbeat</SectionTitle>
        <CodeBlock lang="js" title="Maintenir la connexion active (toutes les 30s)" code={`// Envoyer le heartbeat
socket.emit('HEARTBEAT');

// Réponse immédiate du serveur
socket.on('HEARTBEAT_ACK', ({ timestamp }) => {
  // timestamp = Date.now() côté serveur
});

// Automatiser
const hb = setInterval(() => socket.emit('HEARTBEAT'), 30_000);
socket.on('disconnect', () => clearInterval(hb));`} />
        <InfoCard color="amber" title="Délais de timeout">
          <code>pingInterval</code> = 25s · <code>pingTimeout</code> = 60s.
          Sans heartbeat, la connexion est terminée après <strong>60 secondes</strong> d&apos;inactivité.
        </InfoCard>
      </div>

      {/* Messages DM */}
      <div className="space-y-2">
        <SectionTitle>Envoyer un message (livraison optimiste)</SectionTitle>
        <p className="text-xs text-muted">
          L&apos;event <code>message:send</code> utilise une livraison optimiste — le message est diffusé
          immédiatement avant la sauvegarde en base. Un <code>message:failed</code> est émis en cas d&apos;erreur DB.
        </p>
        <CodeBlock lang="js" title="message:send (DM ou groupe)" code={`socket.emit('message:send', {
  conversationId: 'uuid-conversation',  // ou recipientId pour un DM
  recipientId:    'user-id',            // optionnel — crée le convId déterministe
  content:        'Salut !',
  replyToId:      'msg-id',             // optionnel
  // Chiffrement E2EE (optionnel) :
  senderContent:  'contenu chiffré pour le destinataire',
  e2eeType:       1,
});

// Confirmation immédiate (avant DB)
socket.on('message:sent', ({ message }) => {
  console.log('Envoyé (optimiste) :', message.id);
});

// Disponible pour tous les participants
socket.on('message:new', (message) => {
  console.log(message.sender.username, ':', message.content);
});

// En cas d'échec DB
socket.on('message:failed', ({ messageId, error }) => {
  console.error('Échec sauvegarde :', messageId, error);
});`} />
      </div>

      {/* Rate limiting WS */}
      <div className="space-y-2">
        <SectionTitle>Rate limiting WebSocket</SectionTitle>
        <div className="overflow-hidden rounded-xl border border-border/60">
          {([
            { event: 'message:send', limit: '5 messages / 5 secondes', note: 'Par utilisateur' },
          ] as const).map((r) => (
            <div key={r.event} className="flex items-start gap-3 px-4 py-3 bg-background/20">
              <code className="mt-0.5 shrink-0 font-mono text-xs font-bold text-accent">{r.event}</code>
              <code className="text-xs text-amber-400">{r.limit}</code>
              <span className="text-[11px] text-muted">{r.note}</span>
            </div>
          ))}
        </div>
        <CodeBlock lang="json" title="Réponse en cas de rate limit" code={`// event : message:error
{
  "error": "RATE_LIMITED",
  "message": "Trop de messages envoyés. Calme-toi !"
}`} />
      </div>

      {/* Reconnexion */}
      <div className="space-y-2">
        <SectionTitle>Reconnexion & CALL_REJOIN</SectionTitle>
        <CodeBlock lang="js" title="Gestion de la reconnexion" code={`socket.on('disconnect', (reason) => {
  console.log('Déconnecté :', reason);
  // Socket.IO tente la reconnexion automatique
  // Vos rooms sont restaurées automatiquement à la reconnexion
});

socket.on('connect', () => {
  // Si vous étiez dans un appel, rejoindre à nouveau la call room
  if (currentCallId) {
    socket.emit('CALL_REJOIN', { callId: currentCallId });
  }
});`} />
      </div>
    </div>
  );
}

/* ─── Gateway Overview ─────────────────────────────────────── */
function GatewayOverviewSection() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={GlobeIcon}
        title="Vue d'ensemble"
        description="Le Gateway est le point d'entrée unique vers toute l'API AlfyChat — HTTP REST et WebSocket Socket.IO."
      />

      <Card className="border border-border/60 bg-surface/40">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-[11px] font-semibold text-muted mb-1">Base URL</p>
              <code className="font-mono text-sm font-bold text-accent">https://gateway.alfychat.app</code>
            </div>
            <Separator orientation="vertical" className="hidden sm:block h-8" />
            <div>
              <p className="text-[11px] font-semibold text-muted mb-1">Préfixe REST</p>
              <code className="font-mono text-sm font-bold">/api</code>
            </div>
            <Separator orientation="vertical" className="hidden sm:block h-8" />
            <div>
              <p className="text-[11px] font-semibold text-muted mb-1">WebSocket</p>
              <code className="font-mono text-sm font-bold">Socket.IO v4</code>
            </div>
            <Separator orientation="vertical" className="hidden sm:block h-8" />
            <div>
              <p className="text-[11px] font-semibold text-muted mb-1">Content-Type</p>
              <code className="font-mono text-sm font-bold">application/json</code>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <SectionTitle>Architecture microservices</SectionTitle>
        <div className="overflow-hidden rounded-xl border border-border/60">
          {([
            { name: 'gateway',  port: '3000', desc: 'Point d\'entrée — routing, auth, rate limiting' },
            { name: 'users',    port: '3001', desc: 'Comptes, profils, présence, paramètres' },
            { name: 'messages', port: '3002', desc: 'Historique et CRUD des messages' },
            { name: 'friends',  port: '3003', desc: 'Demandes d\'amis, liste de contacts, blocages' },
            { name: 'calls',    port: '3004', desc: 'Appels audio/vidéo WebRTC' },
            { name: 'servers',  port: '3005', desc: 'Serveurs, salons, membres, rôles' },
            { name: 'bots',     port: '3006', desc: 'Gestion et authentification des bots' },
            { name: 'media',    port: '3007', desc: 'Upload, stockage et CDN des médias' },
          ] as const).map((svc, i) => (
            <div key={svc.name} className={cn('flex items-center gap-4 px-4 py-3', i % 2 === 0 ? 'bg-background/20' : 'bg-surface/20')}>
              <code className="w-20 shrink-0 font-mono text-xs font-bold text-accent">{svc.name}</code>
              <code className="w-14 shrink-0 font-mono text-[10px] text-muted">:{svc.port}</code>
              <span className="text-[11px] text-muted">{svc.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <SectionTitle>Headers communs</SectionTitle>
        <CodeBlock lang="http" title="Requêtes authentifiées" code={`# Utilisateur (JWT Bearer)
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

# Bot
Authorization: Bot abc123...64hexchars
Content-Type: application/json`} />
      </div>

      <InfoCard color="blue" title="CORS">
        Le gateway accepte les requêtes cross-origin depuis <code>https://alfychat.app</code> et
        <code> http://localhost:*</code>. Pour les intégrations depuis un domaine tiers, utilisez
        un proxy serveur ou contactez l'équipe pour ajouter votre domaine à la liste blanche.
      </InfoCard>
    </div>
  );
}

/* ─── Gateway Auth ──────────────────────────────────────────── */
function GatewayAuthSection() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={LockIcon}
        title="Authentification Gateway"
        description="Les utilisateurs s'authentifient via JWT Bearer. Les bots ont leur propre token dédié."
      />

      <div className="space-y-2">
        <SectionTitle>Connexion utilisateur</SectionTitle>
        <EndpointRow method="POST" path="/api/auth/login" desc="Retourne un JWT (15 min) et un refresh token (1 an)" />
        <MultiCodeBlock title="POST /api/auth/login" examples={EX.gatewayLogin} />
      </div>

      <div className="space-y-2">
        <SectionTitle>Réponse</SectionTitle>
        <CodeBlock lang="json" title="200 OK" code={`{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",  // JWT, 15 minutes
  "refreshToken": "a1b2c3d4e5f6...",                     // 1 an (365 jours)
  "user": {
    "id":         "u1a2b3c4-...",
    "username":   "Alice",
    "email":      "alice@example.com",
    "avatar":     "https://media.alfychat.app/avatars/...",
    "isVerified": true
  }
}`} />
      </div>

      <div className="space-y-2">
        <SectionTitle>Utiliser le JWT</SectionTitle>
        <CodeBlock lang="http" title="Requête protégée" code={`GET /api/users/me HTTP/1.1
Host: gateway.alfychat.app
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`} />
      </div>

      <div className="space-y-2">
        <SectionTitle>Refresh du token</SectionTitle>
        <EndpointRow method="POST" path="/api/auth/refresh" desc="Obtenir un nouveau JWT via le refresh token" />
        <CodeBlock lang="json" title="POST /api/auth/refresh" code={`// Corps de la requête
{ "refreshToken": "a1b2c3d4e5f6..." }

// Réponse 200
{
  "token":        "nouveau.jwt.ici",
  "refreshToken": "nouveau.refresh.token"
}`} />
      </div>

      <div className="space-y-2">
        <SectionTitle>Autres endpoints auth</SectionTitle>
        <div className="space-y-1.5">
          <EndpointRow method="POST"  path="/api/auth/register"       desc="Créer un nouveau compte utilisateur" />
          <EndpointRow method="POST"  path="/api/auth/logout"         desc="Invalider la session (refresh token révoqué)" />
          <EndpointRow method="GET"   path="/api/users/me"            desc="Profil de l'utilisateur connecté" />
          <EndpointRow method="PATCH" path="/api/users/me"            desc="Modifier le profil (username, avatar, bio, statut)" />
          <EndpointRow method="POST"  path="/api/bots/authenticate"   desc="Vérifier et authentifier un token bot" />
        </div>
      </div>

      <InfoCard color="red" title="Sécurité des tokens">
        <ul className="list-disc space-y-0.5 pl-4">
          <li>Stockez le JWT en mémoire ou dans un cookie <code>HttpOnly</code> (pas localStorage)</li>
          <li>Un JWT expiré retourne <code>401 Unauthorized</code> — rafraîchissez-le avant expiration</li>
          <li>En cas de compromission du refresh token, appelez <code>/logout</code> pour le révoquer</li>
        </ul>
      </InfoCard>
    </div>
  );
}

/* ─── Gateway Events ────────────────────────────────────────── */
function GatewayEventsSection() {
  return (
    <div className="space-y-8">
      <PageHeader
        icon={ZapIcon}
        title="Référence des événements Socket.IO"
        description="Tous les events client → serveur et serveur → client — payload exact, callback, et exemples de code."
        badge="80+"
      />

      <MultiCodeBlock title="Écouter les événements — exemple complet" examples={EX.gatewayEventsListen} />

      {/* ═══ CLIENT → SERVEUR ════════════════════════════════════ */}
      <div className="space-y-3">
        <SectionTitle>Événements émis par le client (client → serveur)</SectionTitle>

        {/* ── Connexion / Session ── */}
        <h4 className="text-xs font-bold text-muted uppercase tracking-widest">Connexion & session</h4>
        <EventTable color="blue" events={[
          { event: 'HEARTBEAT',        payload: '—',                                            cb: 'HEARTBEAT_ACK → { timestamp }',                     desc: 'Maintenir la connexion active (toutes les 30s)' },
          { event: 'PRESENCE_UPDATE',  payload: '{ status, customStatus? }',                    cb: '—',                                                 desc: '"online" | "idle" | "dnd" | "invisible"' },
          { event: 'PROFILE_UPDATE',   payload: '{ username?, displayName?, avatarUrl?, bio? }', cb: '—',                                                 desc: 'Met à jour le profil et notifie les amis/serveurs' },
          { event: 'GET_BULK_PRESENCE',payload: '{ userIds: string[] }',                        cb: '{ presences: Record<userId, PresenceState> }',       desc: 'Récupérer la présence de plusieurs utilisateurs' },
        ]} />

        {/* ── DM ── */}
        <h4 className="mt-4 text-xs font-bold text-muted uppercase tracking-widest">Messages directs & conversations</h4>
        <EventTable color="blue" events={[
          { event: 'conversation:join',   payload: '{ conversationId?, recipientId? }',                  cb: 'conversation:joined → { conversationId }',  desc: 'Rejoindre une conversation DM (crée le convId déterministe si besoin)' },
          { event: 'message:send',        payload: '{ conversationId, recipientId?, content, replyToId?, senderContent?, e2eeType? }', cb: 'message:sent → { message }',  desc: 'Envoyer un message DM (livraison optimiste)' },
          { event: 'message:edit',        payload: '{ messageId, content }',                              cb: '—',                                         desc: 'Modifier un message' },
          { event: 'message:delete',      payload: '{ messageId, conversationId? }',                      cb: '—',                                         desc: 'Supprimer un message' },
          { event: 'TYPING_START',        payload: '{ conversationId }',                                  cb: '—',                                         desc: 'Afficher l\'indicateur "en train d\'écrire"' },
          { event: 'TYPING_STOP',         payload: '{ conversationId }',                                  cb: '—',                                         desc: 'Masquer l\'indicateur de frappe' },
          { event: 'REACTION_ADD',        payload: '{ messageId, conversationId, emoji }',                cb: '—',                                         desc: 'Ajouter une réaction à un DM' },
          { event: 'REACTION_REMOVE',     payload: '{ messageId, conversationId, emoji }',                cb: '—',                                         desc: 'Retirer une réaction d\'un DM' },
        ]} />

        {/* ── Archive DM ── */}
        <h4 className="mt-4 text-xs font-bold text-muted uppercase tracking-widest">Archive DM (P2P)</h4>
        <EventTable color="blue" events={[
          { event: 'DM_ARCHIVE_REQUEST',       payload: '{ conversationId, before, limit }',              cb: '—',                                         desc: 'Demander des messages archivés à l\'autre pair en ligne' },
          { event: 'DM_ARCHIVE_PEER_RESPONSE', payload: '{ conversationId, messages[], archiveLogId }',   cb: '—',                                         desc: 'Répondre à une demande d\'archive d\'un pair' },
          { event: 'DM_ARCHIVE_CONFIRM',       payload: '{ conversationId, archiveLogId }',               cb: '—',                                         desc: 'Confirmer la réception d\'une archive' },
          { event: 'DM_ARCHIVE_STATUS',        payload: '{ conversationId }',                             cb: '{ status: ArchiveStatus }',                  desc: 'Demander le statut d\'archive d\'une conversation' },
        ]} />

        {/* ── Amis ── */}
        <h4 className="mt-4 text-xs font-bold text-muted uppercase tracking-widest">Amis</h4>
        <EventTable color="blue" events={[
          { event: 'FRIEND_REQUEST', payload: '{ toUserId, message? }',        cb: '—', desc: 'Envoyer une demande d\'ami' },
          { event: 'FRIEND_ACCEPT',  payload: '{ requestId }',                 cb: '—', desc: 'Accepter une demande d\'ami' },
        ]} />

        {/* ── Appels WebRTC ── */}
        <h4 className="mt-4 text-xs font-bold text-muted uppercase tracking-widest">Appels (WebRTC)</h4>
        <EventTable color="blue" events={[
          { event: 'CALL_INITIATE',        payload: '{ type, recipientId?, conversationId?, channelId? }', cb: '(callId: string)',                           desc: '"audio" | "video" | "channel" — callback avec l\'ID d\'appel' },
          { event: 'CALL_ACCEPT',          payload: '{ callId }',                                          cb: '—',                                         desc: 'Accepter un appel entrant' },
          { event: 'CALL_REJECT',          payload: '{ callId }',                                          cb: '—',                                         desc: 'Refuser un appel entrant' },
          { event: 'CALL_END',             payload: '{ callId }',                                          cb: '—',                                         desc: 'Terminer un appel en cours' },
          { event: 'CALL_REJOIN',          payload: '{ callId }',                                          cb: '—',                                         desc: 'Rejoindre un appel après reconnexion WebSocket' },
          { event: 'WEBRTC_OFFER',         payload: '{ callId, offer: RTCSessionDescription }',            cb: '—',                                         desc: 'Signaling — envoyer l\'offer SDP' },
          { event: 'WEBRTC_ANSWER',        payload: '{ callId, answer: RTCSessionDescription }',           cb: '—',                                         desc: 'Signaling — répondre à une offer SDP' },
          { event: 'WEBRTC_ICE_CANDIDATE', payload: '{ callId, candidate: RTCIceCandidate }',              cb: '—',                                         desc: 'Signaling — partager un candidat ICE' },
        ]} />

        {/* ── Voice (serveur) ── */}
        <h4 className="mt-4 text-xs font-bold text-muted uppercase tracking-widest">Canaux vocaux (serveurs)</h4>
        <EventTable color="blue" events={[
          { event: 'VOICE_JOIN',          payload: '{ serverId, channelId }',                               cb: '—',                                         desc: 'Rejoindre un canal vocal' },
          { event: 'VOICE_LEAVE',         payload: '{ serverId, channelId }',                               cb: '—',                                         desc: 'Quitter un canal vocal' },
          { event: 'VOICE_STATE_UPDATE',  payload: '{ channelId, muted, deafened }',                        cb: '—',                                         desc: 'Mettre à jour son état micro/casque' },
          { event: 'VOICE_OFFER',         payload: '{ channelId, targetUserId, offer }',                    cb: '—',                                         desc: 'Signaling vocal — offer vers un participant' },
          { event: 'VOICE_ANSWER',        payload: '{ channelId, targetUserId, answer }',                   cb: '—',                                         desc: 'Signaling vocal — answer vers un participant' },
          { event: 'VOICE_ICE_CANDIDATE', payload: '{ channelId, targetUserId, candidate }',                cb: '—',                                         desc: 'Signaling vocal — candidat ICE' },
          { event: 'GET_VOICE_STATE',     payload: '{ serverId }',                                          cb: '{ voiceStates: VoiceState[] }',              desc: 'Récupérer les états vocaux d\'un serveur' },
        ]} />

        {/* ── Serveurs — messages ── */}
        <h4 className="mt-4 text-xs font-bold text-muted uppercase tracking-widest">Messages de serveur</h4>
        <EventTable color="blue" events={[
          { event: 'SERVER_MESSAGE_SEND',      payload: '{ serverId, channelId, content, replyToId? }',      cb: '—',                                         desc: 'Envoyer un message dans un salon de serveur' },
          { event: 'SERVER_MESSAGE_EDIT',      payload: '{ serverId, channelId, messageId, content }',        cb: '—',                                         desc: 'Modifier un message de serveur' },
          { event: 'SERVER_MESSAGE_DELETE',    payload: '{ serverId, channelId, messageId }',                 cb: '—',                                         desc: 'Supprimer un message de serveur' },
          { event: 'SERVER_MESSAGE_HISTORY',   payload: '{ serverId, channelId, before?, limit? }',           cb: '{ messages[] }',                            desc: 'Récupérer l\'historique (100 max, paginer avec before)' },
          { event: 'SERVER_REACTION_ADD',      payload: '{ serverId, channelId, messageId, emoji }',          cb: '—',                                         desc: 'Ajouter une réaction dans un serveur' },
          { event: 'SERVER_REACTION_REMOVE',   payload: '{ serverId, channelId, messageId, emoji }',          cb: '—',                                         desc: 'Retirer une réaction dans un serveur' },
          { event: 'SERVER_TYPING_START',      payload: '{ serverId, channelId }',                            cb: '—',                                         desc: 'Afficher l\'indicateur de frappe dans un salon' },
          { event: 'SERVER_TYPING_STOP',       payload: '{ serverId, channelId }',                            cb: '—',                                         desc: 'Masquer l\'indicateur de frappe' },
        ]} />

        {/* ── Serveurs — gestion ── */}
        <h4 className="mt-4 text-xs font-bold text-muted uppercase tracking-widest">Gestion des serveurs & membres</h4>
        <EventTable color="blue" events={[
          { event: 'SERVER_JOIN',      payload: '{ serverId }',                                           cb: '—',                                         desc: 'Rejoindre un serveur existant (room auto-join)' },
          { event: 'SERVER_LEAVE',     payload: '{ serverId }',                                           cb: '—',                                         desc: 'Quitter un serveur' },
          { event: 'SERVER_INFO',      payload: '{ serverId }',                                           cb: '{ server: ServerDetails }',                 desc: 'Récupérer les infos complètes d\'un serveur' },
          { event: 'SERVER_GET_CHANNELS', payload: '{ serverId }',                                        cb: '{ channels[] }',                            desc: 'Lister les canaux d\'un serveur' },
          { event: 'MEMBER_LIST',      payload: '{ serverId }',                                           cb: '{ members[] }',                             desc: 'Lister les membres d\'un serveur' },
          { event: 'MEMBER_UPDATE',    payload: '{ serverId, targetUserId, roleIds[], nickname? }',        cb: '{ member }',                                desc: 'Modifier le rôle ou le pseudo d\'un membre' },
          { event: 'MEMBER_KICK',      payload: '{ serverId, targetUserId, reason? }',                    cb: '—',                                         desc: 'Exclure un membre (permission requis)' },
          { event: 'MEMBER_BAN',       payload: '{ serverId, targetUserId, reason? }',                    cb: '—',                                         desc: 'Bannir un membre' },
        ]} />

        {/* ── Canaux ── */}
        <h4 className="mt-4 text-xs font-bold text-muted uppercase tracking-widest">Canaux</h4>
        <EventTable color="blue" events={[
          { event: 'CHANNEL_CREATE',  payload: '{ serverId, name, type }',                               cb: '—',                                         desc: 'Créer un canal dans un serveur' },
          { event: 'CHANNEL_UPDATE',  payload: '{ serverId, channelId, name?, position? }',               cb: '—',                                         desc: 'Modifier un canal' },
          { event: 'CHANNEL_DELETE',  payload: '{ serverId, channelId }',                                 cb: '—',                                         desc: 'Supprimer un canal' },
        ]} />

        {/* ── Rôles ── */}
        <h4 className="mt-4 text-xs font-bold text-muted uppercase tracking-widest">Rôles</h4>
        <EventTable color="blue" events={[
          { event: 'ROLE_LIST',    payload: '{ serverId }',                                              cb: '{ roles[] }',                               desc: 'Lister les rôles d\'un serveur' },
          { event: 'ROLE_CREATE',  payload: '{ serverId, name, color?, permissions? }',                  cb: '—',                                         desc: 'Créer un rôle' },
          { event: 'ROLE_UPDATE',  payload: '{ serverId, roleId, name?, color?, permissions? }',          cb: '—',                                         desc: 'Modifier un rôle' },
          { event: 'ROLE_DELETE',  payload: '{ serverId, roleId }',                                      cb: '—',                                         desc: 'Supprimer un rôle' },
        ]} />

        {/* ── Invitations ── */}
        <h4 className="mt-4 text-xs font-bold text-muted uppercase tracking-widest">Invitations</h4>
        <EventTable color="blue" events={[
          { event: 'INVITE_LIST',    payload: '{ serverId }',                                            cb: '{ invites[] }',                             desc: 'Lister les invitations actives' },
          { event: 'INVITE_CREATE',  payload: '{ serverId, maxUses?, expiresIn? }',                      cb: '{ invite }',                                desc: 'Créer un lien d\'invitation' },
          { event: 'INVITE_DELETE',  payload: '{ serverId, code }',                                      cb: '—',                                         desc: 'Révoquer une invitation' },
          { event: 'INVITE_VERIFY',  payload: '{ code }',                                                cb: '{ valid, server? }',                        desc: 'Vérifier un code d\'invitation' },
        ]} />

        {/* ── Groupes ── */}
        <h4 className="mt-4 text-xs font-bold text-muted uppercase tracking-widest">Groupes (DM multi)</h4>
        <EventTable color="blue" events={[
          { event: 'GROUP_CREATE',  payload: '{ name, memberIds[] }',                                    cb: '{ group }',                                 desc: 'Créer un groupe' },
          { event: 'GROUP_UPDATE',  payload: '{ groupId, name?, avatarUrl? }',                           cb: '—',                                         desc: 'Modifier un groupe' },
          { event: 'GROUP_LEAVE',   payload: '{ groupId }',                                              cb: '—',                                         desc: 'Quitter un groupe' },
          { event: 'GROUP_DELETE',  payload: '{ groupId }',                                              cb: '—',                                         desc: 'Supprimer un groupe (propriétaire uniquement)' },
        ]} />
      </div>

      {/* ═══ SERVEUR → CLIENT ════════════════════════════════════ */}
      <div className="space-y-3">
        <SectionTitle>Événements reçus (serveur → client)</SectionTitle>

        {/* ── Init ── */}
        <h4 className="text-xs font-bold text-muted uppercase tracking-widest">Connexion & session</h4>
        <EventTable color="accent" events={[
          { event: 'READY',           payload: '{ user, sessionId, servers[], friends[], conversations[] }', cb: '—', desc: 'État initial de la session, émis juste après la connexion' },
          { event: 'HEARTBEAT_ACK',   payload: '{ timestamp }',                                              cb: '—', desc: 'Accusé de réception du heartbeat' },
          { event: 'PENDING_PINGS',   payload: '{ pings: Notification[] }',                                  cb: '—', desc: 'Notifications manquées reçues lors de la reconnexion' },
          { event: 'PRESENCE_UPDATE', payload: '{ userId, status, customStatus? }',                          cb: '—', desc: 'Changement de statut d\'un ami (online/idle/dnd/invisible)' },
          { event: 'PROFILE_UPDATE',  payload: '{ userId, username?, displayName?, avatarUrl?, bio? }',      cb: '—', desc: 'Mise à jour de profil d\'un utilisateur dans nos serveurs/amis' },
        ]} />

        {/* ── DM messages ── */}
        <h4 className="mt-4 text-xs font-bold text-muted uppercase tracking-widest">Messages directs</h4>
        <EventTable color="accent" events={[
          { event: 'message:new',       payload: '{ id, conversationId, sender, content, replyTo?, createdAt, reactions[] }', cb: '—', desc: 'Nouveau DM reçu (et copie pour l\'expéditeur)' },
          { event: 'message:sent',      payload: '{ message }',                                                               cb: '—', desc: 'Confirmation d\'envoi optimiste pour l\'expéditeur' },
          { event: 'message:edited',    payload: '{ id, conversationId, content, editedAt }',                                 cb: '—', desc: 'DM modifié' },
          { event: 'message:deleted',   payload: '{ id, conversationId }',                                                    cb: '—', desc: 'DM supprimé' },
          { event: 'message:failed',    payload: '{ messageId, error }',                                                      cb: '—', desc: 'Échec sauvegarde (livraison optimiste)' },
          { event: 'TYPING_START',      payload: '{ userId, conversationId }',                                                cb: '—', desc: 'Indicateur de frappe dans un DM' },
          { event: 'TYPING_STOP',       payload: '{ userId, conversationId }',                                                cb: '—', desc: 'Fin de l\'indicateur dans un DM' },
        ]} />

        {/* ── Archive DM ── */}
        <h4 className="mt-4 text-xs font-bold text-muted uppercase tracking-widest">Archive DM (P2P)</h4>
        <EventTable color="accent" events={[
          { event: 'DM_ARCHIVE_PUSH',          payload: '{ conversationId, messages[], total }',              cb: '—', desc: 'Messages archivés envoyés par un pair (réponse à DM_ARCHIVE_REQUEST)' },
          { event: 'DM_ARCHIVE_PEER_REQUEST',  payload: '{ conversationId, before, limit, fromUserId }',      cb: '—', desc: 'Un pair demande vos archives — répondre avec DM_ARCHIVE_PEER_RESPONSE' },
          { event: 'DM_ARCHIVE_RESPONSE',      payload: '{ conversationId, status }',                         cb: '—', desc: 'Statut de réponse à une demande (from server)' },
        ]} />

        {/* ── Amis ── */}
        <h4 className="mt-4 text-xs font-bold text-muted uppercase tracking-widest">Amis</h4>
        <EventTable color="accent" events={[
          { event: 'FRIEND_REQUEST',  payload: '{ requestId, from: { id, username, avatarUrl } }', cb: '—', desc: 'Demande d\'ami reçue' },
          { event: 'FRIEND_ACCEPT',   payload: '{ requestId, friend: { id, username, avatarUrl } }', cb: '—', desc: 'Votre demande d\'ami a été acceptée' },
          { event: 'FRIEND_REMOVE',   payload: '{ userId }',                                         cb: '—', desc: 'Ami supprimé ou vous avez été retiré' },
        ]} />

        {/* ── Appels ── */}
        <h4 className="mt-4 text-xs font-bold text-muted uppercase tracking-widest">Appels WebRTC</h4>
        <EventTable color="accent" events={[
          { event: 'CALL_INCOMING',          payload: '{ callId, type, from: { id, username, avatarUrl } }', cb: '—', desc: 'Appel entrant (accepter avec CALL_ACCEPT)' },
          { event: 'CALL_ACCEPT',            payload: '{ callId, userId }',                                  cb: '—', desc: 'Un participant a accepté l\'appel' },
          { event: 'CALL_REJECT',            payload: '{ callId, userId }',                                  cb: '—', desc: 'Un participant a refusé l\'appel' },
          { event: 'CALL_END',               payload: '{ callId }',                                          cb: '—', desc: 'Appel terminé' },
          { event: 'CALL_PARTICIPANT_JOINED',payload: '{ callId, userId, username }',                        cb: '—', desc: 'Nouveau participant dans l\'appel' },
          { event: 'CALL_PEER_RECONNECTED',  payload: '{ callId, userId }',                                  cb: '—', desc: 'Un participant a reconnecté après perte de connexion' },
          { event: 'WEBRTC_OFFER',           payload: '{ callId, offer, from: userId }',                     cb: '—', desc: 'Offer SDP reçue d\'un pair' },
          { event: 'WEBRTC_ANSWER',          payload: '{ callId, answer, from: userId }',                    cb: '—', desc: 'Answer SDP reçue d\'un pair' },
          { event: 'WEBRTC_ICE_CANDIDATE',   payload: '{ callId, candidate, from: userId }',                 cb: '—', desc: 'Candidat ICE reçu' },
        ]} />

        {/* ── Voice ── */}
        <h4 className="mt-4 text-xs font-bold text-muted uppercase tracking-widest">Canaux vocaux</h4>
        <EventTable color="accent" events={[
          { event: 'VOICE_USER_JOINED',   payload: '{ channelId, userId, username }',              cb: '—', desc: 'Un utilisateur a rejoint le canal vocal' },
          { event: 'VOICE_USER_LEFT',     payload: '{ channelId, userId }',                        cb: '—', desc: 'Un utilisateur a quitté le canal vocal' },
          { event: 'VOICE_STATE_UPDATE',  payload: '{ channelId, userId, muted, deafened }',       cb: '—', desc: 'Changement d\'état micro/casque d\'un participant' },
          { event: 'VOICE_OFFER',         payload: '{ channelId, from: userId, offer }',           cb: '—', desc: 'Signaling vocal — offer' },
          { event: 'VOICE_ANSWER',        payload: '{ channelId, from: userId, answer }',          cb: '—', desc: 'Signaling vocal — answer' },
          { event: 'VOICE_ICE_CANDIDATE', payload: '{ channelId, from: userId, candidate }',       cb: '—', desc: 'Signaling vocal — candidat ICE' },
        ]} />

        {/* ── Serveur messages ── */}
        <h4 className="mt-4 text-xs font-bold text-muted uppercase tracking-widest">Messages de serveur</h4>
        <EventTable color="accent" events={[
          { event: 'SERVER_TYPING_START',    payload: '{ serverId, channelId, userId }',                    cb: '—', desc: 'Frappe en cours dans un canal de serveur' },
          { event: 'SERVER_TYPING_STOP',     payload: '{ serverId, channelId, userId }',                    cb: '—', desc: 'Fin frappe dans un canal' },
        ]} />

        {/* ── Serveur gestion ── */}
        <h4 className="mt-4 text-xs font-bold text-muted uppercase tracking-widest">Membres & structure</h4>
        <EventTable color="accent" events={[
          { event: 'MEMBER_JOIN',       payload: '{ serverId, member: { userId, username, roles[] } }',      cb: '—', desc: 'Nouveau membre arrivé dans un serveur' },
          { event: 'CHANNEL_CREATE',    payload: '{ serverId, channel: { id, name, type } }',                cb: '—', desc: 'Nouveau canal créé dans un serveur' },
          { event: 'CHANNEL_UPDATE',    payload: '{ serverId, channel }',                                    cb: '—', desc: 'Canal modifié' },
          { event: 'CHANNEL_DELETE',    payload: '{ serverId, channelId }',                                  cb: '—', desc: 'Canal supprimé' },
          { event: 'ROLE_CREATE',       payload: '{ serverId, role }',                                       cb: '—', desc: 'Rôle créé' },
          { event: 'ROLE_UPDATE',       payload: '{ serverId, role }',                                       cb: '—', desc: 'Rôle modifié' },
          { event: 'ROLE_DELETE',       payload: '{ serverId, roleId }',                                     cb: '—', desc: 'Rôle supprimé' },
        ]} />
      </div>

      {/* Exemples */}
      <div className="space-y-3">
        <SectionTitle>Exemples de code</SectionTitle>
        <CodeBlock lang="js" title="Appel WebRTC — initiation + signaling" code={`// 1. Initier un appel (callback avec l'id de l'appel)
socket.emit('CALL_INITIATE', { type: 'video', recipientId: 'user-uuid' }, (callId) => {
  console.log('Appel créé :', callId);
});

// 2. L'autre end reçoit
socket.on('CALL_INCOMING', ({ callId, from }) => {
  const accept = window.confirm(\`Appel de \${from.username} ?\`);
  socket.emit(accept ? 'CALL_ACCEPT' : 'CALL_REJECT', { callId });
});

// 3. Signaling WebRTC (après CALL_ACCEPT)
const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.alfychat.app' }] });

pc.onicecandidate = ({ candidate }) => {
  if (candidate) socket.emit('WEBRTC_ICE_CANDIDATE', { callId, candidate });
};

const offer = await pc.createOffer();
await pc.setLocalDescription(offer);
socket.emit('WEBRTC_OFFER', { callId, offer });

socket.on('WEBRTC_ANSWER', async ({ answer }) => {
  await pc.setRemoteDescription(new RTCSessionDescription(answer));
});
socket.on('WEBRTC_ICE_CANDIDATE', async ({ candidate }) => {
  await pc.addIceCandidate(new RTCIceCandidate(candidate));
});`} />
        <CodeBlock lang="js" title="Canal vocal de serveur — rejoindre + signaling" code={`// Rejoindre le canal vocal
socket.emit('VOICE_JOIN', { serverId: 'srv-uuid', channelId: 'ch-uuid' });

socket.on('VOICE_USER_JOINED', async ({ channelId, userId }) => {
  // Créer une connexion WebRTC par participant
  const pc = createPeerConnectionFor(userId);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit('VOICE_OFFER', { channelId, targetUserId: userId, offer });
});

socket.on('VOICE_OFFER',  async ({ from, offer }) => {
  const pc = getOrCreatePC(from);
  await pc.setRemoteDescription(offer);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit('VOICE_ANSWER', { channelId: 'ch-uuid', targetUserId: from, answer });
});`} />
        <CodeBlock lang="js" title="Commandes de serveur avec callback" code={`// Historique paginé
socket.emit('SERVER_MESSAGE_HISTORY',
  { serverId: 'srv-id', channelId: 'ch-id', limit: 50 },
  ({ messages }) => {
    messages.forEach(m => console.log(m.author.username, ':', m.content));
  }
);

// Mettre à jour un membre (rôle)
socket.emit('MEMBER_UPDATE',
  { serverId: 'srv-id', targetUserId: 'usr-id', roleIds: ['role-id-1'] },
  ({ member }) => console.log('Rôle mis à jour :', member)
);`} />
      </div>

      <InfoCard color="blue" title="Heartbeat obligatoire">
        Sans <code>HEARTBEAT</code> toutes les <strong>30 secondes</strong>, la connexion est
        coupée après <strong>60 secondes</strong> d&apos;inactivité (<code>pingTimeout</code>).
        Le serveur répond avec <code>HEARTBEAT_ACK &#123; timestamp &#125;</code>.
      </InfoCard>
    </div>
  );
}

/* Helper interne — table d'événements */
function EventTable({
  events,
  color = 'blue',
}: {
  events: { event: string; payload: string; cb: string; desc: string }[];
  color?: 'blue' | 'accent';
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      {events.map((ev, i) => (
        <div
          key={ev.event}
          className={cn(
            'grid grid-cols-[minmax(180px,auto)_1fr] items-start gap-3 px-4 py-3',
            i % 2 === 0 ? 'bg-background/20' : 'bg-surface/20',
          )}
        >
          <code
            className={cn(
              'mt-0.5 font-mono text-xs font-bold whitespace-nowrap',
              color === 'accent' ? 'text-accent' : 'text-blue-400',
            )}
          >
            {ev.event}
          </code>
          <div className="min-w-0 space-y-0.5">
            <code className="block font-mono text-[10px] text-violet-400/80 break-all">{ev.payload}</code>
            {ev.cb !== '—' && (
              <code className="block font-mono text-[10px] text-amber-400/80 break-all">↩ {ev.cb}</code>
            )}
            <span className="text-[11px] text-muted">{ev.desc}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  Map des sections                                          */
/* ═══════════════════════════════════════════════════════════ */

const SECTIONS = {
  /* ── Bots AlfyChat ─────────────────────────────────────── */
  'bots-introduction':  { title: 'Introduction',        icon: BotIcon,          Component: IntroductionSection   },
  'bots-creation':      { title: 'Créer un Bot',         icon: PlusIcon,         Component: BotCreationSection    },
  'bots-auth':          { title: 'Authentification',     icon: KeyIcon,          Component: AuthSection           },
  'bots-messages':      { title: 'Envoyer des messages', icon: MessageCircleIcon,Component: BotMessagesSection    },
  'bots-commands':      { title: 'Commandes',            icon: TerminalIcon,     Component: CommandsSection       },
  'bots-permissions':   { title: 'Permissions',          icon: ShieldCheckIcon,  Component: BotPermissionsSection },
  'bots-certification': { title: 'Certification',        icon: TagIcon,          Component: CertificationSection  },
  /* ── Gateway API ───────────────────────────────────────── */
  'gateway-overview':   { title: "Vue d'ensemble",       icon: GlobeIcon,        Component: GatewayOverviewSection},
  'gateway-auth':       { title: 'Authentification',     icon: LockIcon,         Component: GatewayAuthSection    },
  'gateway-rest':          { title: 'Référence REST',            icon: CodeIcon,          Component: GatewayRestSection         },
  'gateway-rest-auth':     { title: 'Auth & RGPD',              icon: KeyIcon,           Component: GatewayRestAuthSection     },
  'gateway-rest-users':    { title: 'Utilisateurs',             icon: BookOpenIcon,      Component: GatewayRestUsersSection    },
  'gateway-rest-messages': { title: 'Messages & Conversations', icon: MessageCircleIcon, Component: GatewayRestMessagesSection },
  'gateway-rest-friends':  { title: 'Amis & Appels',            icon: UserPlusIcon,      Component: GatewayRestFriendsSection  },
  'gateway-rest-servers':  { title: 'Serveurs',                 icon: ServerIcon,        Component: GatewayRestServersSection  },
  'gateway-rest-bots':     { title: 'Bots',                     icon: BotIcon,           Component: GatewayRestBotsSection     },
  'gateway-rest-media':    { title: 'Médias',                   icon: TerminalIcon,      Component: GatewayRestMediaSection    },
  'gateway-rest-admin':    { title: 'Admin & Monitoring',       icon: ShieldCheckIcon,   Component: GatewayRestAdminSection    },
  'gateway-websocket':     { title: 'WebSocket',                icon: WifiIcon,          Component: GatewayWebSocketSection   },
  'gateway-events':     { title: 'Événements',           icon: ZapIcon,          Component: GatewayEventsSection  },
  'gateway-limits':     { title: 'Limites & Erreurs',    icon: AlertTriangleIcon,Component: ErrorsSection         },
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
