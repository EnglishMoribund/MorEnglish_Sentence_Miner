#!/usr/bin/env node
// Talk-about-the-labels plugin for MorEnglish Sentence Miner. No dependencies.
// Reads the sentence and the tags YOU chose from the app's connector API, then
// asks any AI CLI to critique them — are the labels right, what nuances or
// alternatives are worth knowing — and prints the discussion to your terminal.
// Unlike the suggest plugins, this pushes nothing back to the app; it's a
// read-only conversation about the labels already on screen. The app must be
// running. The GET /state endpoint it reads is the same "api option" anyone can
// build their own tooling on.
//
// Usage: node discuss.mjs -- <cli> [args...]
//   e.g. node discuss.mjs -- claude -p
//        node discuss.mjs -- grok -p
// Env:   SENTENCE_MINER_PORT (default 41337)
// Self-check: node discuss.mjs --check

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

// Map tag ids to their human labels so the AI critiques "adverb of time",
// not "adverb_time"; fall back to the id if it's a custom tag not in registry.
function buildPrompt(registry, segments) {
  const labelOf = Object.fromEntries((registry || []).map(g => [g.id, g.label]));
  const sentence = segments.map(s => s.text).join(' ');
  const tagged = segments.filter(s => s.tag);
  if (!tagged.length) throw new Error('No tagged segments yet — tag some words in the app first.');
  const chosen = tagged.map(s => `- "${s.text}" → ${labelOf[s.tag] || s.tag}`).join('\n');
  return `You are a grammar tutor reviewing how a learner labelled an English sentence in a sentence-mining app.

Sentence: ${sentence}

Labels the learner chose:
${chosen}

For each label, say whether it is accurate and, where useful, note a nuance, a common alternative analysis, or a more precise term. Be encouraging but honest. End with a one-line overall verdict. Prose only, no JSON.`;
}

if (process.argv.includes('--check')) {
  const p = buildPrompt(
    [{ id: 'adverb_time', label: 'adverb of time' }],
    [{ text: 'He' }, { text: 'ran', tag: 'intransitive_verb' }, { text: 'soon', tag: 'adverb_time' }]
  );
  if (!p.includes('"soon" → adverb of time') || !p.includes('"ran" → intransitive_verb')) {
    console.error('FAIL'); process.exit(1);
  }
  console.log('ok');
  process.exit(0);
}

async function main() {
  const sep = process.argv.indexOf('--');
  const cli = sep > -1 ? process.argv.slice(sep + 1) : [];
  if (cli.length === 0) throw new Error('Usage: node discuss.mjs -- <cli> [args...]  (prompt is appended as the last argument)');

  const state = JSON.parse(await (await fetch(`${APP}/state`, { headers: { 'x-api-token': TOKEN } })).text());
  if (!state.segments?.length) throw new Error('No sentence mined in the app yet.');
  const prompt = buildPrompt(state.registry || [], state.segments);

  console.log(`CLI: ${cli.join(' ')}\nSentence: ${state.segments.map(s => s.text).join(' ')}\nThinking…\n`);
  const output = await new Promise((resolve, reject) => {
    // cwd inside the workspace so leashed CLIs (see ~/.bashrc) stay happy
    const child = spawn(cli[0], [...cli.slice(1), prompt], {
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

  process.stdout.write(output.endsWith('\n') ? output : output + '\n');
}

main().catch(err => { console.error(`Failed: ${err.message}`); process.exit(1); });
