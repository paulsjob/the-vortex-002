# Renderless AI Wireframe MVP

A single-page wireframe prototype for a broadcast graphics control tool.

## Quick start (local)

From this repo root:

```bash
python3 -m http.server 4173
```

Then open:

- `http://localhost:4173`

## Why tabs may feel “unclickable”

Most commonly this happens when the app is opened the wrong way (for example in a file preview, or opening `README.md` instead of the running app).

Use the browser URL above and ensure you are on `index.html` served by the HTTP server.

### Troubleshooting checklist

1. Confirm you're on `http://localhost:4173` (not `file:///...`).
2. Hard refresh the page (`Ctrl/Cmd + Shift + R`).
3. Open DevTools Console and check for JS errors.
4. Verify `app.js` loads successfully in Network tab.

## What to test quickly

1. Click **Data Engine** and change `liveScore`.
2. Click **Design** and confirm the canvas score updates.
3. Click **Control Room** and confirm PREVIEW/PROGRAM show the same score.
4. Click **Push to Stream** in the header and check **Output** shows `60 FPS` and the green event log.
