# Phone screenshots (1080x1920)

These are real gameplay captures of `www/index.html`, made with `tools/art/capture-screenshots.mjs` at
432x768 CSS px and deviceScaleFactor 2.5. Nothing was upscaled. The game renders its canvas at the
device pixel ratio, so these show exactly what a phone would. Each shot was picked from these seeded
runs:

Recaptured Oct 17, 2026 with the new brainrot cast (`www/js/sprites.js`):

| Shot | Command |
| --- | --- |
| 01-start, 02-choose-a-gate, 04-wide-formation, 05-spearhead, 06-gorilla-king-laser, 07-stage-clear | `--seed 700` |
| 03-blast-the-swarm (pineapple knights) | `--seed 900` |
| 08-formation-gate | `--seed 900`, saved by the script as 02-choose-a-gate |

Captioned Play versions (plus the new-cast icon and feature graphic) come from `tools/art/store-art.mjs`.

`09-evolved.png` (the squad evolution, Legend stage) is captured by `node tools/art/capture-evolved.mjs --seed 700 --out store-assets/phone-1080x1920/09-evolved.png`. It replaces `04-wide-formation` in the store set.
