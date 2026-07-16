#!/usr/bin/env node
// MCP stdio connector for MorEnglish Sentence Miner. No dependencies.
// Talks to the app's loopback API (src-tauri start_api); the app must be running.
//
// Register with Claude Code:
//   claude mcp add sentence-miner -- node /absolute/path/to/mcp/server.mjs
//
// Self-check: node server.mjs --check

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const PORT = process.env.SENTENCE_MINER_PORT || 41337;
const BASE = `http://127.0.0.1:${PORT}`;

// The app writes a shared secret to its config dir; every API call needs it.
function apiToken() {
  if (process.env.SENTENCE_MINER_TOKEN) return process.env.SENTENCE_MINER_TOKEN;
  const base = process.platform === 'darwin' ? join(homedir(), 'Library', 'Application Support')
    : process.platform === 'win32' ? (process.env.APPDATA ?? '')
    : (process.env.XDG_CONFIG_HOME || join(homedir(), '.config'));
  try { return readFileSync(join(base, 'com.sentence.miner', 'api-token'), 'utf8').trim(); }
  catch { return ''; }
}
const TOKEN = apiToken();

const TOOLS = [
  {
    name: 'mine_sentence',
    description: 'Load a sentence into the Sentence Miner app and split it into segments. Returns the new state.',
    inputSchema: {
      type: 'object',
      properties: { text: { type: 'string', description: 'The sentence to mine' } },
      required: ['text']
    }
  },
  {
    name: 'tag_words',
    description: 'Tag contiguous words of the current sentence with a grammar tag. Valid tag ids come from get_state. Returns the new state; if the segments are unchanged, the tag was rejected (unknown id or words not found).',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Exact contiguous words copied from the sentence, no punctuation' },
        tag: { type: 'string', description: 'A registry tag id, e.g. transitive_verb' }
      },
      required: ['text', 'tag']
    }
  },
  {
    name: 'get_state',
    description: 'Read the current sentence, its segments with tags, the list of valid tag ids, and the tagged markdown export.',
    inputSchema: { type: 'object', properties: {} }
  }
];

async function api(method, path, body) {
  const res = await fetch(BASE + path, { method, body, headers: { 'x-api-token': TOKEN } });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.text();
}

// Same format as the app's copy-md export.
function toMarkdown(segments) {
  let out = '';
  segments.forEach((seg, i) => {
    const word = seg.tag ? `**${seg.text}**[${seg.tag}]` : seg.text;
    out += (seg.isPunctuation || i === 0) ? word : ` ${word}`;
  });
  return out;
}

async function getState() {
  const raw = JSON.parse(await api('GET', '/state'));
  const segments = raw.segments ?? [];
  return {
    text: raw.text ?? '',
    segments,
    valid_tags: (raw.registry ?? []).map(t => t.id),
    markdown: toMarkdown(segments)
  };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function callTool(name, args) {
  // ponytail: mine/tag are fire-and-forget events into the webview; the 300ms
  // pause lets it re-sync before we read back. Swap for a request id echo if
  // it ever races.
  if (name === 'mine_sentence') { await api('POST', '/mine', args.text); await sleep(300); return getState(); }
  if (name === 'tag_words') { await api('POST', '/tag', JSON.stringify(args)); await sleep(300); return getState(); }
  if (name === 'get_state') return getState();
  throw new Error(`unknown tool ${name}`);
}

// ---- stdio JSON-RPC loop (newline-delimited, per MCP stdio transport) ----

const reply = (id, result) =>
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');

async function handle(msg) {
  const { id, method, params } = msg;
  if (method === 'initialize') {
    return reply(id, {
      protocolVersion: params?.protocolVersion ?? '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'sentence-miner', version: '0.1.0' }
    });
  }
  if (method === 'ping') return reply(id, {});
  if (method === 'tools/list') return reply(id, { tools: TOOLS });
  if (method === 'tools/call') {
    try {
      const result = await callTool(params.name, params.arguments ?? {});
      return reply(id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
    } catch (e) {
      return reply(id, {
        content: [{ type: 'text', text: `Error: ${e.message}. Is the Sentence Miner app running?` }],
        isError: true
      });
    }
  }
  if (id !== undefined) {
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0', id, error: { code: -32601, message: `unknown method ${method}` }
    }) + '\n');
  }
}

if (process.argv.includes('--check')) {
  const md = toMarkdown([
    { text: 'He' },
    { text: 'ran', tag: 'intransitive_verb' },
    { text: '.', isPunctuation: true }
  ]);
  const expected = 'He **ran**[intransitive_verb].';
  if (md !== expected) { console.error(`FAIL: ${md}`); process.exit(1); }
  console.log('ok');
  process.exit(0);
}

let buf = '';
process.stdin.on('data', chunk => {
  buf += chunk;
  let nl;
  while ((nl = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    try { handle(JSON.parse(line)); } catch { /* ignore malformed lines */ }
  }
});
// On stdin end, node exits once in-flight requests drain — no explicit exit.
