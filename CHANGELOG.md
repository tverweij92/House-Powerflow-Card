# Changelog

## 5.0.0-beta.7

- Add Basic, Extra meters and Holidays tabs to the visual editor.
- Add the daily solar-production sensor so the Solar production KPI can be filled visually.
- Add daily grid import/export sensors to the visual editor.
- Add per-holiday switches and editable fixed start/end dates to the Holidays tab.
- Keep Easter-based and weekday-based holidays calculated automatically.

## 5.0.0-beta.6

- Add the daily gas entity to the visual editor.
- Add gas visibility choices: automatic, always show or hidden.
- Automatically restore gas visibility when a gas entity is selected.

## 5.0.0-beta.5

- Add automatic, European (`DD-MM`) and American (`MM-DD`) holiday date formats.
- Use `MM-DD` automatically for the `en-US` locale and `DD-MM` elsewhere.
- Add the date-format choice to the visual editor.

## 5.0.0-beta.4

- Add flow animation speed (`0.1`–`10.0`) to the visual editor.
- Apply the selected speed consistently to particles and shimmer animations.

## 5.0.0-beta.3

- Translate the recognized default/test title when the card language changes.
- Fix visual-editor entity pickers so battery selections save on the first choice.
- Automatically set battery visibility to `auto` when a battery entity is selected.
- Add an explicit battery visibility choice to the visual editor.
- Move the support heart into the top-right corner of the home-use tile.

## 5.0.0-beta.2

- Hide the complete solar flow when production is inactive.
- Hide the complete battery flow when neither charging nor discharging.
- Fade inactive routes out smoothly to keep the house scene clean.

## 5.0.0-beta.1

- Added the stable `custom:house-power-flow-card` name while preserving the legacy card type.
- Added automatic language selection and translation hooks.
- Made battery, gas and low-carbon modules optional.
- Added configurable holiday ranges and per-holiday switches.
- Added custom flow coordinates and SVG paths for alternative house images.
- Added an optional support/donation popup.
- Updated HACS metadata, validation and beginner documentation.

## 0.1.0 - 2026-08-11

- Initial public release.
- Persistent animated solar, grid and battery flows.
- Live Home Assistant values and daily energy statistics.
- Weather-aware cross-fading background system.
- Includes 34 aligned day and evening scenes.
