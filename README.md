# House Power Flow Card

A visual Home Assistant dashboard card for live solar, grid, home and optional battery power flows. It can switch scenes for weather and configurable holidays while keeping the flow lines aligned.

[![Home Assistant](https://img.shields.io/badge/Home%20Assistant-Dashboard-41BDF5?logo=home-assistant&logoColor=white)](https://www.home-assistant.io/)
[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5)](https://hacs.xyz/)
[![License: MIT](https://img.shields.io/badge/code-MIT-green.svg)](LICENSE)
[![Support on Ko-fi](https://img.shields.io/badge/Support-Ko--fi-FF5E5B?logo=ko-fi&logoColor=white)](https://ko-fi.com/timverweij92)

## Scene previews

### All weather conditions

![All weather scenes, including day and night variants](docs/showcases/weather-scenes.gif)

### US holidays

![US holiday scenes, including day and night variants](docs/showcases/us-holidays.gif)

### Dutch holidays

![Dutch holiday scenes, including day and night variants](docs/showcases/nl-holidays.gif)

![Real House Powerflow Card](docs/house-power-flow-card-real.gif)

![House Power Flow Card preview](docs/preview.png)

## What you can configure

- Solar and grid sensors; battery, gas and low-carbon data are optional.
- Dutch or English automatically from Home Assistant, with starter translations for German, French and Spanish.
- Holiday scenes on/off, per holiday on/off, editable dates, a configurable birthday scene, and Dutch or US country packs.
- Responsive Beta 8 layout built into the normal production card for portrait, phone landscape and desktop.
- Standard image alignment or your own flow paths/coordinates for a different house image.
- A support button and popup that can be disabled or pointed at another donation page.
- Existing `custom:energy-house-aligned-v47-card` dashboards remain compatible.

## Install with HACS (easiest)

1. Open **HACS → Frontend**.
2. Open the three-dot menu and choose **Custom repositories**.
3. Add `https://github.com/tverweij92/House-Powerflow-Card` and choose **Dashboard**.
4. Search for **House Power Flow Card**, install it and restart/refresh Home Assistant.
5. Add a Manual card to your dashboard and paste the minimal example below. HACS installs the supplied scenes with the card.

After adding the card, Home Assistant also shows a simple visual editor for the main sensors, language, battery, holidays and support button. Advanced scene dates and flow coordinates remain in YAML so they stay transparent and portable.

```yaml
type: custom:house-power-flow-card
title: Energy overview
solar_power: sensor.your_solar_power
grid_power: sensor.your_grid_power
home_power: sensor.your_current_home_consumption
weather: weather.home
```

Replace the example entity IDs with your own entities. `home_power` is optional but recommended when your integration provides a direct load-power sensor; otherwise the card calculates it from the other live flows. Battery, gas and holiday scenes stay out of the way until you configure them.

## Add a battery

```yaml
modules:
  battery: true
battery_charge_power: sensor.battery_charge_power
battery_discharge_power: sensor.battery_discharge_power
battery_soc: sensor.battery_state_of_charge
battery_capacity_kwh: 7
```

For an AC-coupled battery without a usable AC charge-power entity, a temporary
per-phase estimate is available. The direct battery entities determine the
direction; a positive P1 phase supplies estimated charging power. Discharge
continues to use the direct battery entity because the P1 phase is already net
of home loads. Estimated charging and home values are marked with `≈`:

```yaml
battery_power_mode: phase_estimate
battery_phase_power: sensor.p1_meter_power_phase_1
```

Set `modules.battery: false` to hide it even when battery sensors are present. With `auto` (the default), it appears only when at least one battery sensor is configured.

## Holiday scenes and custom date ranges

Holiday scenes are off by default. This example enables Dutch defaults, keeps Christmas visible for two weeks and disables Sinterklaas:

```yaml
holidays:
  enabled: true
  country: NL
  date_format: european
  birthday:
    enabled: true
    date: "17-08"
  items:
    kerst:
      enabled: true
      start: "18-12"
      end: "31-12"
    sinterklaas:
      enabled: false
```

Birthday automatically selects `birthday-day.png` or `birthday-night.png` from `images/holidays/common`.

Set `country: US` for automatic Independence Day (July 4), Memorial Day (last Monday in May), and Thanksgiving (fourth Thursday in November) scenes. Common scenes such as New Year, Valentine's Day, Easter, Halloween and Christmas continue to work for both countries.

You can also add your own fixed range. `image_name` becomes the English, hyphenated beginning of the day/night filenames:

```yaml
holidays:
  enabled: true
  date_format: european
  ranges:
    - name: birthday
      image_name: party
      start: "10-08"
      end: "14-08"
      enabled: true
```

The card then looks for `party-day.png` and `party-night.png` in `images/holidays/common`.

## Image folders

Keep one central image directory and use these subfolders:

```text
images/
|-- weather/
`-- holidays/
    |-- common/
    |-- nl/
    `-- us/
```

Future country packs can be added beside `nl`, for example `holidays/us` or `holidays/de`. All supplied filenames are lowercase English kebab-case without spaces. Existing flat Dutch filenames remain supported as a temporary fallback.

Weather scene availability depends on the configured weather provider. Home Assistant defines `exceptional` as a standard state, but providers do not have to emit every standard state. For example, the current Buienradar integration has no source code mapped to `exceptional`, `hail`, `windy`, or `windy-variant`; those scenes remain available for other providers and template weather entities.

From the Studio Code Server or OpenCode terminal in Home Assistant, safely preview the migration and then run it:

```bash
bash scripts/migrate-image-names.sh /homeassistant/www/house-power-flow-card/images --dry-run
bash scripts/migrate-image-names.sh /homeassistant/www/house-power-flow-card/images
```

The script validates all destinations before moving anything and never overwrites an existing file. A PowerShell version with the same checks is included for Windows users.

## Use another house image

Set `automatic_images: false` and provide a background. For exact alignment, use SVG path strings or simple point coordinates in the image's `1536 × 1024` coordinate system:

```yaml
automatic_images: false
background_image: /local/my-house.png
layout:
  preset: custom
  coordinates:
    solar:
      - [100, 200]
      - [650, 200]
      - [850, 520]
    gridImport:
      - [100, 650]
      - [850, 650]
    gridExport:
      - [850, 690]
      - [100, 690]
    battery:
      - [950, 900]
      - [950, 690]
```

See [the complete configuration guide](docs/CONFIGURATION.md) and the ready-to-copy files in [`examples`](examples/).

## Support popup

The heart button opens a small popup. Configure or hide it like this:

```yaml
support:
  enabled: true
  url: https://ko-fi.com/timverweij92
  title: Support House Power Flow Card
  message: Like the card? Help fund future improvements.
```

No link opens automatically; the visitor must click the button in the popup.

## Upgrading from the old card

The old JavaScript file and card type still work for now. For new dashboards use:

```yaml
type: custom:house-power-flow-card
```

After installing version 5 through HACS, change only the `type` line. Your existing sensor settings continue to work. Do not delete the old resource until the new card works on your dashboard.

The separate `house-power-flow-card-beta8.js` resource is no longer needed from version 5.1 onward. Its responsive portrait and landscape behavior is included in `house-power-flow-card.js`.

## Development and contributions

Home Assistant loads one dependency-free production file. The readable source is split into a base and responsive layer under `src`; `node scripts/build-card.cjs` rebuilds the production and distribution files. Pull requests run a syntax check, verify HACS metadata and check the image set. Translation contributions are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

- JavaScript and documentation: [MIT](LICENSE)
- Included artwork: [CC BY-NC 4.0](LICENSE-ASSETS.md)

Copyright © 2026 [tverweij92](https://github.com/tverweij92).
