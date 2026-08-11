/*
 * Energy House Overview Card
 * Drop-in Home Assistant Lovelace custom card.
 *
 * Performance design:
 * - The DOM and SVG shell are created exactly once.
 * - hass updates only patch text, classes and flow targets.
 * - Persistent SVG stroke pulses animate without rebuilding the SVG.
 * - The background and all paths share one 1536 x 1024 SVG viewBox.
 */

(() => {
  const CARD_TAG = "energy-house-aligned-v47-card";
  const SVG_NS = "http://www.w3.org/2000/svg";
  const DEFAULT_WEATHER_IMAGES = {
    sunny: "/local/energy/weather/sunny.png",
    cloudy: "/local/energy/weather/cloudy.png",
    "cloudy-night": "/local/energy/weather/cloudy-night.png",
    "clear-night": "/local/energy/weather/clear-night.png",
    rain: "/local/energy/weather/rain.png",
    "rain-night": "/local/energy/weather/rain-night.png",
    snow: "/local/energy/weather/snow.png",
    "snow-night": "/local/energy/weather/snow-night.png",
  };
  // [solarY, gridImportY, gridExportY, batteryX, homeY]
  // Measured from the actual 1536x1024 source files supplied by the user.
  const IMAGE_PROFILES = {
    "25plus avond.png": [195, 627, 666, 1035, 666],
    "25plus overdag.png": [242, 665, 705, 1035, 705],
    "-5 avond.png": [211, 637, 672, 954, 672],
    "-5 overdag.png": [245, 666, 701, 942, 706],
    "bevrijdingsdag avond.png": [230, 655, 691, 945, 690],
    "bevrijdingsdag overdag.png": [230, 656, 691, 946, 702],
    "bewolkt avond.png": [239, 665, 704, 943, 699],
    "bewolkt overdag.png": [239, 665, 708, 952, 699],
    "dodenherdenking avond.png": [245, 661, 704, 943, 704],
    "dodenherdenking overdag.png": [245, 666, 701, 956, 705],
    "hemelvaart avond.png": [247, 661, 704, 943, 699],
    "hemelvaart overdag.png": [240, 661, 709, 943, 699],
    "kerst avond.png": [245, 665, 705, 943, 704],
    "kerst overdag.png": [240, 666, 702, 947, 700],
    "koningsdag avond.png": [240, 661, 707, 976, 699],
    "koningsdag overdag.png": [240, 661, 701, 974, 699],
    "moederdag avond.png": [226, 640, 683, 947, 682],
    "moederdag overdag.png": [245, 661, 709, 942, 705],
    "nieuwjaar avond.png": [239, 665, 703, 942, 704],
    "nieuwjaar overdag.png": [245, 661, 708, 942, 704],
    "pasen avond.png": [240, 665, 704, 942, 699],
    "pasen overdag.png": [246, 661, 701, 941, 705],
    "pinksteren avond.png": [212, 641, 681, 951, 681],
    "pinksteren overdag.png": [215, 638, 677, 941, 682],
    "regen avond.png": [239, 661, 704, 943, 699],
    "regen overdag.png": [245, 665, 708, 942, 699],
    "sinterklaas avond.png": [229, 653, 697, 944, 691],
    "sinterklaas overdag.png": [245, 667, 703, 934, 706],
    "sneeuw avond.png": [240, 662, 709, 947, 705],
    "sneeuw overdag.png": [246, 666, 701, 942, 705],
    "vaderdag avond.png": [240, 661, 709, 948, 699],
    "vaderdag overdag.png": [207, 630, 667, 947, 676],
    "zon avond.png": [239, 662, 709, 947, 699],
    "zon overdag.png": [239, 666, 701, 942, 705],
  };

  if (customElements.get(CARD_TAG)) {
    console.info("Energy House Overview Card is already registered.");
    return;
  }

  class EnergyHouseOverviewCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });

      this._config = null;
      this._hass = null;
      this._shellBuilt = false;
      this._connected = false;
      this._updateFrame = 0;
      this._animationFrame = 0;
      this._lastAnimationTime = 0;
      this._backgroundLayers = [];
      this._activeBackgroundLayer = 0;
      this._currentWeatherScene = "";
      this._currentBackgroundUrl = "";
      this._pendingBackgroundUrl = "";
      this._backgroundTransitionToken = 0;
      this._flowTransitioning = false;

      this._statistics = null;
      this._loadingStatistics = false;
      this._lastStatisticsLoad = 0;
      this._loadedDay = "";
      this._dailyMaxTemperature = Number.NaN;
      this._dailyMinTemperature = Number.NaN;
      this._temperatureHistoryDay = "";
      this._temperatureHistoryLoading = false;
      this._lastTemperatureHistoryLoad = 0;

      this._paths = {};
      this._particles = [];
      this._flowVisuals = new Map();
      this._flowTargets = {
        solar: { power: 0, active: false, direction: 1 },
        gridImport: { power: 0, active: false, direction: 1 },
        gridExport: { power: 0, active: false, direction: 1 },
        battery: { power: 0, active: false, direction: 1 },
      };

      this._reducedMotionQuery = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      );
      this._reducedMotion = this._reducedMotionQuery.matches;
      this._onMotionPreference = (event) => {
        this._reducedMotion = event.matches;
        this._applyReducedMotion();
      };
      this._onCardClick = () => this._navigateToEnergy();
      this._onExpandClick = async (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (document.fullscreenElement === this) {
          await document.exitFullscreen?.();
          return;
        }

        if (this.classList.contains("fullscreen-fallback")) {
          this.classList.remove("fullscreen-fallback");
          this._updateExpandButton();
          return;
        }

        if (this.requestFullscreen) {
          try {
            await this.requestFullscreen();
          } catch (_error) {
            this.classList.add("fullscreen-fallback");
            this._updateExpandButton();
          }
        } else {
          this.classList.toggle("fullscreen-fallback");
          this._updateExpandButton();
        }
      };
      this._onFullscreenChange = () => this._updateExpandButton();
    }

    setConfig(config) {
      if (!config) {
        throw new Error("Energy House Overview: configuratie ontbreekt.");
      }

      const previousStatsSignature = this._statisticsConfigSignature();

      const suppliedWeatherImages = config.weather_images || {};
      this._config = {
        title: "Energie overzicht",
        subtitle: "Live status",
        background_image: "/local/energy/images/energy-master-zonder-lijnen.png",
        image_directory: "/local/energy/images",
        image_version: "",
        automatic_images: true,

        solar_power:
          "sensor.envoy_converter_current_power_production",
        solar_production_today:
          "sensor.envoy_converter_energy_production_today",
        grid_power: "sensor.p1_meter_power",
        grid_import_today: "",
        grid_export_today: "",
        gas_today: "",
        battery_charge_power:
          "sensor.anker_solix_solarbank_max_ac_381_battery_charging_power",
        battery_discharge_power:
          "sensor.anker_solix_solarbank_max_ac_381_battery_discharging_power",
        battery_soc:
          "sensor.anker_solix_solarbank_max_ac_381_soc",

        weather: "weather.buienradar",
        low_carbon_entity: "sensor.energy_low_carbon_percentage",

        battery_capacity_kwh:
          config.battery_capacity_kwh ?? config.battery_capacity ?? 7,
        animation_speed: 0.5,
        refresh_minutes: 5,
        // Een woning met één P1- en één gasmeter moet niet alle eventueel
        // dubbel aangemelde Energy-bronnen bij elkaar optellen.
        statistics_source_mode: "all",
        weather_fade_ms: 1800,
        weather_images: {
          ...DEFAULT_WEATHER_IMAGES,
          ...suppliedWeatherImages,
        },
        navigation_path: "/energy",
        ...config,
        weather_images: {
          ...DEFAULT_WEATHER_IMAGES,
          ...suppliedWeatherImages,
        },
      };

      if (!this._shellBuilt) {
        this._buildShell();
      }

      this._setText("title", this._config.title);
      this._setText("subtitle", this._config.subtitle);
      this.style.setProperty(
        "--eh-weather-fade",
        `${Math.max(0, Number(this._config.weather_fade_ms) || 0)}ms`
      );

      const newStatsSignature = this._statisticsConfigSignature();
      if (
        previousStatsSignature &&
        previousStatsSignature !== newStatsSignature
      ) {
        this._statistics = null;
        this._lastStatisticsLoad = 0;
      }

      this._scheduleLiveUpdate();
    }

    set hass(hass) {
      this._hass = hass;

      if (!this._shellBuilt && this._config) {
        this._buildShell();
      }

      this._scheduleLiveUpdate();
      this._maybeLoadStatistics();
      this._maybeLoadTemperatureHistory();
    }

    connectedCallback() {
      this._connected = true;
      this._reducedMotionQuery.addEventListener?.(
        "change",
        this._onMotionPreference
      );
      document.addEventListener("fullscreenchange", this._onFullscreenChange);

      if (this._config && !this._shellBuilt) {
        this._buildShell();
      }

      this._startAnimationLoop();
    }

    disconnectedCallback() {
      this._connected = false;
      this._reducedMotionQuery.removeEventListener?.(
        "change",
        this._onMotionPreference
      );
      document.removeEventListener(
        "fullscreenchange",
        this._onFullscreenChange
      );
      cancelAnimationFrame(this._updateFrame);
      cancelAnimationFrame(this._animationFrame);
      this._updateFrame = 0;
      this._animationFrame = 0;
      this._lastAnimationTime = 0;
    }

    getCardSize() {
      return 4;
    }

    getGridOptions() {
      return {
        columns: 25,
        rows: 7,
        min_columns: 12,
        min_rows: 4,
      };
    }

    _buildShell() {
      if (this._shellBuilt) {
        return;
      }

      this.shadowRoot.innerHTML = `
        <style>${this._styles()}</style>

        <ha-card id="card" tabindex="0" role="link">
          <div class="canvas">
            <svg
              class="scene"
              viewBox="0 0 1536 1024"
              preserveAspectRatio="xMidYMid slice"
              aria-hidden="true"
            >
              <image
                id="background-image-0"
                class="background-image active"
                x="0"
                y="0"
                width="1536"
                height="1024"
                preserveAspectRatio="xMidYMid slice"
              ></image>

              <image
                id="background-image-1"
                class="background-image"
                x="0"
                y="0"
                width="1536"
                height="1024"
                preserveAspectRatio="xMidYMid slice"
              ></image>

              <g class="flow-guides">
                <path
                  id="path-solar"
                  class="flow-guide solar-guide"
                  d="M 24 242 L 411 242 Q 455 242 455 286 L 455 424 Q 455 469 505 470 L 718 478 Q 768 478 768 526 L 768 638 Q 768 665 795 665 L 1008 665"
                ></path>

                <path
                  id="path-grid-import"
                  class="flow-guide grid-guide grid-import-guide"
                  d="M 24 664 L 763 664"
                ></path>

                <path
                  id="path-grid-export"
                  class="flow-guide grid-guide grid-export-guide"
                  d="M 763 707 L 24 707"
                ></path>

                <path
                  id="grid-import-arrows"
                  class="grid-arrows grid-import-arrows"
                ></path>

                <path
                  id="grid-export-arrows"
                  class="grid-arrows grid-export-arrows"
                ></path>

                <path
                  id="path-battery"
                  class="flow-guide battery-guide"
                  d="M 945 946 L 945 780 Q 945 765 960 765 L 960 706"
                ></path>

              </g>

              <g class="flow-polish" aria-hidden="true">
                ${this._flowPolishMarkup("solar")}
                ${this._flowPolishMarkup("battery")}
                ${this._flowPolishMarkup("gridImport")}
                ${this._flowPolishMarkup("gridExport")}
              </g>

            </svg>

            <div class="shade"></div>

            <header>
              <div class="heading">
                <div class="heading-icon">
                  <ha-icon icon="mdi:lightning-bolt"></ha-icon>
                </div>
                <div>
                  <div class="title" data-value="title"></div>
                  <div class="live">
                    <span data-value="subtitle"></span>
                    <i></i>
                  </div>
                </div>
              </div>

              <div class="weather">
                <ha-icon id="weather-icon"></ha-icon>
                <div>
                  <div class="temperature" data-value="weather-temperature">--</div>
                  <div class="weather-label" data-value="weather-label">--</div>
                </div>
              </div>

            </header>

            <section class="panel solar-panel">
              <div class="panel-icon solar-icon">
                <ha-icon icon="mdi:solar-power"></ha-icon>
              </div>
              <div>
                <div class="panel-label">PV-energie</div>
                <div class="panel-value solar-value" data-value="solar-power">--</div>
                <div class="panel-sub" data-value="solar-status">--</div>
              </div>
            </section>

            <section class="panel grid-panel">
              <div class="panel-icon grid-icon">
                <ha-icon icon="mdi:transmission-tower"></ha-icon>
              </div>
              <div>
                <div class="panel-label">Net</div>
                <div class="grid-import" data-value="grid-import">← --</div>
                <div class="grid-caption">Van het net</div>
                <div class="grid-export" data-value="grid-export">→ --</div>
                <div class="grid-caption">Naar het net</div>
              </div>
            </section>

            <section class="panel gas-panel">
              <div class="panel-icon gas-icon">
                <ha-icon icon="mdi:fire"></ha-icon>
              </div>
              <div>
                <div class="panel-label">Gasverbruik</div>
                <div class="panel-value gas-value" data-value="gas-today">--</div>
                <div class="panel-sub">Vandaag</div>
              </div>
            </section>

            <section class="panel home-panel">
              <div class="home-ring">
                <div>
                  <ha-icon icon="mdi:home-outline"></ha-icon>
                </div>
              </div>
              <div class="home-label">Verbruik thuis</div>
              <div class="home-value" data-value="home-power">--</div>
              <div class="home-sub">Huidig verbruik</div>
              <div class="home-total">
                Totaal vandaag
                <strong data-value="home-total">--</strong>
              </div>
            </section>

            <section class="panel battery-panel">
              <div class="battery-icon">
                <ha-icon icon="mdi:battery-high"></ha-icon>
              </div>
              <div class="battery-data">
                <div class="battery-title">
                  <span>Batterij</span>
                  <span data-value="battery-soc">--%</span>
                </div>
                <div class="battery-current">
                  <strong class="battery-flow standby" data-value="battery-flow">• 0 W</strong>
                  <small data-value="battery-mode">Stand-by</small>
                </div>
              </div>
            </section>

            <section class="kpi-bar">
              ${this._kpiMarkup(
                "self-sufficiency",
                "mdi:leaf",
                "green",
                "Zelfvoorzienend"
              )}
              ${this._kpiMarkup(
                "self-consumed-solar",
                "mdi:solar-power-variant",
                "orange",
                "Eigen zonverbruik"
              )}
              ${this._kpiMarkup(
                "solar-production-today",
                "mdi:solar-panel-large",
                "yellow",
                "Zonproductie"
              )}
              ${this._kpiMarkup(
                "grid-imported",
                "mdi:transmission-tower-import",
                "purple",
                "Netafname"
              )}
              ${this._kpiMarkup(
                "grid-exported",
                "mdi:transmission-tower-export",
                "blue",
                "Teruglevering"
              )}
              ${this._kpiMarkup(
                "low-carbon",
                "mdi:leaf-circle-outline",
                "green",
                "CO₂-arme elektriciteit"
              )}
            </section>

            <div class="updated">
              Laatste update: <span data-value="updated">--:--</span>
            </div>

          </div>
        </ha-card>
      `;

      this._shellBuilt = true;
      this._cacheElements();
      this._initializeMotion();

      const card = this.shadowRoot.getElementById("card");
      card.addEventListener("click", this._onCardClick);
      this._expandButton?.addEventListener("click", this._onExpandClick);
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this._navigateToEnergy();
        }
      });
    }

    _flowPolishMarkup(flow) {
      const pathId =
        flow === "gridImport"
          ? "grid-import"
          : flow === "gridExport"
            ? "grid-export"
            : flow;

      return `
        <g class="flow-visual ${flow}" data-flow-visual="${flow}">
          <use class="flow-base" href="#path-${pathId}"></use>
          <use class="flow-shimmer" href="#path-${pathId}"></use>
        </g>
      `;
    }

    _kpiMarkup(key, icon, color, label) {
      return `
        <div class="kpi">
          <div class="kpi-icon ${color}">
            <ha-icon icon="${icon}"></ha-icon>
          </div>
          <div class="kpi-text">
            <div class="kpi-label">${label}</div>
            <div class="kpi-value" data-value="${key}">--</div>
          </div>
        </div>
      `;
    }

    _cacheElements() {
      this._valueElements = new Map();
      this.shadowRoot.querySelectorAll("[data-value]").forEach((element) => {
        this._valueElements.set(element.dataset.value, element);
      });

      this._backgroundLayers = [
        this.shadowRoot.getElementById("background-image-0"),
        this.shadowRoot.getElementById("background-image-1"),
      ];
      this._weatherIcon = this.shadowRoot.getElementById("weather-icon");
      this._batteryFlowElement = this.shadowRoot.querySelector(".battery-flow");
      this._homeRing = this.shadowRoot.querySelector(".home-ring");
      this._expandButton = this.shadowRoot.getElementById("expand-button");
      this._gridImportArrows = this.shadowRoot.getElementById(
        "grid-import-arrows"
      );
      this._gridExportArrows = this.shadowRoot.getElementById(
        "grid-export-arrows"
      );

      this._paths = {
        solar: this.shadowRoot.getElementById("path-solar"),
        gridImport: this.shadowRoot.getElementById("path-grid-import"),
        gridExport: this.shadowRoot.getElementById("path-grid-export"),
        battery: this.shadowRoot.getElementById("path-battery"),
      };

      this._flowVisuals = new Map();
      this.shadowRoot.querySelectorAll("[data-flow-visual]").forEach((element) => {
        const flow = element.dataset.flowVisual;
        if (!this._flowVisuals.has(flow)) this._flowVisuals.set(flow, []);
        this._flowVisuals.get(flow).push(element);
      });
      this._particles = [
        ...this.shadowRoot.querySelectorAll(".particle"),
      ].map((element) => ({
        element,
        flow: element.dataset.flow,
        phase: Number(element.dataset.phase) || 0,
        opacity: 0,
        speed: 0,
      }));
    }

    _initializeMotion() {
      for (const particle of this._particles) {
        particle.element.style.opacity = "0";
      }
      this._applyReducedMotion();
      this._startAnimationLoop();
    }

    _startAnimationLoop() {
      if (
        !this._connected ||
        this._animationFrame ||
        this._reducedMotion ||
        !this._shellBuilt ||
        this._particles.length === 0
      ) {
        return;
      }

      this._lastAnimationTime = performance.now();
      this._animationFrame = requestAnimationFrame((time) =>
        this._animate(time)
      );
    }

    _animate(time) {
      this._animationFrame = 0;

      if (!this._connected || this._reducedMotion) {
        return;
      }

      const deltaSeconds = Math.min(
        0.05,
        Math.max(0, (time - this._lastAnimationTime) / 1000)
      );
      this._lastAnimationTime = time;

      for (const particle of this._particles) {
        const target = this._flowTargets[particle.flow];
        const path = this._paths[particle.flow];

        if (!target || !path) {
          continue;
        }

        const targetOpacity =
          target.active && !this._flowTransitioning ? 1 : 0;
        const fadeFactor = 1 - Math.exp(-deltaSeconds * 8);
        particle.opacity +=
          (targetOpacity - particle.opacity) * fadeFactor;

        const targetSpeed = target.active
          ? this._cyclesPerSecond(target.power)
          : 0;
        const speedFactor = 1 - Math.exp(-deltaSeconds * 3.5);
        particle.speed += (targetSpeed - particle.speed) * speedFactor;

        particle.phase =
          (particle.phase +
            deltaSeconds * particle.speed * target.direction +
            1) %
          1;

        const length = path.getTotalLength();
        const point = path.getPointAtLength(particle.phase * length);

        particle.element.setAttribute(
          "transform",
          `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`
        );
        particle.element.style.opacity = particle.opacity.toFixed(3);
      }

      this._animationFrame = requestAnimationFrame((nextTime) =>
        this._animate(nextTime)
      );
    }

    _cyclesPerSecond(power) {
      const absolute = Math.abs(Number(power) || 0);
      const normalized = Math.min(1, absolute / 4000);
      const configuredSpeed = Number(this._config?.animation_speed);
      const speedMultiplier = Number.isFinite(configuredSpeed)
        ? Math.max(0, configuredSpeed)
        : 0.5;

      // Bewust rustiger basisritme. Hierdoor is 0.1 zichtbaar vijf keer
      // langzamer dan 0.5, ook bij hoge vermogens.
      return (0.06 + normalized * 0.2) * speedMultiplier;
    }

    _applyReducedMotion() {
      if (!this._shellBuilt) {
        return;
      }

      if (this._reducedMotion) {
        cancelAnimationFrame(this._animationFrame);
        this._animationFrame = 0;
        this._lastAnimationTime = 0;

        for (const particle of this._particles) {
          particle.element.style.opacity = "0";
        }
      } else {
        this._startAnimationLoop();
      }
    }

    _scheduleLiveUpdate() {
      if (!this._shellBuilt || !this._hass || this._updateFrame) {
        return;
      }

      this._updateFrame = requestAnimationFrame(() => {
        this._updateFrame = 0;
        this._updateLiveValues();
        this._updateStatisticValues();
      });
    }

    _updateLiveValues() {
      if (!this._hass || !this._config) {
        return;
      }

      const solar = this._power(this._config.solar_power);
      const grid = this._power(this._config.grid_power);
      const charging = this._power(this._config.battery_charge_power);
      const discharging = this._power(
        this._config.battery_discharge_power
      );
      const soc = Math.round(this._number(this._config.battery_soc, 0));

      const gridImport = grid > 20 ? grid : 0;
      const gridExport = grid < -20 ? Math.abs(grid) : 0;

      let batteryStatus = "Stand-by";
      let batteryPower = 0;
      let batteryDirection = 1;
      const batteryCapacity = Math.max(
        0,
        Number(this._config.battery_capacity_kwh) || 0
      );

      if (charging > 10) {
        batteryPower = charging;
        // Het korte batterijpad loopt van de meterkast naar de batterij.
        batteryDirection = 1;
        const remainingKwh = batteryCapacity * (1 - soc / 100);
        const eta = remainingKwh / (charging / 1000);
        batteryStatus = remainingKwh <= 0.01
          ? "Vol"
          : `Vol over ${this._formatRemainingTime(eta)}`;
      } else if (discharging > 10) {
        batteryPower = discharging;
        batteryDirection = -1;
        const availableKwh = batteryCapacity * (soc / 100);
        const eta = availableKwh / (discharging / 1000);
        batteryStatus = availableKwh <= 0.01
          ? "Leeg"
          : `Leeg over ${this._formatRemainingTime(eta)}`;
      }

      this._setText("solar-power", this._formatPower(solar));
      this._setText(
        "solar-status",
        solar > 20 ? "Actieve opbrengst" : "Geen opbrengst"
      );
      this._setText("grid-import", `← ${this._formatPower(gridImport)}`);
      this._setText("grid-export", `→ ${this._formatPower(gridExport)}`);
      this._setText("battery-soc", `${soc}%`);
      const batteryFlowText = charging > 10
        ? `↑ ${this._formatPower(charging)}`
        : discharging > 10
          ? `↓ ${this._formatPower(discharging)}`
          : "• 0 W";
      this._setText("battery-flow", batteryFlowText);
      this._setText("battery-mode", batteryStatus);
      if (this._batteryFlowElement) {
        this._batteryFlowElement.classList.toggle("charge", charging > 10);
        this._batteryFlowElement.classList.toggle(
          "discharge",
          discharging > 10
        );
        this._batteryFlowElement.classList.toggle(
          "standby",
          charging <= 10 && discharging <= 10
        );
      }

      let solarForHome = Math.max(
        0,
        solar - gridExport - charging
      );
      let gridForHome = Math.max(0, gridImport);
      let batteryForHome = Math.max(0, discharging);

      // Bruto huisverbruik volgens de actuele energiebalans. De Envoy-sensor
      // meet de volledige PV-productie; laden en terugleveren zijn uitgaande
      // stromen en worden daarom afgetrokken.
      const home = Math.max(
        0,
        solar + gridImport + discharging - gridExport - charging
      );

      // Houd de actuele donutcomponenten exact gelijk aan hetzelfde berekende
      // huisvermogen, ook wanneer een deel van de netafname de batterij laadt.
      const allocatedTotal =
        solarForHome + gridForHome + batteryForHome;
      if (allocatedTotal > 0 && home < allocatedTotal) {
        const allocationScale = home / allocatedTotal;
        solarForHome *= allocationScale;
        gridForHome *= allocationScale;
        batteryForHome *= allocationScale;
      }

      // Huisvermogen gebruikt exact dezelfde broncomponenten als de donut-ring.
      // Hierdoor wordt direct verbruikte PV en batterijontlading wel meegeteld.
      this._setText("home-power", this._formatPower(home));

      if (this._homeRing) {
        const stats = this._statistics || {};
        const dailySolar = Number(stats.usedSolar);
        const dailyBattery = Number(stats.usedBattery);
        const dailyGrid = Number(stats.usedGrid);
        const dailyTotal = dailySolar + dailyBattery + dailyGrid;
        const useDailyMix =
          Number.isFinite(dailySolar) &&
          Number.isFinite(dailyBattery) &&
          Number.isFinite(dailyGrid) &&
          dailyTotal > 0;

        const ringSolar = useDailyMix ? dailySolar : solarForHome;
        const ringBattery = useDailyMix ? dailyBattery : batteryForHome;
        const ringGrid = useDailyMix ? dailyGrid : gridForHome;
        const ringTotal = ringSolar + ringBattery + ringGrid;

        const solarShare = ringTotal > 0
          ? (ringSolar / ringTotal) * 100
          : 0;
        const batteryShare = ringTotal > 0
          ? (ringBattery / ringTotal) * 100
          : 0;
        const gridShare = Math.max(0, 100 - solarShare - batteryShare);
        const batteryEnd = solarShare + batteryShare;

        this._homeRing.style.setProperty(
          "--solar-share",
          `${solarShare.toFixed(2)}%`
        );
        this._homeRing.style.setProperty(
          "--battery-share",
          `${batteryEnd.toFixed(2)}%`
        );
        this._homeRing.classList.toggle("empty", ringTotal <= 0);
        this._homeRing.setAttribute(
          "aria-label",
          `${useDailyMix ? "Energieverdeling vandaag" : "Actuele bronverdeling"}: ` +
            `${Math.round(solarShare)} procent zon, ` +
            `${Math.round(batteryShare)} procent batterij en ` +
            `${Math.round(gridShare)} procent net`
        );
      }

      const weather = this._weatherData();
      this._rememberTemperature(
        Number(this._state(this._config.weather)?.attributes?.temperature)
      );
      this._weatherIcon?.setAttribute("icon", weather.icon);
      this._setText("weather-temperature", weather.temperature);
      this._setText("weather-label", weather.label);
      this._updateWeatherBackground(weather.state);
      this._setText(
        "updated",
        new Date().toLocaleTimeString("nl-NL", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
      this._setFlowTarget("solar", solar, solar > 20, 1);
      this._setFlowTarget(
        "gridImport",
        gridImport,
        gridImport > 20,
        1
      );
      this._setFlowTarget(
        "gridExport",
        gridExport,
        gridExport > 20,
        -1
      );
      this._setFlowTarget(
        "battery",
        batteryPower,
        batteryPower > 10,
        batteryDirection
      );
    }

    _setFlowTarget(flow, power, active, direction) {
      const target = this._flowTargets[flow];
      if (!target) {
        return;
      }
      target.power = Math.abs(Number(power) || 0);
      target.active = Boolean(active);
      target.direction = direction < 0 ? -1 : 1;

      const configuredSpeed = Number(this._config?.animation_speed);
      const sharedSpeed = Number.isFinite(configuredSpeed)
        ? Math.max(0.05, configuredSpeed)
        : 0.5;
      const duration = Math.max(8, Math.min(180, 12 / sharedSpeed));
      for (const visual of this._flowVisuals.get(flow) || []) {
        visual.classList.toggle("active", target.active);
        visual.classList.toggle("reverse", target.direction < 0);
        visual.style.setProperty("--flow-duration", `${duration.toFixed(2)}s`);
      }
    }

    _syncPulseLengths() {
      for (const [flow, path] of Object.entries(this._paths)) {
        if (!path) {
          continue;
        }

        const length = path.getTotalLength();
        if (!Number.isFinite(length) || length <= 0) {
          continue;
        }

        const pulseLength = Math.max(26, Math.min(58, length * 0.055));
        for (const visual of this._flowVisuals.get(flow) || []) {
          visual.style.setProperty("--flow-length", length.toFixed(2));
          visual.style.setProperty("--flow-offset", (-length).toFixed(2));
          visual.style.setProperty("--pulse-length", pulseLength.toFixed(2));
          visual.style.setProperty(
            "--pulse-gap",
            Math.max(1, length - pulseLength).toFixed(2)
          );
        }
      }
    }

    _updateStatisticValues() {
      const stats = this._statistics || {};

      this._setText(
        "self-sufficiency",
        Number.isFinite(stats.selfSufficiency)
          ? `${Math.round(stats.selfSufficiency)}%`
          : "--"
      );
      this._setText(
        "self-consumed-solar",
        Number.isFinite(stats.selfConsumedSolar)
          ? `${Math.round(stats.selfConsumedSolar)}%`
          : "--"
      );

      const solarProductionToday = this._energy(
        this._config.solar_production_today
      );
      this._setText(
        "solar-production-today",
        Number.isFinite(solarProductionToday)
          ? this._formatEnergy(solarProductionToday)
          : "--"
      );

      this._setText(
        "grid-imported",
        Number.isFinite(stats.fromGrid)
          ? this._formatEnergy(stats.fromGrid)
          : "--"
      );
      this._setText(
        "grid-exported",
        Number.isFinite(stats.toGrid)
          ? this._formatEnergy(stats.toGrid)
          : "--"
      );

      const configuredCarbon = this._number(
        this._config.low_carbon_entity,
        Number.NaN
      );
      const lowCarbon = Number.isFinite(stats.lowCarbon)
        ? stats.lowCarbon
        : configuredCarbon;
      this._setText(
        "low-carbon",
        Number.isFinite(lowCarbon) ? `${Math.round(lowCarbon)}%` : "--"
      );

      this._setText(
        "gas-today",
        Number.isFinite(stats.gas) ? this._formatGas(stats.gas) : "--"
      );
      this._setText(
        "home-total",
        Number.isFinite(stats.homeConsumption)
          ? this._formatEnergy(stats.homeConsumption)
          : "--"
      );
    }

    _setText(key, value) {
      const element = this._valueElements?.get(key);
      const text = value === undefined || value === null ? "--" : String(value);
      if (element && element.textContent !== text) {
        element.textContent = text;
      }
    }

    _isNight() {
      return this._state("sun.sun")?.state === "below_horizon";
    }

    _easterDate(year) {
      const a = year % 19;
      const b = Math.floor(year / 100);
      const c = year % 100;
      const d = Math.floor(b / 4);
      const e = b % 4;
      const f = Math.floor((b + 8) / 25);
      const g = Math.floor((b - f + 1) / 3);
      const h = (19 * a + b - d - g + 15) % 30;
      const i = Math.floor(c / 4);
      const k = c % 4;
      const l = (32 + 2 * e + 2 * i - h - k) % 7;
      const m = Math.floor((a + 11 * h + 22 * l) / 451);
      const month = Math.floor((h + l - 7 * m + 114) / 31);
      const day = ((h + l - 7 * m + 114) % 31) + 1;
      return new Date(year, month - 1, day);
    }

    _daysAfter(date, days) {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    }

    _sameDate(a, b) {
      return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
      );
    }

    _nthWeekdayOfMonth(year, monthIndex, weekday, occurrence) {
      const first = new Date(year, monthIndex, 1);
      const offset = (weekday - first.getDay() + 7) % 7;
      return new Date(year, monthIndex, 1 + offset + (occurrence - 1) * 7);
    }

    _holidayName(now) {
      const month = now.getMonth() + 1;
      const day = now.getDate();
      const easter = this._easterDate(now.getFullYear());

      if ((month === 12 && day === 31) || (month === 1 && day === 1)) return "nieuwjaar";
      if (this._sameDate(now, easter) || this._sameDate(now, this._daysAfter(easter, 1))) return "pasen";
      if (month === 4 && day === 27) return "koningsdag";
      if (month === 5 && day === 4) return "dodenherdenking";
      if (month === 5 && day === 5) return "bevrijdingsdag";
      if (
        this._sameDate(
          now,
          this._nthWeekdayOfMonth(now.getFullYear(), 4, 0, 2)
        )
      ) return "moederdag";
      if (this._sameDate(now, this._daysAfter(easter, 39))) return "hemelvaart";
      if (
        this._sameDate(now, this._daysAfter(easter, 49)) ||
        this._sameDate(now, this._daysAfter(easter, 50))
      ) return "pinksteren";
      if (
        this._sameDate(
          now,
          this._nthWeekdayOfMonth(now.getFullYear(), 5, 0, 3)
        )
      ) return "vaderdag";
      if (month === 12 && day >= 1 && day <= 5) return "sinterklaas";
      if (month === 12 && day >= 19 && day <= 30) return "kerst";
      return "";
    }

    _weatherBaseName(weatherState) {
      const state = String(weatherState || "unknown")
        .toLowerCase()
        .replaceAll("_", "-");

      if (["snowy", "snowy-rainy", "hail"].includes(state)) {
        return "sneeuw";
      }
      if (
        [
          "rainy",
          "pouring",
          "lightning",
          "lightning-rainy",
          "exceptional",
        ].includes(state)
      ) {
        return "regen";
      }
      if (["cloudy", "fog", "windy", "windy-variant"].includes(state)) {
        return "bewolkt";
      }
      return "zon";
    }

    _rememberTemperature(temperature) {
      if (!Number.isFinite(temperature)) {
        return;
      }

      const today = this._dateKey(new Date());
      if (this._temperatureHistoryDay !== today) {
        this._temperatureHistoryDay = today;
        this._dailyMaxTemperature = temperature;
        this._dailyMinTemperature = temperature;
        return;
      }

      this._dailyMaxTemperature = Number.isFinite(this._dailyMaxTemperature)
        ? Math.max(this._dailyMaxTemperature, temperature)
        : temperature;
      this._dailyMinTemperature = Number.isFinite(this._dailyMinTemperature)
        ? Math.min(this._dailyMinTemperature, temperature)
        : temperature;
    }

    _imageFilename(weatherState) {
      const period = this._isNight() ? "avond" : "overdag";
      const holiday = this._holidayName(new Date());
      const currentTemperature = Number(
        this._state(this._config.weather)?.attributes?.temperature
      );
      const maximumTemperature = Number.isFinite(currentTemperature)
        ? Math.max(
            currentTemperature,
            Number.isFinite(this._dailyMaxTemperature)
              ? this._dailyMaxTemperature
              : currentTemperature
          )
        : this._dailyMaxTemperature;
      const minimumTemperature = Number.isFinite(currentTemperature)
        ? Math.min(
            currentTemperature,
            Number.isFinite(this._dailyMinTemperature)
              ? this._dailyMinTemperature
              : currentTemperature
          )
        : this._dailyMinTemperature;

      if (holiday) {
        return `${holiday} ${period}.png`;
      }

      if (
        Number.isFinite(maximumTemperature) &&
        maximumTemperature >= 25
      ) {
        return `25plus ${period}.png`;
      }
      if (
        Number.isFinite(minimumTemperature) &&
        minimumTemperature <= -5
      ) {
        return `-5 ${period}.png`;
      }

      return `${this._weatherBaseName(weatherState)} ${period}.png`;
    }

    _imageUrl(filename) {
      const directory = String(this._config.image_directory || "")
        .replace(/\/$/, "");
      return this._versionedImageUrl(
        `${directory}/${encodeURIComponent(filename)}`
      );
    }

    _versionedImageUrl(url) {
      const version = String(this._config?.image_version ?? "").trim();
      if (!version) {
        return url;
      }
      const separator = String(url).includes("?") ? "&" : "?";
      return `${url}${separator}v=${encodeURIComponent(version)}`;
    }

    _applyImageProfile(filename) {
      // Alle nieuwe weerbeelden zijn pixel-identiek opgebouwd (1536 x 1024).
      // Achtergrond en flows delen dezelfde SVG-viewBox en schaalmethode.
      // Daardoor is dit ene profiel geldig voor iedere automatische variant.
      this._paths.solar?.setAttribute(
        "d",
        "M 1090 430 Q 1118 430 1118 458 " +
          "L 1118 582 Q 1118 598 1102 598 " +
          "L 1062 598"
      );
      this._paths.gridImport?.setAttribute(
        "d",
        "M 1050 704 L 1050 635"
      );
      this._paths.gridExport?.setAttribute(
        "d",
        "M 1050 704 L 1050 635"
      );
      this._paths.battery?.setAttribute(
        "d",
        "M 1008 635 L 1008 672 L 926 672 Q 878 672 878 650"
      );

      this._gridImportArrows?.setAttribute(
        "d", ""
      );
      this._gridExportArrows?.setAttribute(
        "d", ""
      );
      this._syncPulseLengths();
      return;

      if (!this._config.automatic_images) {
        // Pixelprofiel van energy-master-uitlijning.png (1536 x 1024).
        // Alle paden delen exact hetzelfde coordinatenstelsel als de afbeelding.
        this._paths.solar?.setAttribute(
          "d",
          "M 24 349 L 1072 349 " +
            "Q 1118 349 1118 395 " +
            "L 1118 555 Q 1118 575 1098 575 " +
            "L 1066 575"
        );
        this._paths.battery?.setAttribute(
          "d",
          "M 24 591 L 838 591 Q 878 591 878 631 L 878 650"
        );
        this._paths.gridImport?.setAttribute(
          "d",
          "M 24 470 L 940 470 Q 990 470 990 520 L 990 609"
        );
        this._paths.gridExport?.setAttribute(
          "d",
          "M 24 470 L 940 470 Q 990 470 990 520 L 990 609"
        );
        this._gridImportArrows?.setAttribute(
          "d",
          "M 284 559 L 296 570 L 284 581 " +
            "M 310 559 L 322 570 L 310 581 " +
            "M 336 559 L 348 570 L 336 581"
        );
        this._gridExportArrows?.setAttribute(
          "d",
          "M 322 604 L 310 615 L 322 626 " +
            "M 296 604 L 284 615 L 296 626 " +
            "M 270 604 L 258 615 L 270 626"
        );
        this._syncPulseLengths();
        return;
      }

      const profile = IMAGE_PROFILES[filename] || IMAGE_PROFILES["zon overdag.png"];
      const [solarY, gridImportY, gridExportY, batteryX, homeY] = profile;
      const deltaX = batteryX - 943;
      const gridEndX = 763 + deltaX;
      const solarTurnX = 455 + deltaX;
      const solarMiddleX = 768 + deltaX;
      const solarEndX = batteryX + 65;
      const solarMiddleY = solarY + 228;
      const solarLowerY = gridImportY;

      // De nieuwe 25plus-scènes hebben het huis en de meterkasten verder
      // naar rechts staan dan de overige pixelprofielen. Gebruik daarom een
      // eigen route: PV via het dak naar de kast, net naar dezelfde kast en
      // batterij rechtstreeks naar de fysieke thuisbatterij.
      if (filename === "25plus overdag.png") {
        this._paths.solar?.setAttribute(
          "d",
          "M 24 330 L 1080 330 " +
            "Q 1120 330 1120 370 " +
            "L 1120 620 Q 1120 650 1090 650 " +
            "L 1053 650"
        );
        this._paths.gridImport?.setAttribute(
          "d",
          "M 24 470 L 930 470 " +
            "Q 960 470 960 500 L 960 655"
        );
        this._paths.gridExport?.setAttribute(
          "d",
          "M 960 655 L 960 500 " +
            "Q 960 470 930 470 L 24 470"
        );
        this._paths.battery?.setAttribute(
          "d",
          "M 24 608 L 770 608 " +
            "Q 820 608 820 658 L 820 733"
        );

        this._gridImportArrows?.setAttribute(
          "d",
          "M 330 459 L 342 470 L 330 481 " +
            "M 360 459 L 372 470 L 360 481 " +
            "M 390 459 L 402 470 L 390 481"
        );
        this._gridExportArrows?.setAttribute(
          "d",
          "M 402 459 L 390 470 L 402 481 " +
            "M 372 459 L 360 470 L 372 481 " +
            "M 342 459 L 330 470 L 342 481"
        );
        this._syncPulseLengths();
        return;
      }

      this._paths.solar?.setAttribute(
        "d",
        `M 24 ${solarY} L ${solarTurnX - 44} ${solarY} ` +
          `Q ${solarTurnX} ${solarY} ${solarTurnX} ${solarY + 44} ` +
          `L ${solarTurnX} ${solarMiddleY - 45} ` +
          `Q ${solarTurnX} ${solarMiddleY} ${solarTurnX + 50} ${solarMiddleY} ` +
          `L ${solarMiddleX - 50} ${solarMiddleY + 8} ` +
          `Q ${solarMiddleX} ${solarMiddleY + 8} ${solarMiddleX} ${solarMiddleY + 56} ` +
          `L ${solarMiddleX} ${solarLowerY - 27} ` +
          `Q ${solarMiddleX} ${solarLowerY} ${solarMiddleX + 27} ${solarLowerY} ` +
          `L ${solarEndX} ${solarLowerY}`
      );
      // De weerbeelden bevatten twee afzonderlijke netlijnen. Houd iedere
      // puls exact op zijn eigen pixelrij: paars voor afname en blauw voor
      // teruglevering. Alleen de actieve richting wordt zichtbaar gemaakt.
      this._paths.gridImport?.setAttribute(
        "d",
        `M 24 ${gridImportY} L ${gridEndX} ${gridImportY}`
      );
      this._paths.gridExport?.setAttribute(
        "d",
        `M ${gridEndX} ${gridExportY} L 24 ${gridExportY}`
      );
      this._paths.battery?.setAttribute(
        "d",
        `M ${batteryX} 950 L ${batteryX} ${homeY}`
      );

      const rightChevron = (x, y) =>
        `M ${x - 12} ${y - 11} L ${x} ${y} L ${x - 12} ${y + 11}`;
      const leftChevron = (x, y) =>
        `M ${x + 12} ${y - 11} L ${x} ${y} L ${x + 12} ${y + 11}`;
      const importArrowStart = Math.max(210, gridEndX * 0.36);
      const exportArrowStart = Math.max(250, gridEndX * 0.56);

      this._gridImportArrows?.setAttribute(
        "d",
        [0, 30, 60]
          .map((offset) => rightChevron(importArrowStart + offset, gridImportY))
          .join(" ")
      );
      this._gridExportArrows?.setAttribute(
        "d",
        [0, 30, 60]
          .map((offset) => leftChevron(exportArrowStart - offset, gridExportY))
          .join(" ")
      );
      this._syncPulseLengths();
    }

    _updateWeatherBackground(weatherState) {
      if (!this._backgroundLayers?.length || !this._config) {
        return;
      }

      const filename = this._config.automatic_images
        ? this._imageFilename(weatherState)
        : "zon overdag.png";
      const url = this._config.automatic_images
        ? this._imageUrl(filename)
        : this._versionedImageUrl(this._config.background_image);

      if (
        !url ||
        url === this._currentBackgroundUrl ||
        url === this._pendingBackgroundUrl
      ) {
        return;
      }

      const token = ++this._backgroundTransitionToken;
      const preload = new Image();
      this._pendingBackgroundUrl = url;

      preload.onload = () => {
        if (token !== this._backgroundTransitionToken) {
          return;
        }

        this._pendingBackgroundUrl = "";

        const firstLoad = !this._currentBackgroundUrl;
        const nextIndex = firstLoad ? 0 : 1 - this._activeBackgroundLayer;
        const nextLayer = this._backgroundLayers[nextIndex];
        const oldLayer = this._backgroundLayers[this._activeBackgroundLayer];
        const fadeMs = Math.max(
          0,
          Number(this._config.weather_fade_ms) || 0
        );

        nextLayer.setAttribute("href", url);

        if (firstLoad || this._reducedMotion) {
          this._applyImageProfile(filename);
          this._backgroundLayers.forEach((layer, index) => {
            layer.classList.toggle("active", index === nextIndex);
          });
        } else {
          // Two persistent SVG image layers: only opacity changes, so the SVG
          // and particle animation never get recreated or reset.
          requestAnimationFrame(() => {
            nextLayer.classList.add("active");
            oldLayer.classList.remove("active");
          });

          this._flowTransitioning = true;
          window.setTimeout(() => {
            if (token === this._backgroundTransitionToken) {
              this._applyImageProfile(filename);
            }
          }, Math.round(fadeMs * 0.45));
          window.setTimeout(() => {
            if (token === this._backgroundTransitionToken) {
              this._flowTransitioning = false;
            }
          }, Math.max(180, Math.round(fadeMs * 0.7)));
        }

        this._activeBackgroundLayer = nextIndex;
        this._currentBackgroundUrl = url;
        this._currentWeatherScene = filename;
      };

      preload.onerror = () => {
        this._pendingBackgroundUrl = "";
        if (token === this._backgroundTransitionToken) {
          // Een tijdelijke 404 tijdens uploaden of cacheverversing mag de
          // automatische weerselectie niet permanent uitschakelen.
          console.warn(
            `Energy House Overview: afbeelding tijdelijk niet beschikbaar: ${url}`
          );
        }
      };

      preload.src = url;
    }

    _maybeLoadTemperatureHistory() {
      if (
        !this._hass ||
        !this._config?.weather ||
        this._temperatureHistoryLoading
      ) {
        return;
      }

      const today = this._dateKey(new Date());
      const stale = Date.now() - this._lastTemperatureHistoryLoad > 10 * 60 * 1000;
      if (this._temperatureHistoryDay !== today || stale) {
        this._loadTemperatureHistory();
      }
    }

    async _loadTemperatureHistory() {
      this._temperatureHistoryLoading = true;

      try {
        const now = new Date();
        const start = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
          0
        );
        const response = await this._hass.callWS({
          type: "history/history_during_period",
          start_time: start.toISOString(),
          end_time: now.toISOString(),
          entity_ids: [this._config.weather],
          minimal_response: false,
          no_attributes: false,
        });

        const rows = Array.isArray(response)
          ? response.flatMap((group) => (Array.isArray(group) ? group : []))
          : [];
        const temperatures = rows
          .map((row) => Number(row?.attributes?.temperature))
          .filter(Number.isFinite);
        const current = Number(
          this._state(this._config.weather)?.attributes?.temperature
        );
        if (Number.isFinite(current)) {
          temperatures.push(current);
        }

        if (temperatures.length) {
          this._dailyMaxTemperature = Math.max(...temperatures);
          this._dailyMinTemperature = Math.min(...temperatures);
        }
        this._temperatureHistoryDay = this._dateKey(now);
        this._lastTemperatureHistoryLoad = Date.now();
      } catch (error) {
        // Recorder history can be disabled for the weather entity. In that
        // case the live temperatures seen by the card remain the fallback.
        console.warn(
          "Energy House Overview: temperatuurhistorie niet beschikbaar",
          error
        );
        this._lastTemperatureHistoryLoad = Date.now();
      } finally {
        this._temperatureHistoryLoading = false;
        this._scheduleLiveUpdate();
      }
    }

    _maybeLoadStatistics() {
      if (!this._hass || !this._config || this._loadingStatistics) {
        return;
      }

      const now = new Date();
      const today = this._dateKey(now);
      const refreshMs =
        Math.max(1, Number(this._config.refresh_minutes) || 5) *
        60 *
        1000;

      if (
        !this._statistics ||
        this._loadedDay !== today ||
        Date.now() - this._lastStatisticsLoad > refreshMs
      ) {
        this._loadEnergyStatistics();
      }
    }

    async _loadEnergyStatistics() {
      if (!this._hass || this._loadingStatistics) {
        return;
      }

      this._loadingStatistics = true;

      try {
        const prefs = await this._hass.callWS({
          type: "energy/get_prefs",
        });
        const sources = prefs?.energy_sources || [];

        const gridSources = sources.filter(
          (source) => source.type === "grid"
        );
        const solarSources = sources.filter(
          (source) => source.type === "solar"
        );
        const batterySources = sources.filter(
          (source) => source.type === "battery"
        );
        const gasSources = sources.filter(
          (source) => source.type === "gas"
        );

        let fromGridIds = gridSources
          .map((source) => source.stat_energy_from)
          .filter(Boolean);
        let toGridIds = gridSources
          .map((source) => source.stat_energy_to)
          .filter(Boolean);
        let solarIds = solarSources
          .map((source) => source.stat_energy_from)
          .filter(Boolean);
        let fromBatteryIds = batterySources
          .map((source) => source.stat_energy_from)
          .filter(Boolean);
        let toBatteryIds = batterySources
          .map((source) => source.stat_energy_to)
          .filter(Boolean);
        let gasIds = gasSources
          .map((source) => source.stat_energy_from)
          .filter(Boolean);

        // In sommige Energy-configuraties staan meerdere statistieken voor
        // dezelfde fysieke P1- of gasmeter. Voor deze kaart kan daarom bewust
        // alleen de eerste bron worden gebruikt. Dat voorkomt vermenigvuldigde
        // dagtotalen zoals 0,04 m³ die als 0,16 m³ werd getoond.
        if (this._config.statistics_source_mode === "first") {
          fromGridIds = [...new Set(fromGridIds)].slice(0, 1);
          toGridIds = [...new Set(toGridIds)].slice(0, 1);
          solarIds = [...new Set(solarIds)].slice(0, 1);
          fromBatteryIds = [...new Set(fromBatteryIds)].slice(0, 1);
          toBatteryIds = [...new Set(toBatteryIds)].slice(0, 1);
          gasIds = [...new Set(gasIds)].slice(0, 1);
        }

        const statisticIds = [
          ...new Set([
            ...fromGridIds,
            ...toGridIds,
            ...solarIds,
            ...fromBatteryIds,
            ...toBatteryIds,
            ...gasIds,
          ]),
        ];

        const now = new Date();
        const start = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
          0
        );

        const statistics = statisticIds.length
          ? await this._hass.callWS({
              type: "recorder/statistics_during_period",
              start_time: start.toISOString(),
              end_time: now.toISOString(),
              statistic_ids: statisticIds,
              period: "hour",
              units: {
                energy: "kWh",
                volume: "m³",
              },
              types: ["change"],
            })
          : {};

        let totalFromGrid = this._sumIds(statistics, fromGridIds);
        let totalToGrid = this._sumIds(statistics, toGridIds);
        let totalSolar = this._sumIds(statistics, solarIds);
        let totalFromBattery = this._sumIds(
          statistics,
          fromBatteryIds
        );
        let totalToBattery = this._sumIds(statistics, toBatteryIds);
        let totalGas = this._sumIds(statistics, gasIds);

        const fromGridByTime = this._sumByTimestamp(
          statistics,
          fromGridIds
        );
        const toGridByTime = this._sumByTimestamp(
          statistics,
          toGridIds
        );
        const solarByTime = this._sumByTimestamp(statistics, solarIds);
        const fromBatteryByTime = this._sumByTimestamp(
          statistics,
          fromBatteryIds
        );
        const toBatteryByTime = this._sumByTimestamp(
          statistics,
          toBatteryIds
        );

        const timestamps = new Set([
          ...fromGridByTime.keys(),
          ...toGridByTime.keys(),
          ...solarByTime.keys(),
          ...fromBatteryByTime.keys(),
          ...toBatteryByTime.keys(),
        ]);

        let totalHomeConsumption = 0;
        let totalUsedSolar = 0;
        let totalUsedBattery = 0;
        let totalUsedGrid = 0;

        for (const timestamp of [...timestamps].sort()) {
          const result = this._computeConsumptionSingle({
            fromGrid: fromGridByTime.get(timestamp) || 0,
            toGrid: toGridByTime.get(timestamp) || 0,
            solar: solarByTime.get(timestamp) || 0,
            fromBattery: fromBatteryByTime.get(timestamp) || 0,
            toBattery: toBatteryByTime.get(timestamp) || 0,
          });
          totalHomeConsumption += Math.max(result.usedTotal, 0);
          totalUsedSolar += result.usedSolar;
          totalUsedBattery += result.usedBattery;
          totalUsedGrid += result.usedGrid;
        }

        // Sommige HA-versies leveren vlak voor de volgende recorder-update
        // lege uurreeksen terug, terwijl de dagstatistiek al wel bestaat.
        // Gebruik dan de officiële enkelvoudige dagaggregatie als fallback.
        const directSolarToday = this._energy(
          this._config.solar_production_today
        );
        const hourlyEnergyTotal =
          totalFromGrid +
          totalToGrid +
          totalSolar +
          totalFromBattery +
          totalToBattery;
        const needsDailyFallback =
          timestamps.size === 0 ||
          (Number.isFinite(directSolarToday) &&
            directSolarToday > 0.01 &&
            hourlyEnergyTotal <= 0.001);

        if (needsDailyFallback) {
          const [
            dailyFromGrid,
            dailyToGrid,
            dailySolar,
            dailyFromBattery,
            dailyToBattery,
            dailyGas,
          ] = await Promise.all([
            this._dailyStatisticTotal(fromGridIds, { energy: "kWh" }),
            this._dailyStatisticTotal(toGridIds, { energy: "kWh" }),
            this._dailyStatisticTotal(solarIds, { energy: "kWh" }),
            this._dailyStatisticTotal(fromBatteryIds, { energy: "kWh" }),
            this._dailyStatisticTotal(toBatteryIds, { energy: "kWh" }),
            this._dailyStatisticTotal(gasIds, { volume: "m³" }),
          ]);

          totalFromGrid = dailyFromGrid;
          totalToGrid = dailyToGrid;
          totalSolar =
            dailySolar > 0
              ? dailySolar
              : Number.isFinite(directSolarToday)
                ? directSolarToday
                : 0;
          totalFromBattery = dailyFromBattery;
          totalToBattery = dailyToBattery;
          totalGas = dailyGas;

          const aggregate = this._computeConsumptionSingle({
            fromGrid: totalFromGrid,
            toGrid: totalToGrid,
            solar: totalSolar,
            fromBattery: totalFromBattery,
            toBattery: totalToBattery,
          });
          totalHomeConsumption = Math.max(aggregate.usedTotal, 0);
          totalUsedSolar = aggregate.usedSolar;
          totalUsedBattery = aggregate.usedBattery;
          totalUsedGrid = aggregate.usedGrid;
        }

        // Optionele expliciete dagsensoren hebben voorrang op de automatisch
        // gevonden Energy-bronnen. Dit is nuttig wanneer dezelfde fysieke
        // P1- of gasmeter meerdere keren in Energy is aangemeld.
        const directGridImport = this._energy(
          this._config.grid_import_today
        );
        const directGridExport = this._energy(
          this._config.grid_export_today
        );
        const directGas = this._number(
          this._config.gas_today,
          Number.NaN
        );
        const hasDirectGrid =
          Number.isFinite(directGridImport) ||
          Number.isFinite(directGridExport);

        if (Number.isFinite(directGridImport)) {
          totalFromGrid = directGridImport;
        }
        if (Number.isFinite(directGridExport)) {
          totalToGrid = directGridExport;
        }
        if (Number.isFinite(directGas)) {
          totalGas = directGas;
        }

        if (hasDirectGrid) {
          const aggregate = this._computeConsumptionSingle({
            fromGrid: totalFromGrid,
            toGrid: totalToGrid,
            solar: totalSolar,
            fromBattery: totalFromBattery,
            toBattery: totalToBattery,
          });
          totalHomeConsumption = Math.max(aggregate.usedTotal, 0);
          totalUsedSolar = aggregate.usedSolar;
          totalUsedBattery = aggregate.usedBattery;
          totalUsedGrid = aggregate.usedGrid;
        }

        const selfSufficiency =
          totalHomeConsumption > 0
            ? (1 -
                Math.min(1, totalFromGrid / totalHomeConsumption)) *
              100
            : null;
        const selfConsumedSolar =
          totalSolar > 0 ? (totalUsedSolar / totalSolar) * 100 : null;

        let lowCarbon = null;
        const co2Entity = this._findCo2SignalEntity();

        if (co2Entity && fromGridIds.length) {
          try {
            const fossilConsumption = await this._hass.callWS({
              type: "energy/fossil_energy_consumption",
              start_time: start.toISOString(),
              end_time: now.toISOString(),
              energy_statistic_ids: fromGridIds,
              co2_statistic_id: co2Entity,
              period: "hour",
            });

            const highCarbonEnergy = Object.values(
              fossilConsumption || {}
            ).reduce(
              (sum, value) => sum + (Number(value) || 0),
              0
            );
            const totalEnergyConsumed =
              totalFromGrid + Math.max(0, totalSolar - totalToGrid);

            if (totalEnergyConsumed > 0) {
              lowCarbon =
                (1 - highCarbonEnergy / totalEnergyConsumed) * 100;
            }
          } catch (error) {
            console.warn(
              "Energy House Overview: CO₂-statistieken niet beschikbaar.",
              error
            );
          }
        }

        this._statistics = {
          solar: totalSolar,
          fromGrid: totalFromGrid,
          toGrid: totalToGrid,
          fromBattery: totalFromBattery,
          toBattery: totalToBattery,
          gas: totalGas,
          homeConsumption: totalHomeConsumption,
          usedSolar: totalUsedSolar,
          usedBattery: totalUsedBattery,
          usedGrid: totalUsedGrid,
          selfSufficiency,
          selfConsumedSolar,
          lowCarbon,
        };
        this._loadedDay = this._dateKey(now);
        this._lastStatisticsLoad = Date.now();
      } catch (error) {
        console.error(
          "Energy House Overview: energiestatistieken laden mislukt.",
          error
        );
      } finally {
        this._loadingStatistics = false;
        this._scheduleLiveUpdate();
      }
    }

    _computeConsumptionSingle({
      fromGrid,
      toGrid,
      solar,
      toBattery,
      fromBattery,
    }) {
      let gridIn = Math.max(fromGrid || 0, 0);
      let gridOut = Math.max(toGrid || 0, 0);
      let solarIn = Math.max(solar || 0, 0);
      let batteryIn = Math.max(toBattery || 0, 0);
      let batteryOut = Math.max(fromBattery || 0, 0);

      const usedTotal =
        gridIn + solarIn + batteryOut - gridOut - batteryIn;
      let remainingConsumption = Math.max(usedTotal, 0);

      const firstGridToBattery = Math.max(
        0,
        Math.min(batteryIn, gridIn - remainingConsumption)
      );
      batteryIn -= firstGridToBattery;
      gridIn -= firstGridToBattery;

      const solarToBattery = Math.min(solarIn, batteryIn);
      batteryIn -= solarToBattery;
      solarIn -= solarToBattery;

      const solarToGrid = Math.min(solarIn, gridOut);
      gridOut -= solarToGrid;
      solarIn -= solarToGrid;

      const batteryToGrid = Math.min(batteryOut, gridOut);
      batteryOut -= batteryToGrid;

      const secondGridToBattery = Math.min(gridIn, batteryIn);
      gridIn -= secondGridToBattery;

      const usedSolar = Math.min(remainingConsumption, solarIn);
      remainingConsumption -= usedSolar;
      const usedBattery = Math.min(batteryOut, remainingConsumption);
      remainingConsumption -= usedBattery;
      const usedGrid = Math.min(remainingConsumption, gridIn);

      return {
        usedTotal,
        usedSolar,
        usedBattery,
        usedGrid,
        solarToBattery,
        solarToGrid,
        batteryToGrid,
        gridToBattery: firstGridToBattery + secondGridToBattery,
      };
    }

    _sumChanges(series) {
      if (!Array.isArray(series)) {
        return 0;
      }
      return series.reduce((total, point) => {
        const value = Number(point.change);
        return Number.isFinite(value) ? total + value : total;
      }, 0);
    }

    _sumIds(statistics, ids) {
      const uniqueIds = [...new Set((ids || []).filter(Boolean))];
      return uniqueIds.reduce(
        (total, id) => total + this._sumChanges(statistics?.[id]),
        0
      );
    }

    _sumByTimestamp(statistics, ids) {
      const values = new Map();
      const uniqueIds = [...new Set((ids || []).filter(Boolean))];
      for (const id of uniqueIds) {
        for (const point of statistics?.[id] || []) {
          const change = Number(point.change);
          if (!Number.isFinite(change)) {
            continue;
          }
          values.set(
            point.start,
            (values.get(point.start) || 0) + change
          );
        }
      }
      return values;
    }

    async _dailyStatisticTotal(ids, units) {
      const uniqueIds = [...new Set((ids || []).filter(Boolean))];
      if (!uniqueIds.length || !this._hass) {
        return 0;
      }

      const results = await Promise.allSettled(
        uniqueIds.map((statisticId) =>
          this._hass.callWS({
            type: "recorder/statistic_during_period",
            statistic_id: statisticId,
            units,
            calendar: { period: "day" },
          })
        )
      );

      return results.reduce((total, result) => {
        if (result.status !== "fulfilled") {
          return total;
        }
        const change = Number(result.value?.change);
        return Number.isFinite(change) ? total + change : total;
      }, 0);
    }

    _findCo2SignalEntity() {
      const configured = this._config?.co2_statistic_id;
      if (configured) {
        return configured;
      }

      for (const [entityId, state] of Object.entries(
        this._hass?.states || {}
      )) {
        if (
          state?.attributes?.unit_of_measurement === "%" &&
          (entityId.includes("fossil") ||
            entityId.includes("co2_signal") ||
            entityId.includes("co2signal"))
        ) {
          return entityId;
        }
      }
      return null;
    }

    _weatherData() {
      const weather = this._state(this._config.weather);
      const state = weather?.state || "unknown";
      const temperature = Number(weather?.attributes?.temperature);
      const map = {
        sunny: ["mdi:weather-sunny", "Zonnig"],
        partlycloudy: ["mdi:weather-partly-cloudy", "Licht bewolkt"],
        cloudy: ["mdi:weather-cloudy", "Bewolkt"],
        rainy: ["mdi:weather-rainy", "Regen"],
        pouring: ["mdi:weather-pouring", "Harde regen"],
        lightning: ["mdi:weather-lightning", "Onweer"],
        "lightning-rainy": ["mdi:weather-lightning-rainy", "Onweer en regen"],
        "clear-night": ["mdi:weather-night", "Heldere nacht"],
        clear_night: ["mdi:weather-night", "Heldere nacht"],
        fog: ["mdi:weather-fog", "Mist"],
        snowy: ["mdi:weather-snowy", "Sneeuw"],
        "snowy-rainy": ["mdi:weather-snowy-rainy", "Natte sneeuw"],
      };
      const [icon, label] =
        map[state] || ["mdi:weather-partly-cloudy", state];
      return {
        state,
        icon,
        label,
        temperature: Number.isFinite(temperature)
          ? `${Math.round(temperature)}°C`
          : "--",
      };
    }

    _state(entityId) {
      return entityId ? this._hass?.states?.[entityId] : undefined;
    }

    _number(entityId, fallback = 0) {
      const value = Number.parseFloat(this._state(entityId)?.state);
      return Number.isFinite(value) ? value : fallback;
    }

    _power(entityId) {
      const state = this._state(entityId);
      const value = Number.parseFloat(state?.state);
      if (!Number.isFinite(value)) {
        return 0;
      }
      const unit = String(
        state?.attributes?.unit_of_measurement || "W"
      ).toLowerCase();
      if (unit === "kw") {
        return value * 1000;
      }
      if (unit === "mw") {
        return value * 1000000;
      }
      return value;
    }

    _energy(entityId) {
      const state = this._state(entityId);
      const value = Number.parseFloat(state?.state);
      if (!Number.isFinite(value)) {
        return Number.NaN;
      }
      const unit = String(
        state?.attributes?.unit_of_measurement || "kWh"
      ).toLowerCase();
      if (unit === "wh") {
        return value / 1000;
      }
      if (unit === "mwh") {
        return value * 1000;
      }
      return value;
    }

    _formatPower(value) {
      const absolute = Math.abs(Number(value) || 0);
      if (absolute >= 1000) {
        return `${(absolute / 1000).toLocaleString("nl-NL", {
          minimumFractionDigits: absolute < 10000 ? 2 : 1,
          maximumFractionDigits: absolute < 10000 ? 2 : 1,
        })} kW`;
      }
      return `${Math.round(absolute).toLocaleString("nl-NL")} W`;
    }

    _formatEnergy(value) {
      const number = Number(value);
      if (!Number.isFinite(number)) {
        return "--";
      }
      return `${number.toLocaleString("nl-NL", {
        minimumFractionDigits: number < 10 ? 2 : 1,
        maximumFractionDigits: number < 10 ? 2 : 1,
      })} kWh`;
    }

    _formatGas(value) {
      const number = Number(value);
      if (!Number.isFinite(number)) {
        return "--";
      }
      return `${number.toLocaleString("nl-NL", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} m³`;
    }

    _formatRemainingTime(hours) {
      const value = Number(hours);
      if (!Number.isFinite(value) || value <= 0) {
        return "--";
      }

      const totalMinutes = Math.max(1, Math.round(value * 60));
      const wholeHours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      return wholeHours > 0
        ? `${wholeHours}u ${String(minutes).padStart(2, "0")}m`
        : `${minutes}m`;
    }

    _formatMoney(entityId) {
      const value = this._number(entityId, Number.NaN);
      if (!Number.isFinite(value)) {
        return "€ --";
      }
      return new Intl.NumberFormat("nl-NL", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    }

    _dateKey(date) {
      return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-");
    }

    _statisticsConfigSignature() {
      if (!this._config) {
        return "";
      }
      return JSON.stringify({
        lowCarbon: this._config.low_carbon_entity,
        co2: this._config.co2_statistic_id,
        refresh: this._config.refresh_minutes,
        sourceMode: this._config.statistics_source_mode,
        gridImportToday: this._config.grid_import_today,
        gridExportToday: this._config.grid_export_today,
        gasToday: this._config.gas_today,
      });
    }

    _navigateToEnergy() {
      const path = this._config?.navigation_path || "/energy";
      history.pushState(null, "", path);
      window.dispatchEvent(new Event("location-changed"));
    }

    _updateExpandButton() {
      if (!this._expandButton) {
        return;
      }

      const expanded =
        document.fullscreenElement === this ||
        this.classList.contains("fullscreen-fallback");
      const icon = this._expandButton.querySelector("ha-icon");
      icon?.setAttribute(
        "icon",
        expanded ? "mdi:arrow-collapse-all" : "mdi:arrow-expand-all"
      );
      this._expandButton.setAttribute(
        "aria-label",
        expanded
          ? "Beeldvullende energiekaart sluiten"
          : "Energiekaart beeldvullend openen"
      );
    }

    _styles() {
      return `
        :host {
          display: block;
          width: 100%;
          height: 100%;
        }

        :host(:fullscreen),
        :host(.fullscreen-fallback) {
          box-sizing: border-box;
          display: grid;
          place-items: center;
          padding: 12px;
          background: #030812;
        }

        :host(.fullscreen-fallback) {
          position: fixed;
          inset: 0;
          z-index: 9999;
        }

        :host(:fullscreen) ha-card,
        :host(.fullscreen-fallback) ha-card {
          width: min(calc(100vw - 24px), calc((100vh - 24px) * 2));
          height: auto;
          max-width: none;
        }

        ha-card {
          position: relative;
          width: 100%;
          height: 100%;
          /* Ontworpen voor een sectie die twee dashboardkolommen overspant. */
          aspect-ratio: 2 / 1;
          min-width: 0;
          overflow: hidden;
          box-sizing: border-box;
          cursor: pointer;
          border-radius: 30px;
          border: 1px solid rgba(255,255,255,0.09);
          background:
            radial-gradient(circle at 50% 0%, rgba(35,99,185,0.13), transparent 36%),
            #07111d;
          box-shadow:
            0 20px 46px rgba(0,0,0,0.40),
            inset 0 1px 0 rgba(255,255,255,0.045);
        }

        ha-card:focus-visible {
          outline: 2px solid #60a5fa;
          outline-offset: 3px;
        }

        .canvas {
          container-type: size;
          position: absolute;
          inset: 0;
          overflow: hidden;
          color: #f8fafc;
          font-family: inherit;
        }

        .scene {
          position: absolute;
          inset: 0;
          z-index: 1;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .background-image {
          opacity: 0;
          filter: brightness(0.94) contrast(1.03) saturate(1.05);
          transition: opacity var(--eh-weather-fade, 1800ms) ease-in-out;
          will-change: opacity;
        }

        .background-image.active {
          opacity: 1;
        }

        .shade {
          position: absolute;
          inset: 0;
          z-index: 2;
          pointer-events: none;
          background:
            linear-gradient(
              180deg,
              rgba(3,10,18,0.08) 0%,
              transparent 23%,
              transparent 68%,
              rgba(3,10,18,0.12) 100%
            );
        }

        .flow-guides {
          opacity: 0;
          pointer-events: none;
        }

        .flow-guide {
          fill: none;
          stroke-width: 7;
          stroke-linecap: round;
        }

        .flow-polish { pointer-events: none; }

        .flow-visual,
        .particle {
          --flow-color: #ffffff;
          --flow-light: #ffffff;
        }

        .solar { --flow-color: #ffb62e; --flow-light: #ffe5a3; }
        .battery { --flow-color: #42d9bf; --flow-light: #b9fff4; }
        .gridImport { --flow-color: #b66cff; --flow-light: #ead0ff; }
        .gridExport { --flow-color: #3aa9ff; --flow-light: #bce6ff; }

        .flow-base,
        .flow-shimmer {
          fill: none;
          vector-effect: non-scaling-stroke;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .flow-base {
          stroke: var(--flow-color);
          stroke-width: 5.5;
          opacity: 0.58;
          filter: drop-shadow(0 0 3px var(--flow-color));
        }

        .flow-shimmer {
          stroke: var(--flow-light);
          stroke-width: 3.5;
          stroke-dasharray: var(--pulse-length, 42) var(--pulse-gap, 958);
          opacity: 0;
          filter:
            drop-shadow(0 0 4px var(--flow-color))
            drop-shadow(0 0 8px var(--flow-color));
          animation: flow-shimmer var(--flow-duration, 12s) linear infinite;
        }

        .flow-visual.active .flow-shimmer { opacity: 1; }
        .flow-visual.reverse .flow-shimmer { animation-direction: reverse; }

        /* Afname en teruglevering delen één fysiek netpad. Alleen de
           actuele richting krijgt kleur, zodat paars en blauw nooit
           tegelijkertijd over elkaar worden getekend. */
        .gridImport:not(.active) .flow-base,
        .gridExport:not(.active) .flow-base {
          opacity: 0;
        }

        @keyframes flow-shimmer {
          to { stroke-dashoffset: var(--flow-offset, -1000); }
        }

        .grid-arrows {
          fill: none;
          stroke: #e0b8ff;
          stroke-width: 7;
          stroke-linecap: round;
          stroke-linejoin: round;
          opacity: 0;
        }

        .particle {
          opacity: 0;
          pointer-events: none;
          will-change: opacity;
        }

        .particle-core { fill: var(--flow-color); }
        .particle-halo { fill: var(--flow-light); opacity: 0.18; }

        @media (prefers-reduced-motion: reduce) {
          .flow-shimmer { animation: none !important; opacity: 0 !important; }
        }

        header {
          position: absolute;
          z-index: 10;
          top: 3.2%;
          left: 2.5%;
          right: 2.5%;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          pointer-events: none;
        }

        .heading {
          display: flex;
          align-items: center;
          gap: 0.9cqw;
        }

        .heading-icon {
          width: 4.1cqw;
          height: 4.1cqw;
          max-width: 64px;
          max-height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 1.1cqw;
          border: 1px solid rgba(135,225,115,0.20);
          background:
            linear-gradient(
              145deg,
              rgba(74,143,68,0.23),
              rgba(15,34,28,0.58)
            );
          color: #8bea72;
          box-shadow:
            0 12px 28px rgba(0,0,0,0.22),
            inset 0 1px 0 rgba(255,255,255,0.05);
        }

        .heading-icon ha-icon {
          --mdc-icon-size: 2.45cqw;
        }

        .title {
          font-size: clamp(20px, 1.85cqw, 29px);
          line-height: 1.08;
          font-weight: 790;
          letter-spacing: -0.04em;
          white-space: nowrap;
          text-shadow: 0 2px 12px rgba(0,0,0,0.40);
        }

        .live {
          margin-top: 0.25cqw;
          font-size: clamp(11px, 0.95cqw, 15px);
          color: rgba(224,232,244,0.78);
        }

        .live i {
          display: inline-block;
          width: 0.8cqw;
          height: 0.8cqw;
          margin-left: 0.6cqw;
          border-radius: 50%;
          background: #7fe17e;
          box-shadow: 0 0 9px rgba(127,225,126,0.82);
        }

        .weather {
          display: flex;
          align-items: center;
          gap: 1cqw;
          text-align: right;
          text-shadow: 0 2px 12px rgba(0,0,0,0.40);
          margin-right: 3.4cqw;
        }

        .weather ha-icon {
          --mdc-icon-size: 2.8cqw;
          color: #f8d96b;
        }

        .temperature {
          font-size: clamp(20px, 1.85cqw, 29px);
          line-height: 1;
          font-weight: 760;
        }

        .weather-label {
          margin-top: 0.4cqw;
          font-size: clamp(10px, 0.9cqw, 14px);
          color: rgba(224,232,244,0.75);
        }

        .panel {
          position: absolute;
          z-index: 8;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          gap: 0.7cqw;
          border-radius: 1.15cqw;
          border: 1px solid rgba(255,255,255,0.11);
          background: linear-gradient(145deg, #1a2d43, #0e1b2b);
          backdrop-filter: none;
          box-shadow:
            0 9px 22px rgba(0,0,0,0.18),
            inset 0 1px 0 rgba(255,255,255,0.05);
        }

        .solar-panel {
          left: 1.6%;
          top: 22.5%;
          width: 14.8%;
          height: 12.5%;
          min-height: 0;
          padding: 0.52cqw 0.6cqw;
          overflow: hidden;
          border-color: rgba(255,182,46,0.34);
        }

        .grid-panel {
          left: 1.6%;
          top: 35.5%;
          width: 14.8%;
          height: 18%;
          min-height: 0;
          padding: 0.48cqw 0.6cqw;
          overflow: hidden;
          border-color: rgba(182,108,255,0.48);
        }

        .gas-panel {
          left: 1.6%;
          top: 67%;
          width: 14.8%;
          height: 12.5%;
          min-height: 0;
          padding: 0.52cqw 0.6cqw;
          overflow: hidden;
          border-color: rgba(255,96,105,0.30);
        }

        .home-panel {
          right: 1.5%;
          top: 30%;
          width: 13.8%;
          min-height: 27%;
          display: block;
          padding: 0.75cqw 0.55cqw;
          text-align: center;
          border-color: rgba(127,227,104,0.28);
        }

        .battery-panel {
          left: 1.6%;
          top: 54%;
          bottom: auto;
          width: 14.8%;
          height: 12.5%;
          min-height: 0;
          padding: 0.48cqw 0.6cqw;
          overflow: hidden;
          transform: none;
          border-color: rgba(66,217,191,0.30);
        }

        .panel-icon,
        .battery-icon {
          width: 3.15cqw;
          height: 3.15cqw;
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(255,255,255,0.05);
        }

        .panel-icon ha-icon,
        .battery-icon ha-icon {
          --mdc-icon-size: 1.85cqw;
        }

        .solar-icon,
        .solar-value { color: #ffb62e; }
        .grid-icon { color: #b66cff; }
        .gas-icon,
        .gas-value { color: #ff6973; }
        .battery-icon {
          color: #42d9bf;
          background: rgba(68,219,190,0.12);
        }

        .panel-label {
          font-size: clamp(10px, 0.92cqw, 14px);
          line-height: 1.05;
          color: rgba(226,234,244,0.86);
        }

        .panel-value {
          margin-top: 0.22cqw;
          font-size: clamp(16px, 1.38cqw, 22px);
          line-height: 1;
          font-weight: 790;
          white-space: nowrap;
        }

        .panel-sub,
        .grid-caption {
          margin-top: 0.24cqw;
          font-size: clamp(8px, 0.7cqw, 11px);
          line-height: 1.05;
          color: rgba(218,227,239,0.72);
        }

        .grid-import,
        .grid-export {
          margin-top: 0.3cqw;
          font-size: clamp(13px, 1.12cqw, 18px);
          line-height: 1;
          font-weight: 750;
          white-space: nowrap;
        }

        .grid-import { color: #b66cff; }
        .grid-export { color: #3aa9ff; }
        .grid-caption {
          margin-top: 0.12cqw;
          margin-left: 1.15cqw;
        }

        .home-ring {
          position: relative;
          width: 7cqw;
          height: 7cqw;
          max-width: 108px;
          max-height: 108px;
          margin: 0 auto 0.5cqw;
          border-radius: 50%;
          background:
            conic-gradient(
              #ffc53a 0 var(--solar-share, 0%),
              #42d9bf var(--solar-share, 0%) var(--battery-share, 0%),
              #b66cff var(--battery-share, 0%) 100%
            );
          transition: background 500ms ease;
        }

        .home-ring.empty {
          background: #35465a;
        }

        .home-ring::before {
          content: "";
          position: absolute;
          inset: 0.58cqw;
          border-radius: 50%;
          background:
            radial-gradient(
              circle at 50% 28%,
              #1b2b3d,
              #0d1928
            );
        }

        .home-ring > div {
          position: absolute;
          inset: 0;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .home-ring ha-icon {
          --mdc-icon-size: 3.4cqw;
          color: #7fe368;
        }

        .home-label {
          font-size: clamp(12px, 1.03cqw, 16px);
          color: rgba(226,234,244,0.88);
        }

        .home-value {
          margin-top: 0.35cqw;
          font-size: clamp(21px, 1.72cqw, 28px);
          line-height: 1;
          font-weight: 790;
        }

        .home-sub {
          margin-top: 0.32cqw;
          font-size: clamp(10px, 0.85cqw, 13px);
          color: rgba(218,227,239,0.72);
        }

        .home-total {
          margin-top: 0.5cqw;
          padding-top: 0.45cqw;
          border-top: 1px solid rgba(255,255,255,0.12);
          font-size: clamp(10px, 0.85cqw, 13px);
          color: rgba(218,227,239,0.74);
        }

        .home-total strong {
          display: block;
          margin-top: 0.25cqw;
          font-size: clamp(14px, 1.2cqw, 19px);
          color: #fff;
          white-space: nowrap;
        }

        .battery-data {
          min-width: 0;
          flex: 1;
        }

        .battery-title {
          display: flex;
          justify-content: flex-start;
          align-items: baseline;
          gap: 0.32cqw;
          font-size: clamp(10px, 0.92cqw, 14px);
          line-height: 1.05;
          font-weight: 690;
        }

        .battery-current {
          display: block;
          margin-top: 0.28cqw;
        }

        .battery-current strong,
        .battery-current small {
          display: block;
          white-space: nowrap;
        }

        .battery-current strong {
          font-size: clamp(13px, 1.08cqw, 17px);
        }

        .battery-current small {
          margin-top: 0.2cqw;
          font-size: clamp(8px, 0.7cqw, 11px);
          line-height: 1.05;
          color: rgba(218,227,239,0.70);
        }

        .discharge { color: #ff6a7b; }
        .charge { color: #73ed91; }
        .standby { color: rgba(226,232,240,0.72); }

        .kpi-bar {
          position: absolute;
          z-index: 9;
          left: 0;
          right: 0;
          bottom: 0;
          height: 13%;
          display: grid;
          grid-template-columns:
            minmax(0, 0.88fr)
            minmax(0, 0.92fr)
            minmax(0, 1fr)
            minmax(0, 0.95fr)
            minmax(0, 1fr)
            minmax(0, 1.18fr);
          overflow: hidden;
          border-radius: 0;
          border: none;
          border-top: 1px solid rgba(120,157,194,0.44);
          background: linear-gradient(145deg, #15273a, #0b1725);
          backdrop-filter: none;
          box-shadow:
            0 9px 22px rgba(0,0,0,0.17),
            inset 0 1px 0 rgba(255,255,255,0.055);
        }

        .kpi {
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.4cqw;
          min-width: 0;
          padding: 0.52cqw 0.48cqw;
        }

        .kpi:not(:last-child)::after {
          content: "";
          position: absolute;
          top: 18%;
          right: 0;
          bottom: 18%;
          width: 1px;
          background: rgba(255,255,255,0.09);
        }

        .kpi-icon {
          width: 2.55cqw;
          height: 2.55cqw;
          max-width: 40px;
          max-height: 40px;
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          border: 1px solid currentColor;
          background: rgba(255,255,255,0.04);
        }

        .kpi-icon ha-icon {
          --mdc-icon-size: 1.5cqw;
        }

        .kpi-icon.green { color: #7ce481; }
        .kpi-icon.orange { color: #ffc249; }
        .kpi-icon.yellow { color: #facc15; }
        .kpi-icon.blue { color: #57b7ff; }
        .kpi-icon.purple { color: #b16eff; }
        .kpi-icon.cyan { color: #4fcaff; }
        .kpi-icon.lime { color: #a0ed70; }

        .kpi-text { min-width: 0; }

        .kpi-label {
          font-size: clamp(9px, 0.74cqw, 12px);
          color: rgba(221,230,241,0.76);
          white-space: nowrap;
        }

        .kpi-value {
          margin-top: 0.2cqw;
          font-size: clamp(14px, 1.15cqw, 19px);
          line-height: 1;
          font-weight: 770;
          white-space: nowrap;
        }

        .updated {
          position: absolute;
          z-index: 11;
          right: 5px;
          bottom: 2px;
          font-size: clamp(7px, 0.58cqw, 9px);
          color: rgba(219,226,238,0.62);
          white-space: nowrap;
        }

        @container (max-width: 620px) {
          .panel-sub,
          .grid-caption,
          .home-sub,
          .weather-label {
            opacity: 0.88;
          }

          .kpi {
            gap: 0.45cqw;
            padding: 0.45cqw;
          }

          .kpi-icon {
            width: 2.7cqw;
            height: 2.7cqw;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .particle {
            display: none !important;
          }

          .background-image {
            transition: none !important;
          }
        }
      `;
    }
  }

  customElements.define(CARD_TAG, EnergyHouseOverviewCard);

  window.customCards = window.customCards || [];
  if (!window.customCards.some((card) => card.type === CARD_TAG)) {
    window.customCards.push({
      type: CARD_TAG,
      name: "Energy House Aligned V4.7",
      description:
        "Energieoverzicht met live woningflows en Energy-dashboardstatistieken.",
      preview: true,
    });
  }

  console.info(
      "%c ENERGY-HOUSE-ALIGNED-V47-CARD %c v4.7.4 leiding-en-grondstop ",
    "color:white;background:#2563eb;font-weight:700;padding:2px 5px",
    "color:#2563eb;background:#dbeafe;font-weight:700;padding:2px 5px"
  );
})();
