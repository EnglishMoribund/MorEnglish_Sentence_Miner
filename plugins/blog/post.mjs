#!/usr/bin/env node
// Blog post generator plugin for MorEnglish Sentence Miner. No dependencies.
// Builds a self-contained "sentence of the day" HTML snippet from the
// currently mined sentence: the rendered diagram (inlined as a data URI),
// the sentence with ruby grammar annotations, and a glossary of the tags
// used. Paste it straight into Blogger's HTML editor. The app must be
// running, with a diagram rendered.
//
// Usage: node post.mjs [--out /path/to/post.html]
// Env:   SENTENCE_MINER_PORT (default 41337)
// Self-check: node post.mjs --check

import { readFileSync, writeFileSync } from 'node:fs';
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

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function buildPost(segments, registry, pngBase64) {
  const byId = Object.fromEntries(registry.map(g => [g.id, g]));

  // Same ruby markup as the app's "Copy as HTML" export
  let ruby = '';
  segments.forEach((seg, i) => {
    const label = seg.tag ? (byId[seg.tag]?.label ?? seg.tag.replace(/_/g, ' ')) : '';
    const word = seg.tag
      ? `<ruby>${esc(seg.text)}<rt style="color: #e8c547;">${esc(label)}</rt></ruby>`
      : esc(seg.text);
    ruby += (seg.isPunctuation || i === 0) ? word : ` ${word}`;
  });

  const seen = new Set();
  const glossary = segments
    .filter(s => s.tag && !seen.has(s.tag) && seen.add(s.tag))
    .map(s => {
      const g = byId[s.tag];
      const label = g ? g.label : s.tag.replace(/_/g, ' ');
      return `  <li><b>${esc(label)}</b>${g ? ` — ${esc(g.def)}` : ''}</li>`;
    })
    .join('\n');

  const img = pngBase64
    ? `<p><img src="data:image/png;base64,${pngBase64}" alt="sentence diagram" style="max-width: 100%;"></p>\n`
    : '';

  return `<!-- MorEnglish Sentence Miner — sentence of the day -->
${img}<p style="font-size: 1.3em; line-height: 2.4;">${ruby}</p>
<ul>
${glossary}
</ul>
`;
}

if (process.argv.includes('--check')) {
  const html = buildPost(
    [
      { text: 'He', tag: null, isPunctuation: false },
      { text: 'ran', tag: 'verb_intrans', isPunctuation: false },
      { text: '.', tag: null, isPunctuation: true }
    ],
    [{ id: 'verb_intrans', label: 'intransitive verb', def: 'takes no <object>' }],
    ''
  );
  if (!html.includes('<ruby>ran<rt') || !html.includes('<b>intransitive verb</b> — takes no &lt;object&gt;')
    || html.includes('<img')) {
    console.error('FAIL', html);
    process.exit(1);
  }
  console.log('ok');
  process.exit(0);
}

async function main() {
  const outArg = process.argv.indexOf('--out');
  const out = outArg > -1 ? process.argv[outArg + 1] : './sentence-of-the-day.html';

  const headers = { 'x-api-token': TOKEN };
  const state = JSON.parse(await (await fetch(`${APP}/state`, { headers })).text());
  if (!state.segments?.length) throw new Error('No sentence mined in the app yet.');
  if (!state.segments.some(s => s.tag)) throw new Error('No tags applied yet — the post needs annotations.');

  let png = '';
  const res = await fetch(`${APP}/render`, { headers });
  if (res.ok) png = Buffer.from(await res.arrayBuffer()).toString('base64');

  writeFileSync(out, buildPost(state.segments, state.registry || [], png));
  console.log(`Wrote ${out}${png ? ' (diagram inlined)' : ' (no diagram rendered — text only)'}`);
  console.log('Paste its contents into the Blogger HTML editor.');
}

if (!process.argv.includes('--check') && import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => { console.error(`Failed: ${err.message}`); process.exit(1); });
}
