# Glyphforge Studio

Next.js 16 + React 19 studio for **ASCII art**, **icons** and **mathematical vector animation**, with a
keyframe timeline over every slider and colour. Exports PNG, SVG, animated GIF and WebM. No backend is needed.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static export to ./out (deploy anywhere: Vercel, Netlify, S3, GitHub Pages)
npm run build:subfolder   # relative asset paths + `_next` renamed to `n`, for hosting inside a sub-folder
```

## Keyframes & timeline

- Every slider and colour has a **◆** button. Click it to key the current value at the playhead.
  Move the playhead, change the value and it animates. A filled ◆ means you are on a key; click it to delete that key.
- Once a parameter has keys, editing its slider writes a key at the playhead.
- **Auto-key** records every change you make, even on parameters that are not animated yet.
- Timeline: drag the ruler to scrub, drag ◆ to retime, double-click ◆ to jump to it. Select a key to edit its exact
  time, value and easing (ease in-out, linear, in, out, overshoot, elastic, bounce, hold). Each track shows a value curve,
  and colour tracks show a gradient strip.
- Shortcuts: `Space` play/pause · `←/→` step a frame · `,` / `.` previous/next key · `Home/End` · `Delete` removes the selected key.
- **Auto-animate** keys three random parameters into a looping move.

## Creations & reset

- **Save** (or `⌘S` / `Ctrl S`) adds the current piece to **Creations** as a new card: thumbnail, name, keyframes, timeline
  settings and any uploaded source image. Every save is a new item, so versions sit side by side.
- In the Creations drawer: open, rename (or double-click the name), duplicate, download `.json`, delete (two clicks), import `.json`,
  search, filter by studio and sort. The card you have open shows **Open now** and gets an **Update** button to overwrite it.
  Hovering an Icon or Math card plays it live.
- Creations live in the browser's IndexedDB. They survive reloads but are per-browser, so use `.json` to move them between machines.
- **Reset** → *Reset this studio* restores that studio's defaults and removes its keyframes (an uploaded ASCII source image is kept),
  or *Reset everything* returns all three studios and the timeline to first-launch defaults. Creations are never touched by a reset.

## Structure

```
app/                 layout, page (client-only Studio), globals.css
components/          Studio (stage, render loop, exports), Timeline, Inspector, Library, GlyphEditor, controls
lib/creations.ts     IndexedDB-backed Creations folder
lib/store.ts         document store + fast playback clock (useSyncExternalStore), keyframe actions, persistence
lib/keyframes.ts     easing curves, interpolation (numbers + hex colours), evaluate(doc, t)
lib/engine/          ascii · icon · math generators · glyphs · sources · GIF encoder · render dispatch · save
```

Render functions are pure: `renderDoc(ctx, w, h, t, doc)` evaluates all keyframes at loop time `t ∈ [0,1]` and draws
the active studio. The same function drives the preview, PNG, GIF and WebM, so exports always match what you see.
