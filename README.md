# House Powerflow Card

A wide, animated Home Assistant Lovelace card for visualising live solar, grid and home-battery power around a weather-aware house scene.

[![Home Assistant](https://img.shields.io/badge/Home%20Assistant-Lovelace-41BDF5?logo=home-assistant&logoColor=white)](https://www.home-assistant.io/)
[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5)](https://hacs.xyz/)
[![License: MIT](https://img.shields.io/badge/code-MIT-green.svg)](LICENSE)
[![Support on Ko-fi](https://img.shields.io/badge/Support%20on%20Ko--fi-timverweij92-FF5E5B?logo=ko-fi&logoColor=white)](https://ko-fi.com/timverweij92)

![House Powerflow Card preview](docs/preview.png)

## Highlights

- Persistent, smooth flow animations that do not restart on every Home Assistant state update.
- Separate solar, grid-import/grid-export and battery flows.
- Live PV, grid, battery, home-use and gas values.
- Daily self-sufficiency, self-consumed solar, solar production, grid import/export and low-carbon statistics.
- A proportional three-colour home ring based on today's solar, battery and grid contribution.
- 34 included day/evening backgrounds for weather, seasons and Dutch holidays.
- Automatic cross-fade between matching backgrounds.
- Full-screen view for tablets and wall displays.
- Respects `prefers-reduced-motion`.

## Installation

### Manual installation (recommended for the first setup)

1. Download this repository as a ZIP and extract it.
2. Copy `energy-house-aligned-v47-card.js` to:

   ```text
   /config/www/energy/energy-house-aligned-v47-card.js
   ```

3. Copy the complete `images` directory to:

   ```text
   /config/www/energy/images
   ```

4. In Home Assistant, open **Settings → Dashboards → Resources** and add:

   ```text
   /local/energy/energy-house-aligned-v47-card.js
   ```

   Resource type: **JavaScript module**.

5. Reload the browser with `Ctrl+Shift+R`. If Home Assistant still uses a cached file, temporarily append a cache key such as `?v=1`. You only need to change that number after replacing the JavaScript file—not for normal use.

### HACS custom repository

You can also add this repository to HACS as a custom repository of type **Dashboard**. The JavaScript card can then be updated through HACS. The 34 backgrounds still need to be copied manually to `/config/www/energy/images`.

## Card configuration

Start with [examples/card.yaml](examples/card.yaml):

```yaml
type: custom:energy-house-aligned-v47-card
title: Energieoverzicht
subtitle: Live status

automatic_images: true
image_directory: /local/energy/images
background_image: /local/energy/images/zon overdag.png
image_version: nieuw-huis-v2

weather: weather.buienradar
weather_fade_ms: 1800

solar_power: sensor.envoy_converter_current_power_production
solar_production_today: sensor.envoy_converter_energy_production_today

grid_power: sensor.p1_meter_power
grid_import_today: sensor.zonneplan_electricity_consumption_today
grid_export_today: sensor.zonneplan_electricity_returned_today
gas_today: sensor.zonneplan_gas_consumption_today

battery_charge_power: sensor.anker_solix_solarbank_max_ac_381_battery_charging_power
battery_discharge_power: sensor.anker_solix_solarbank_max_ac_381_battery_discharging_power
battery_soc: sensor.anker_solix_solarbank_max_ac_381_soc

low_carbon_entity: sensor.energy_low_carbon_percentage
statistics_source_mode: first

animation_speed: 1
refresh_minutes: 5
navigation_path: /energy

grid_options:
  columns: 25
  rows: 7
```

Replace the example entity IDs with the IDs from your own Home Assistant installation.

## Important sensor meanings

| Option | Expected value |
| --- | --- |
| `solar_power` | Current total PV production in W or kW. |
| `solar_production_today` | Today's accumulated solar production in kWh. |
| `grid_power` | Signed live P1 power. Positive means import; negative means export. |
| `grid_import_today` | Today's accumulated grid import in kWh. |
| `grid_export_today` | Today's accumulated grid export in kWh. |
| `gas_today` | Today's accumulated gas use in m³. |
| `battery_charge_power` | Current battery charging power. |
| `battery_discharge_power` | Current battery discharging power. |
| `battery_soc` | Battery state of charge in percent. |

The card calculates current household consumption from solar, grid and battery flows. Do not point household consumption at the P1 sensor: the P1 sensor only measures exchange with the grid.

## Automatic backgrounds

The card selects a day or evening image using the weather entity, temperature and calendar date. The included set supports sun, clouds, rain, snow, frost, temperatures above 25 °C and several Dutch holidays. Special ranges include:

- Sinterklaas: 1–5 December
- Christmas: 19–30 December
- New Year: 31 December and 1 January
- Mother's Day and Father's Day
- Easter, Ascension Day, Pentecost, King's Day, Remembrance Day and Liberation Day

All supplied scenes share the same house geometry and camera framing, so one flow-coordinate system remains aligned during image transitions.

## Layout

The intended Home Assistant Sections layout is `columns: 25` and `rows: 7`. Home Assistant may restrict the available width depending on the dashboard's maximum column setting. Give the card the full section width for the best result.

## Support the project

If this card is useful to you, you can support future improvements at [ko-fi.com/timverweij92](https://ko-fi.com/timverweij92).

## License

- JavaScript and documentation: [MIT License](LICENSE)
- Included background artwork: [CC BY-NC 4.0](LICENSE-ASSETS.md)

Copyright © 2026 [tverweij92](https://github.com/tverweij92).
