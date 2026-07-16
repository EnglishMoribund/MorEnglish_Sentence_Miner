# Connector API

While the app is running it serves a loopback-only HTTP API on
`http://127.0.0.1:41337` (override with `SENTENCE_MINER_PORT`). This is how
plugins, the MCP server, the browser extension, and your own scripts drive
the app.

## Auth

Every request needs the shared token in an `x-api-token` header. The app
writes it to `<config dir>/api-token`
(Linux: `~/.config/com.sentence.miner/api-token`); the `SENTENCE_MINER_TOKEN`
env var overrides. This keeps web pages from poking the API — the custom
header forces a CORS preflight that never passes, while local tools just
read the file.

## Endpoints

| Method & path | Body | Effect |
|---|---|---|
| `GET /state` | — | current sentence, segments with tags, and the full tag registry |
| `GET /library` | — | all saved sentences |
| `GET /render` | — | latest rendered diagram as a PNG |
| `POST /mine` | raw text | mines it; paragraphs become a queue, `**word**[tag_id]` markdown pre-applies tags |
| `POST /tag` | `{"text": "words from the sentence", "tag": "tag_id"}` | applies a tag (rejected in-app if the tag or words don't match) |
| `POST /suggest` | `{"suggestions": [{"text", "tag", "reason"}]}` | opens the review dialog |

```sh
TOKEN=$(cat ~/.config/com.sentence.miner/api-token)
curl -H "x-api-token: $TOKEN" -X POST http://127.0.0.1:41337/mine -d 'She sang loudly.'
curl -H "x-api-token: $TOKEN" http://127.0.0.1:41337/state | jq .
```

## MCP server

`mcp/server.mjs` (dependency-free Node) exposes the API as MCP tools —
`mine_sentence`, `tag_words`, `get_state` — for Claude Code, the Grok CLI,
Claude Desktop, or any MCP client:

```sh
claude mcp add sentence-miner -- node /path/to/mcp/server.mjs
grok mcp add sentence-miner node -- /path/to/mcp/server.mjs
```
