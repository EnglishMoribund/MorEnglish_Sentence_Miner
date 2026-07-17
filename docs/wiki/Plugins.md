# Plugins

AI and integrations are **not built into the app** — they're external
programs that drive it through the [[Connector API]]. The PLUGINS ▸
**Plugin manager…** dialog runs commands registered in `plugins.toml`
(same pattern as custom tags): a RUN button per plugin, a loading bar with
the plugin's name and elapsed time while it works (also mirrored on the
status bar and a strip above it), and the exit output when it finishes.
Suggest-style plugins (Ollama, Claude/Anthropic, Grok CLI, etc.) also open
the **AI TAG SUGGESTIONS** dialog with its own loading bar so you can watch
progress until results arrive.

```toml
[[plugin]]
name = "Ollama tag suggestions"
command = "node /path/to/plugins/ollama/suggest.mjs"
description = "Local AI suggestions"
```

## Bundled plugins (`plugins/` in the repo)

| Plugin | What it does | Needs |
|---|---|---|
| `ollama/suggest.mjs` | tag suggestions from a local model (defaults to your biggest installed one) | [Ollama](https://ollama.com) |
| `anthropic/suggest.mjs` | tag suggestions from the Anthropic API | `ANTHROPIC_API_KEY` |
| `cli/suggest.mjs -- grok -p` | tag suggestions through any AI CLI that takes a prompt argument (grok, claude, gemini…) — uses that CLI's login, no API key | the CLI |
| `blog/post.mjs` | paste-ready Blogger HTML: inlined diagram + ruby sentence + tag glossary | nothing |

AI suggestions always land in the **AI TAG SUGGESTIONS** review dialog —
apply them one by one or with APPLY ALL (one undo step). Nothing is tagged
without review.

## Related tools

- [mflash deck exporter](https://github.com/EnglishMoribund/MorEnglish_Sentence_Miner_mflash_export) —
  library → Moribund Flash deck; `--wiktionary` adds dictionary definitions
- **Browser extension** (`browser-extensions/sentence-miner-clipper` in the
  workspace) — right-click selected text anywhere → mine it
- **MCP server** (`mcp/server.mjs`) — see [[Connector API]]

## Writing a plugin

Any program in any language: read `GET /state`, act, `POST /suggest` (or
`/tag`, `/mine`). See [[Connector API]] for endpoints and auth. The bundled
plugins are single dependency-free Node files — copy one as a starting point.
