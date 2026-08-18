# Changelog

## 5.2.1

- Made the partly-cloudy visual joke much subtler so the shape reads as a cloud first.
- Made Independence Day more celebratory with a flag-covered harbor boat, a daytime ceremonial flyover, and stronger nighttime fireworks.
- Added a respectful symbolic seventeenth-century sailing vessel and richer harvest details to Thanksgiving scenes.
- Documented that `exceptional` is a standard Home Assistant state but is not currently emitted by the Buienradar integration.

## 5.2.0

- Added dedicated day/night scenes for partly cloudy, lightning, snowy-rainy and exceptional weather.
- Added automatic US scenes for Independence Day, Memorial Day and Thanksgiving.
- Improved the windy scenes with a visibly heeling sailboat and the lightning scenes with stronger storm effects.
- Automatically spread five footer metrics across the full width when the optional low-carbon metric is disabled.
- Centered footer metric groups for a calmer, more balanced layout.

## 5.1.7

- Corrected `phase_estimate` to use the P1 phase only while charging.
- Battery discharge now keeps the direct Anker value because a per-phase P1 value is net of home loads and under-reports discharge (for example 139 W instead of 430 W).

## 5.1.6

- Added optional `battery_power_mode: phase_estimate` with `battery_phase_power` for installations that temporarily need a P1 phase-based AC battery estimate.
- The direct Anker entities determine charge/discharge direction; the signed P1 phase supplies the estimated AC power and is capped by the direct battery reading.

## 5.1.5

- Restored responsive physical flow routes on the house conduits and removed the incorrectly activated legacy edge-to-house paths.

## 5.1.4

- Restored the full, per-scene power-flow paths and connected the new English image filenames to their measured alignment profiles.

## 5.1.3

- Fixed a live-update error that stopped weather, background, timestamp, gas and daily statistics from rendering.

## 5.1.2

- Treat a negative calculated home-power balance as inconsistent sensor timing instead of real `0 W` consumption.
- Keep the last physically valid home-power value for a configurable 30-second grace period.
- Show `-- W` when the balance remains impossible after the grace period.
- Continue using the P1 sensor as the signed grid import/export source.

## 5.1.1

- Add optional `home_power` support for a direct current home-consumption sensor.
- Prefer the direct sensor over the calculated energy balance, preventing temporary `0 W` readings when solar, grid and battery entities update at slightly different times.
- Keep the existing calculated value as a backward-compatible fallback.

## 5.1.0

- Promote the proven Responsive Beta 8 portrait and phone-landscape layouts to the normal `custom:house-power-flow-card` production card.
- Add dedicated automatic scenes for hail, mist, pouring rain and wind.
- Add configurable birthday date support with automatic day/night selection.
- Add common New Year, Valentine's Day and Halloween scenes.
- Rename every supplied image to lowercase English kebab-case.
- Organize the single image directory into `weather`, `holidays/common` and `holidays/nl` subfolders for future country packs.
- Keep temporary fallback support for the previous flat Dutch filenames.
- Add safe Bash and PowerShell migration scripts that validate all destinations and never overwrite files.
- Remove the unused duplicate `dist/images` tree.

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
