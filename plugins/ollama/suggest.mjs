#!/usr/bin/env node
// Ollama suggest plugin for MorEnglish Sentence Miner. No dependencies.
// Reads the current sentence + tag registry from the app's connector API,
// asks a local Ollama model for tag suggestions, and pushes them into the
// app's review dialog. The app must be running.
//
// Usage: node suggest.mjs [--model qwen3.6:27b]
// Env:   SENTENCE_MINER_PORT (default 41337), OLLAMA_HOST (default http://localhost:11434)
// Self-check: node suggest.mjs --check

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const APP = `http://127.0.0.1:${process.env.SENTENCE_MINER_PORT || 41337}`;
const OLLAMA = process.env.OLLAMA_HOST || 'http://localhost:11434';


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

const SCHEMA = {
  type: 'object',
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Exact contiguous words copied from the sentence, no punctuation' },
          tag: { type: 'string', description: 'A tag id from the registry' },
          reason: { type: 'string', description: 'Why this tag fits, in at most 8 words' }
        },
        required: ['text', 'tag', 'reason'],
        additionalProperties: false
      }
    }
  },
  required: ['suggestions'],
  additionalProperties: false
};

function buildSystemPrompt(registry) {
  const tagList = registry.map(g => `${g.id} — ${g.label}: ${g.def}`).join('\n');
  return `You suggest grammar tags for an English sentence in a sentence-mining app. Available tags (id — label: definition):\n\n${tagList}\n\nRules:\n- "text" must be words copied exactly from the sentence, contiguous and in order, with no punctuation.\n- "tag" must be one of the registry ids.\n- Suggest the 8-15 most instructive tags for an English learner studying this sentence, favoring specific tags over generic ones.`;
}

if (process.argv.includes('--check')) {
  const prompt = buildSystemPrompt([{ id: 'verb', label: 'verb', def: 'an action word' }]);
  if (!prompt.includes('verb — verb: an action word')) { console.error('FAIL'); process.exit(1); }
  console.log('ok');
  process.exit(0);
}

async function main() {
  const modelArg = process.argv.indexOf('--model');
  let model = modelArg > -1 ? process.argv[modelArg + 1] : process.env.OLLAMA_MODEL;

  const state = JSON.parse(await (await fetch(`${APP}/state`, { headers: { 'x-api-token': TOKEN } })).text());
  if (!state.segments?.length) throw new Error('No sentence mined in the app yet.');
  const sentence = state.segments.map(s => s.text).join(' ');

  if (!model) {
    const tags = await (await fetch(`${OLLAMA}/api/tags`)).json();
    if (!tags.models?.length) throw new Error('No Ollama models installed.');
    // ponytail: default to the biggest installed model — grammar tagging needs it
    model = tags.models.sort((a, b) => b.size - a.size)[0].name;
  }

  console.log(`Model: ${model}\nSentence: ${sentence}\nThinking…`);
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      format: SCHEMA,
      // registry is ~2k tokens and thinking models reason at length before the
      // JSON — small default ctx/predict limits end the reply mid-thought
      options: { num_ctx: 16384, num_predict: 12288 },
      messages: [
        { role: 'system', content: buildSystemPrompt(state.registry || []) },
        { role: 'user', content: sentence }
      ]
    })
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  let suggestions;
  try {
    suggestions = JSON.parse(data.message.content).suggestions || [];
  } catch {
    throw new Error(`Model returned invalid JSON (done_reason: ${data.done_reason}). Tail: …${(data.message.content || '').slice(-200)}`);
  }

  await fetch(`${APP}/suggest`, { method: 'POST', headers: { 'x-api-token': TOKEN }, body: JSON.stringify({ suggestions }) });
  console.log(`Sent ${suggestions.length} suggestions to the app:`);
  for (const s of suggestions) console.log(`  ${s.text} → ${s.tag} (${s.reason})`);
}

main().catch(err => { console.error(`Failed: ${err.message}`); process.exit(1); });
