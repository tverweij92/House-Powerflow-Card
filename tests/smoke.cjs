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
assert.equal(card._normalizeHolidayDate("18-12", "european"), "12-18");
assert.equal(card._normalizeHolidayDate("12-18", "american"), "12-18");
assert.equal(card._dateInRange(new Date(2026, 11, 20), "18-12", "31-12", "european"), true);
assert.equal(card._dateInRange(new Date(2026, 11, 20), "12-18", "12-31", "american"), true);
assert.equal(card._coordinatesToPath([[1, 2], [3, 4]]), "M 1 2 L 3 4");
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
card._config.animation_speed = 99;
assert.equal(card._animationSpeed(), 10);

const source = fs.readFileSync(require.resolve("../house-power-flow-card.js"), "utf8");
assert.match(source, /\.flow-visual\.solar\.active[\s\S]*\.flow-visual\.battery\.active/);
assert.match(source, /\.flow-visual\.solar,[\s\S]*\.flow-visual\.battery[\s\S]*opacity:\s*0/);
assert.match(source, /\["holidays", "Holidays"\]/);
assert.match(source, /solar_production_today/);
assert.match(source, /data-holiday-date/);

console.log("House Power Flow Card smoke tests passed.");
