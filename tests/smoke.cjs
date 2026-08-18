const assert = require("node:assert/strict");
const fs = require("node:fs");

global.window = {
  matchMedia: () => ({ matches: false }),
  customCards: [],
};
global.HTMLElement = class {
  attachShadow() {
    this.shadowRoot = {};
  }
};
const registry = new Map();
global.customElements = {
  get: (name) => registry.get(name),
  define: (name, constructor) => registry.set(name, constructor),
};
global.document = { createElement: () => ({}) };

require("../house-power-flow-card.js");

const Card = registry.get("house-power-flow-card");
assert.ok(Card, "new card tag is registered");
assert.ok(registry.get("energy-house-aligned-v47-card"), "legacy card tag is registered");

const card = new Card();
card._config = {
  language: "nl",
  holidays: {
    enabled: true,
    country: "NL",
    date_format: "european",
    ranges: [],
    items: {
      kerst: { start: "18-12", end: "31-12" },
      sinterklaas: { enabled: false },
    },
  },
};

assert.equal(card._holidayName(new Date(2026, 11, 18)), "kerst");
assert.equal(card._holidayName(new Date(2026, 11, 5)), "");
card._config.holidays.birthday = { enabled: true, date: "17-08" };
assert.equal(card._holidayName(new Date(2026, 7, 17)), "birthday");
assert.equal(card._holidayImagePath("birthday", "day"), "holidays/common/birthday-day.png");
assert.equal(card._holidayImagePath("koningsdag", "night"), "holidays/nl/kings-day-night.png");
card._config.holidays.birthday.enabled = false;
assert.equal(card._holidayName(new Date(2026, 1, 14)), "valentine");
assert.equal(card._holidayName(new Date(2026, 9, 31)), "halloween");
assert.equal(card._normalizeHolidayDate("18-12", "european"), "12-18");
assert.equal(card._normalizeHolidayDate("12-18", "american"), "12-18");
assert.equal(card._dateInRange(new Date(2026, 11, 20), "18-12", "31-12", "european"), true);
assert.equal(card._dateInRange(new Date(2026, 11, 20), "12-18", "12-31", "american"), true);
assert.equal(card._coordinatesToPath([[1, 2], [3, 4]]), "M 1 2 L 3 4");
assert.equal(card._weatherBaseName("hail"), "hail");
assert.equal(card._weatherBaseName("fog"), "mist");
assert.equal(card._weatherBaseName("pouring"), "pouring");
assert.equal(card._weatherBaseName("windy-variant"), "windy");
assert.equal(card._weatherBaseName("partlycloudy"), "partly-cloudy");
assert.equal(card._weatherBaseName("lightning-rainy"), "lightning");
assert.equal(card._weatherBaseName("snowy-rainy"), "snowy-rainy");
assert.equal(card._weatherBaseName("exceptional"), "exceptional");
assert.deepEqual(
  card._imageCandidates("weather/hail-day.png"),
  [
    "/weather/hail-day.png",
    "/hail%20day.png",
  ]
);
card._config.image_directory = "/local/house-power-flow-card/images";
card._config.weather = "weather.home";
card._config.holidays.enabled = false;
card._hass = {
  states: {
    "sun.sun": { state: "above_horizon", attributes: {} },
    "weather.home": { state: "hail", attributes: { temperature: 12 } },
  },
};
card._config.home_power = "sensor.home_load";
card._hass.states["sensor.home_load"] = {
  state: "420",
  attributes: { unit_of_measurement: "W" },
};
assert.equal(card._resolvedHomePower(1860, 0, 0, 0, 1930), 420);
card._config.home_power = "";
assert.equal(card._resolvedHomePower(1860, 0, 0, 0, 1930), 420);
card._lastValidHomePowerAt = Date.now() - 31_000;
assert.equal(Number.isNaN(card._resolvedHomePower(1860, 0, 0, 0, 1930)), true);
assert.equal(card._resolvedHomePower(1860, 0, 0, 60, 1500), 300);
card._config.battery_power_mode = "direct";
assert.deepEqual(
  card._resolvedBatteryPowers(1470, 0),
  { charging: 1470, discharging: 0, estimated: false }
);
card._config.battery_power_mode = "phase_estimate";
card._config.battery_phase_power = "sensor.p1_phase_1";
card._hass.states["sensor.p1_phase_1"] = {
  state: "893",
  attributes: { unit_of_measurement: "W" },
};
assert.deepEqual(
  card._resolvedBatteryPowers(1470, 0),
  { charging: 893, discharging: 0, estimated: true }
);
card._hass.states["sensor.p1_phase_1"].state = "1200";
assert.deepEqual(
  card._resolvedBatteryPowers(1000, 0),
  { charging: 1000, discharging: 0, estimated: true }
);
card._hass.states["sensor.p1_phase_1"].state = "-600";
assert.deepEqual(
  card._resolvedBatteryPowers(0, 1000),
  { charging: 0, discharging: 1000, estimated: false }
);
assert.equal(card._resolvedHomePower(0, 0, 430, 0, 0), 430);

