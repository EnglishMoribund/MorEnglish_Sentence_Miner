# Usage

## Mining

Paste text into **Mining source** and hit **⛏ MINE SENTENCE** (Ctrl+Enter).
The sentence splits into word and punctuation segments.

- **Multi-sentence sources** become a queue — a PREV / `2 / 7` / NEXT bar
  appears under the mine button. Stepping to another sentence auto-saves
  tagged work to the library.
- **Markdown import**: text containing `**word**[tag_id]` (the app's own
  markdown export format, also produced by AI chats given the registry)
  pre-applies those tags on mine.

## Tagging

Select segments (click, drag, Shift-click for ranges, Ctrl+click to toggle),
then click a tag in the **Grammar registry**. Multi-word selections merge
into one block. Right-click a segment for Wiktionary / grammar-wiki lookups.
Ctrl+Z undoes.

Registry search ranks by label match; Enter applies the top hit.

## Library

FILE ▸ **Save to library** stores the current sentence with its tags;
FILE ▸ **Library…** lists, loads, and deletes saved sentences. The library
lives in `library.json` and feeds the CSV export and deck-exporter plugins.

## Output & exports

**RENDER** draws the diagram; **STYLE…** opens the style dialog — font,
size, seven preset themes, background mode (solid / gradient / transparent),
and colors for text, underline, and tag labels. Everything re-renders live
and applies to every image export.

From the EXPORT menu:

| Export | What you get |
|---|---|
| Copy image | diagram PNG on the clipboard |
| Save image as PNG… / SVG… | native save dialog; SVG is crisp at any size |
| Copy as Markdown | `**word**[tag_id]` — round-trips through mining |
| Copy as HTML (ruby) | `<ruby>` annotations for blogs |
| Copy as cloze (Anki) | `{{c1::word::tag label}}` |
| Export library as CSV… | one row per tagged segment, Anki-importable |
