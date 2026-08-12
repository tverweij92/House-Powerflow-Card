# Configuration reference

All options except `type` are optional, but a useful card normally has `solar_power` and `grid_power`.

## Core

| Option | Default | Meaning |
| --- | --- | --- |
| `type` | required | `custom:house-power-flow-card` |
| `title` | `House Power Flow` | Heading shown on the card. |
| `subtitle` | `Live status` | Small heading text. |
| `language` | `auto` | `auto`, `en`, `nl`, `de`, `fr` or `es`. |
| `navigation_path` | `/energy` | Page opened when the card is clicked. |
| `animation_speed` | `0.5` | Shared flow-animation multiplier from `0.1` (slow) to `10.0` (very fast). |

## Entities

Power sensors may report W or kW when their Home Assistant unit is set correctly. Daily energy sensors should report kWh.

| Option | Purpose |
| --- | --- |
| `solar_power` | Current PV production. |
| `solar_production_today` | PV production accumulated today. |
| `grid_power` | Signed grid power: positive import, negative export. |
| `grid_import_today` | Imported energy today. |
| `grid_export_today` | Exported energy today. |
| `gas_today` | Gas consumed today. |
| `battery_charge_power` | Current charging power. |
| `battery_discharge_power` | Current discharging power. |
| `battery_soc` | Battery state of charge (0–100). |
| `low_carbon_entity` | Low-carbon electricity percentage. |
| `weather` | Home Assistant weather entity. |

## Optional modules

`modules.battery`, `modules.gas` and `modules.low_carbon` accept `true`, `false` or `auto`. `auto` shows a module only when its entity is configured.

```yaml
modules:
  solar: true
  grid: true
  battery: auto
  gas: false
  low_carbon: auto
```

## Scenes

| Option | Default | Meaning |
| --- | --- | --- |
| `automatic_images` | `true` | Select scene using time, weather, temperature and holidays. |
| `image_directory` | `/hacsfiles/House-Powerflow-Card/images` | HACS directory containing supplied scenes. |
| `background_image` | empty | Used when automatic images are disabled. |
| `image_version` | empty | Cache-busting value appended to image URLs. |
| `weather_fade_ms` | `1800` | Cross-fade duration. |

## Holidays

Holiday scenes are disabled by default. Choose `date_format: auto`, `european` or `american`. Automatic uses `MM-DD` for an American (`en-US`) Home Assistant/browser locale and `DD-MM` elsewhere. Ranges may cross New Year. Movable Easter-based days keep being calculated each year.

```yaml
holidays:
  enabled: true
  country: NL
  date_format: european
  items:
    kerst:
      enabled: true
      start: "18-12"
      end: "31-12"
    pasen:
      enabled: false
```

Custom `ranges` are checked before country presets:

```yaml
holidays:
  enabled: true
  date_format: european
  ranges:
    - name: my_scene
      image_name: my_scene
      start: "01-07"
      end: "07-07"
```

## Custom flow layout

Coordinates are easy polylines. Advanced users may instead pass SVG path data in `layout.paths` using the keys `solar`, `gridImport`, `gridExport` and `battery`.

```yaml
layout:
  preset: custom
  paths:
    solar: M 100 200 L 700 200 Q 760 200 760 260 L 760 600
    gridImport: M 100 650 L 850 650
    gridExport: M 850 690 L 100 690
    battery: M 950 900 L 950 690
```

## Support popup

```yaml
support:
  enabled: true
  url: https://ko-fi.com/timverweij92
  title: Support House Power Flow Card
  message: Thank you for helping the project grow.
```

Set `enabled: false` to remove the heart button.
