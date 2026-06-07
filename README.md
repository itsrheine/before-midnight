# Before Midnight

A notification-driven time-loop phone mystery. You live the last few minutes before midnight over and over, digging through a phone to change how the night ends. Knowledge carries across loops; everything else resets.

## Run it

```bash
npm install
npm run dev        # local dev server
npm run build      # production build into dist/
```

Deploy: run `vercel` from this folder (or push to GitHub and import in Vercel). No config needed — it's a static Vite build.

## Project layout

```
src/
  story.js       <- ALL narrative content. Edit this.
  LoopPhone.jsx  <- the engine. You shouldn't need to touch it.
  main.jsx       <- React entry point.
public/
  photos/        <- drop image files here (names must match story.js)
```

## Adding / changing photos

1. Put the image in `public/photos/`.
2. Make sure its filename matches the path in `PHOTO_SRC` at the bottom of `src/story.js`
   (e.g. `old_us` -> `public/photos/old_us.jpg`).

Empty string for a slot shows a labeled grey placeholder instead of an image.

## Writing the story

Everything lives in the `STORY` object in `src/story.js`:

- **contacts** — who can appear (name + accent color).
- **events** — things that fire on the loop clock. `time` is seconds into the loop.
  `type` is one of `message | notif | call | end`. Optional `requires` / `forbids`
  gate an event on knowledge or loop flags.
- **threads** — conversations. Each `reply` can `grant` knowledge (persists across loops),
  `set` a loop flag (resets), require prior knowledge, and show a `response`.
- **apps** — `photos` (image grid) and `notes` (text). Items can be gated and grant knowledge.

### Two tiers of memory

- `knowledge` — persists across every loop. This is what makes the loop matter.
- `loopFlag` — wiped at the start of each loop.

Use knowledge for "things the character now understands" and loop flags for
"things that happened this run."

## Tuning the feel

Top of `src/story.js`:

- `LOOP_LENGTH` — seconds per loop (default 180).
- `DEADLINE_LABEL` — the time the cold-open lands on (default "11:30").
- `TYPING_MS` — how long the typing indicator shows before an incoming message.
