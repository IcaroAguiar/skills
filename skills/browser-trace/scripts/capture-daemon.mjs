#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const [target, runPath] = process.argv.slice(2);
if (!target || !runPath) process.exit(2);

const networkPath = path.join(runPath, 'cdp', 'network');
const rawPath = path.join(runPath, 'cdp', 'raw');
fs.mkdirSync(networkPath, { recursive: true });
fs.mkdirSync(rawPath, { recursive: true });

const requests = fs.createWriteStream(path.join(networkPath, 'requests.jsonl'), { flags: 'a' });
const responses = fs.createWriteStream(path.join(networkPath, 'responses.jsonl'), { flags: 'a' });
const raw = fs.createWriteStream(path.join(rawPath, 'events.jsonl'), { flags: 'a' });
const attached = new Map();
let stopping = false;

function writeJsonl(stream, value) {
  stream.write(`${JSON.stringify(value)}\n`);
}

function targetBaseUrl(input) {
  if (/^https?:\/\//.test(input)) return input.replace(/\/$/, '');
  if (/^ws:\/\//.test(input)) {
    const url = new URL(input);
    return `http://${url.host}`;
  }
  if (/^wss:\/\//.test(input)) {
    const url = new URL(input);
    return `https://${url.host}`;
  }
  return `http://127.0.0.1:${input}`;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.json();
}

class CdpConnection {
  constructor(targetInfo) {
    this.targetInfo = targetInfo;
    this.ws = new WebSocket(targetInfo.webSocketDebuggerUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', (event) => this.onMessage(event));
    this.ws.addEventListener('close', () => {
      for (const { reject } of this.pending.values()) reject(new Error('CDP socket closed'));
      this.pending.clear();
      attached.delete(targetInfo.id);
    });
  }

  async enable() {
    await this.ready;
    await this.send('Network.enable', {});
    await this.send('Page.enable', {}).catch(() => null);
  }

  send(method, params) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(`CDP timeout for ${method}`));
      }, 10000).unref?.();
    });
  }

  onMessage(event) {
    let message;
    try { message = JSON.parse(String(event.data)); } catch { return; }
    if (message.id && this.pending.has(message.id)) {
      const pending = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message || 'CDP error'));
      else pending.resolve(message.result);
      return;
    }
    if (!message.method) return;
    writeJsonl(raw, { targetId: this.targetInfo.id, targetUrl: this.targetInfo.url, ...message });
    if (message.method === 'Network.requestWillBeSent') {
      writeJsonl(requests, message);
    } else if (message.method === 'Network.responseReceived') {
      writeJsonl(responses, message);
    }
  }

  close() {
    try { this.ws.close(); } catch {}
  }
}

async function attachNewTargets() {
  const base = targetBaseUrl(target);
  const targets = await fetchJson(`${base}/json/list`);
  for (const info of targets) {
    if (!info?.webSocketDebuggerUrl || attached.has(info.id)) continue;
    if (!['page', 'webview'].includes(info.type)) continue;
    const connection = new CdpConnection(info);
    attached.set(info.id, connection);
    connection.enable().catch((error) => {
      console.error(`[browser-trace] failed to attach ${info.id}: ${error.message}`);
      attached.delete(info.id);
    });
  }
}

async function shutdown() {
  if (stopping) return;
  stopping = true;
  for (const connection of attached.values()) connection.close();
  await new Promise((resolve) => setTimeout(resolve, 250));
  requests.end();
  responses.end();
  raw.end();
  const statePath = path.join(runPath, 'capture-state.json');
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    fs.writeFileSync(statePath, JSON.stringify({ ...state, status: 'stopped', stoppedAt: new Date().toISOString() }, null, 2));
  } catch {}
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log(`[browser-trace] capture daemon started target=${target} runPath=${runPath}`);
setInterval(() => {
  if (fs.existsSync(path.join(runPath, '.stop'))) shutdown();
}, 500).unref();
setInterval(() => attachNewTargets().catch((error) => console.error(`[browser-trace] target poll failed: ${error.message}`)), 1000);
attachNewTargets().catch((error) => console.error(`[browser-trace] initial attach failed: ${error.message}`));