// Regression: live updates must continue past the home-power calculation.
card._config.modules = { solar: true, grid: true, battery: true, gas: true };
card._config.solar_power = "sensor.solar";
card._config.grid_power = "sensor.grid";
card._config.battery_charge_power = "sensor.battery_charge";
card._config.battery_discharge_power = "sensor.battery_discharge";
card._config.battery_soc = "sensor.battery_soc";
card._config.weather = "weather.home";
Object.assign(card._hass.states, {
  "sensor.solar": { state: "1860", attributes: { unit_of_measurement: "W" } },
  "sensor.grid": { state: "-66", attributes: { unit_of_measurement: "W" } },
  "sensor.battery_charge": { state: "1930", attributes: { unit_of_measurement: "W" } },
  "sensor.battery_discharge": { state: "0", attributes: { unit_of_measurement: "W" } },
  "sensor.battery_soc": { state: "69", attributes: { unit_of_measurement: "%" } },
});
card._valueElements = new Map();
card._flowTargets = {};
card._backgroundLayers = [];
assert.doesNotThrow(() => card._updateLiveValues());

const capturedPaths = {};
const pathMock = (name) => ({
  setAttribute: (attribute, value) => {
    if (attribute === "d") capturedPaths[name] = value;
  },
});
card._paths = {
  solar: pathMock("solar"),
  gridImport: pathMock("gridImport"),
  gridExport: pathMock("gridExport"),
  battery: pathMock("battery"),
};
card._gridImportArrows = pathMock("gridImportArrows");
card._gridExportArrows = pathMock("gridExportArrows");
card._syncPulseLengths = () => {};
card._config.automatic_images = true;
card._applyImageProfile("weather/cloudy-day.png");
assert.match(capturedPaths.solar, /^M 1090 430 /);
assert.equal(capturedPaths.gridImport, "M 1050 704 L 1050 635");
assert.equal(capturedPaths.gridExport, "M 1050 704 L 1050 635");
assert.equal(capturedPaths.battery, "M 1008 635 L 1008 672 L 914 672");
card._dailyMaxTemperature = Number.NaN;
card._dailyMinTemperature = Number.NaN;
assert.equal(card._imageFilename("hail"), "weather/hail-day.png");
assert.ok(fs.existsSync("images/weather/hail-day.png"));
for (const weatherName of ["partly-cloudy", "lightning", "snowy-rainy", "exceptional"]) {
  assert.ok(fs.existsSync(`images/weather/${weatherName}-day.png`));
  assert.ok(fs.existsSync(`images/weather/${weatherName}-night.png`));
}
card._hass.states["sun.sun"].state = "below_horizon";
assert.equal(card._imageFilename("fog"), "weather/mist-night.png");
card._hass.states["sun.sun"].state = "above_horizon";
card._hass.states["weather.home"].attributes.temperature = 26;
assert.equal(card._imageFilename("sunny"), "weather/hot-day.png");
card._hass.states["weather.home"].attributes.temperature = -6;
card._dailyMaxTemperature = Number.NaN;
card._dailyMinTemperature = Number.NaN;
assert.equal(card._imageFilename("sunny"), "weather/freezing-day.png");
card._config.holidays = {
  enabled: true,
  country: "NL",
  date_format: "european",
  birthday: { enabled: true, date: "17-08" },
  ranges: [],
};
assert.equal(card._holidayImagePath(card._holidayName(new Date(2026, 7, 17)), "day"), "holidays/common/birthday-day.png");
assert.ok(fs.existsSync("images/holidays/common/birthday-day.png"));
card._config.holidays.birthday.enabled = false;
card._config.holidays.country = "COMMON";
assert.equal(card._holidayName(new Date(2026, 11, 25)), "kerst");
assert.equal(card._holidayName(new Date(2026, 3, 27)), "");
card._config.holidays.country = "US";
assert.equal(card._holidayName(new Date(2026, 6, 4)), "independence-day");
assert.equal(card._holidayName(new Date(2026, 10, 26)), "thanksgiving");
assert.equal(card._holidayName(new Date(2026, 4, 25)), "memorial-day");
assert.equal(card._holidayImagePath("thanksgiving", "night"), "holidays/us/thanksgiving-night.png");
for (const holidayName of ["independence-day", "thanksgiving", "memorial-day"]) {
  assert.ok(fs.existsSync(`images/holidays/us/${holidayName}-day.png`));
  assert.ok(fs.existsSync(`images/holidays/us/${holidayName}-night.png`));
}
assert.equal(card._t("battery"), "Batterij");
card._config.title = "Energieoverzicht test";
card._config.language = "en";
assert.equal(card._displayTitle(), "Energy overview test");
card._config.modules = { battery: "auto" };
card._config.battery_soc = "sensor.battery_soc";
assert.equal(card._moduleEnabled("battery"), true);
card._config.modules.gas = "auto";
card._config.gas_today = "sensor.gas_today";
assert.equal(card._moduleEnabled("gas"), true);
card._config.animation_speed = 10;
assert.equal(card._animationSpeed(), 10);
card._config.layout_mode = "desktop";
assert.equal(card._resolvedLayoutMode(), "desktop");
card._config.layout_mode = "mobile";
assert.equal(card._resolvedLayoutMode(), "mobile");
card._config.animation_speed = 99;
assert.equal(card._animationSpeed(), 10);

const source = fs.readFileSync(require.resolve("../house-power-flow-card.js"), "utf8");
assert.match(source, /\.flow-visual\.solar\.active[\s\S]*\.flow-visual\.battery\.active/);
assert.match(source, /\.flow-visual\.solar,[\s\S]*\.flow-visual\.battery[\s\S]*opacity:\s*0/);
assert.match(source, /\["holidays", "Holidays"\]/);
assert.match(source, /solar_production_today/);
assert.match(source, /data-holiday-date/);
assert.match(source, /data-birthday-date/);
assert.match(source, /phone-landscape-layout/);
assert.match(source, /holidays\/common\/birthday-day\.png/);

console.log("House Power Flow Card smoke tests passed.");
