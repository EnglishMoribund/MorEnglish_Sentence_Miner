# MorEnglish Sentence Miner

Mine English sentences, tag their grammar, forge diagrams — a retro
(FF7-window, CRT-scanline) desktop app built with Tauri.

**[Try it in your browser](https://englishmoribund.github.io/MorEnglish_Sentence_Miner/)** —
the web version runs the same frontend; plugins/AI, the library, and custom
tags need the desktop app.

**The loop:** paste or clip a sentence → split it into segments → tag words
and phrases from a 100+ entry grammar registry (or let AI suggest tags) →
export as a diagram, annotated text, flashcards, or a blog post.

## Highlights

- **Grammar registry** — lexical categories, syntax & clauses, morphology,
  tense/aspect, semantic roles, and more; extend it with your own tags via
  `registry.toml` (FILE ▸ Custom tags…)
- **Sentence library & queue** — paste whole paragraphs, step through them
  sentence by sentence, tagged work auto-saves to a local library
- **Diagrams** — canvas-rendered with your choice of font, colors, preset
  themes, gradient or transparent backgrounds; export PNG, SVG, or copy
  straight to the clipboard
- **AI as plugins, not built in** — Ollama (local), Anthropic API, or any
  AI CLI (grok, claude) can suggest tags; everything is reviewed before it
  touches your sentence ([[Plugins]])
- **A local connector API** — drive the app from scripts, browser
  extensions, MCP agents, or your own tools ([[Connector API]])

## Pages

- [[Installation]] — packages for Debian/Ubuntu, Fedora, Arch, and Windows
- [[Usage]] — mining, tagging, the library, queue, and exports
- [[Plugins]] — the plugin manager, bundled plugins, writing your own
- [[Connector API]] — endpoints, auth, MCP server

## Related repos

- [mflash deck exporter](https://github.com/EnglishMoribund/MorEnglish_Sentence_Miner_mflash_export) —
  tagged sentences → Moribund Flash decks
