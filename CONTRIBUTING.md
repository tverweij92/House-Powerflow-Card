# Contributing

Thanks for helping House Power Flow Card.

## Beginner workflow

1. Fork this repository on GitHub.
2. Edit files in your fork or clone it locally.
3. Keep the source under `src` dependency-free.
4. Run `node scripts/build-card.cjs` and `node --check house-power-flow-card.js`.
5. Run `node tests/smoke.cjs`.
6. Open a pull request and describe what changed and how you tested it.

## Add or improve a translation

Translations live in the `TRANSLATIONS` object near the top of `src/house-power-flow-card-base.js`. English is the fallback. Add the same key to each language you improve; a missing key safely falls back to English.

## Add a scene

Supply matching lowercase English `*-day.png` and `*-night.png` files at 1536 x 1024. Put weather scenes in `images/weather`, shared occasions in `images/holidays/common` and country scenes in a lowercase country folder such as `images/holidays/nl`. Keep the house and connection points aligned between both images. Mention the artwork license in your pull request; assets must be compatible with `LICENSE-ASSETS.md`.

## Compatibility

Do not remove the legacy `energy-house-aligned-v47-card` registration in a minor release. Configuration changes should have safe defaults so existing dashboards continue to render.
