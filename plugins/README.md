# Sentence Miner AI plugins

AI is not built into the app. A plugin is any program that talks to the app's
loopback connector API while the app is running:

- `GET  http://127.0.0.1:41337/state`   — current sentence, segments, tag registry
- `GET  http://127.0.0.1:41337/library` — all saved sentences (see FILE ▸ Library)
- `GET  http://127.0.0.1:41337/render`  — latest rendered diagram as a PNG
- `POST http://127.0.0.1:41337/mine`    — body: raw text → mines it; multi-sentence
  text becomes a step-through queue, and `**word**[tag_id]` markdown pre-applies tags
- `POST http://127.0.0.1:41337/tag`     — body: `{"text","tag"}` → applies a tag
- `POST http://127.0.0.1:41337/suggest` — body: `{"suggestions":[{"text","tag","reason"}]}` → opens the review dialog

Every request needs an `x-api-token` header. The app writes the token to
`<app config dir>/api-token` (Linux: `~/.config/com.sentence.miner/api-token`);
`SENTENCE_MINER_TOKEN` overrides it. This keeps random web pages from poking
the API — local plugins just read the file.

Each directory here is a self-contained, dependency-free plugin, ready to be
split into its own repo:

| Plugin | Run | Needs |
|---|---|---|
| `ollama/` | `node ollama/suggest.mjs [--model NAME]` | local [Ollama](https://ollama.com); defaults to your biggest installed model |
| `anthropic/` | `ANTHROPIC_API_KEY=... node anthropic/suggest.mjs` | an Anthropic API key |
| `cli/` | `node cli/suggest.mjs -- grok -p` (or `claude -p`, `gemini -p`, …) | any AI CLI that takes a prompt argument and prints the reply — uses that CLI's own login |

The MCP connector in `../mcp/` is a plugin too — it exposes the same API as
tools for any MCP client (`claude mcp add …`, `grok mcp add …`, Claude
Desktop, …).

Suggestions always land in the app's review dialog; nothing is applied until
you click APPLY.
