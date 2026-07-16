#!/usr/bin/env node
// Generic CLI-AI suggest plugin for MorEnglish Sentence Miner. No dependencies.
// Works with any AI CLI that takes a prompt argument and prints the reply to
// stdout (grok -p, claude -p, gemini -p, …): builds the suggestion prompt,
// appends it as the CLI's final argument, extracts the JSON from the reply,
// and pushes it into the app's review dialog. The app must be running.
//
// Usage: node suggest.mjs -- <cli> [args...]
//   e.g. node suggest.mjs -- grok -p
//        node suggest.mjs -- claude -p
// Env:   SENTENCE_MINER_PORT (default 41337)
// Self-check: node suggest.mjs --check

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

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

function buildPrompt(registry, sentence) {
  const tagList = registry.map(g => `${g.id} — ${g.label}: ${g.def}`).join('\n');
  return `You suggest grammar tags for an English sentence in a sentence-mining app. Available tags (id — label: definition):\n\n${tagList}\n\nRules:\n- "text" must be words copied exactly from the sentence, contiguous and in order, with no punctuation.\n- "tag" must be one of the registry ids.\n- Suggest the 8-15 most instructive tags for an English learner studying this sentence, favoring specific tags over generic ones.\n\nSentence: ${sentence}\n\nReply with ONLY a JSON object of the form {"suggestions": [{"text": "...", "tag": "...", "reason": "why this tag fits, at most 8 words"}]} — no prose, no markdown fences.`;
}

// CLIs wrap replies in prose or fences; grab the outermost parseable object.
function extractJson(text) {
  const start = text.indexOf('{');
  if (start < 0) throw new Error('no JSON in CLI output');
  for (let end = text.lastIndexOf('}'); end > start; end = text.lastIndexOf('}', end - 1)) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch { /* keep shrinking */ }
  }
  throw new Error('no parseable JSON in CLI output');
}

if (process.argv.includes('--check')) {
  const p = buildPrompt([{ id: 'verb', label: 'verb', def: 'an action word' }], 'He ran.');
  const j = extractJson('Sure! Here it is:\n```json\n{"suggestions":[{"text":"ran","tag":"verb","reason":"r"}]}\n```\nHope that helps.');
  if (!p.includes('verb — verb') || j.suggestions[0].tag !== 'verb') { console.error('FAIL'); process.exit(1); }
  console.log('ok');
  process.exit(0);
}

async function main() {
  const sep = process.argv.indexOf('--');
  const cli = sep > -1 ? process.argv.slice(sep + 1) : [];
  if (cli.length === 0) throw new Error('Usage: node suggest.mjs -- <cli> [args...]  (prompt is appended as the last argument)');

  const state = JSON.parse(await (await fetch(`${APP}/state`, { headers: { 'x-api-token': TOKEN } })).text());
  if (!state.segments?.length) throw new Error('No sentence mined in the app yet.');
  const sentence = state.segments.map(s => s.text).join(' ');

  console.log(`CLI: ${cli.join(' ')}\nSentence: ${sentence}\nThinking…`);
  const output = await new Promise((resolve, reject) => {
    // cwd inside the workspace so leashed CLIs (see ~/.bashrc) stay happy
    const child = spawn(cli[0], [...cli.slice(1), buildPrompt(state.registry || [], sentence)], {
      cwd: dirname(fileURLToPath(import.meta.url)),
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let out = '', err = '';
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { err += d; });
    const timer = setTimeout(() => child.kill(), 180_000);
    child.on('error', reject);
    child.on('close', code => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(`CLI exited ${code}: ${(err || out).slice(-300)}`));
      else resolve(out);
    });
  });

  const suggestions = extractJson(output).suggestions || [];
  await fetch(`${APP}/suggest`, { method: 'POST', headers: { 'x-api-token': TOKEN }, body: JSON.stringify({ suggestions }) });
  console.log(`Sent ${suggestions.length} suggestions to the app:`);
  for (const s of suggestions) console.log(`  ${s.text} → ${s.tag} (${s.reason})`);
}

main().catch(err => { console.error(`Failed: ${err.message}`); process.exit(1); });
