#!/usr/bin/env node
// Anthropic (Claude) suggest plugin for MorEnglish Sentence Miner. No dependencies.
// Reads the current sentence + tag registry from the app's connector API,
// asks Claude for tag suggestions, and pushes them into the app's review
// dialog. The app must be running.
//
// Usage: ANTHROPIC_API_KEY=sk-ant-... node suggest.mjs [--model claude-opus-4-8]
// Env:   SENTENCE_MINER_PORT (default 41337)
// Self-check: node suggest.mjs --check

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const APP = `http://127.0.0.1:${process.env.SENTENCE_MINER_PORT || 41337}`;


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
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('Set ANTHROPIC_API_KEY first.');
  const modelArg = process.argv.indexOf('--model');
  const model = modelArg > -1 ? process.argv[modelArg + 1] : 'claude-opus-4-8';

  const state = JSON.parse(await (await fetch(`${APP}/state`, { headers: { 'x-api-token': TOKEN } })).text());
  if (!state.segments?.length) throw new Error('No sentence mined in the app yet.');
  const sentence = state.segments.map(s => s.text).join(' ');

  console.log(`Model: ${model}\nSentence: ${sentence}\nThinking…`);
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      system: buildSystemPrompt(state.registry || []),
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content: sentence }]
    })
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  if (data.stop_reason === 'refusal') throw new Error('The model declined this request.');
  const text = data.content.find(b => b.type === 'text')?.text ?? '';
  const suggestions = JSON.parse(text).suggestions || [];

  await fetch(`${APP}/suggest`, { method: 'POST', headers: { 'x-api-token': TOKEN }, body: JSON.stringify({ suggestions }) });
  console.log(`Sent ${suggestions.length} suggestions to the app:`);
  for (const s of suggestions) console.log(`  ${s.text} → ${s.tag} (${s.reason})`);
}

main().catch(err => { console.error(`Failed: ${err.message}`); process.exit(1); });
