/*
 * House Power Flow Card - Responsive production layout
 * ------------------------------------------------------------
 * Responsive Home Assistant layout based on the proven Beta 8 implementation.
 *
 * This source is bundled after the internal base class. Home Assistant users
 * load only house-power-flow-card.js and use custom:house-power-flow-card.
 *
 * Responsive behaviour:
 * - layout_mode: auto    -> phone portrait uses mobile layout
 *                           phone landscape uses a compact landscape layout
 *                           tablet / desktop uses the original base layout
 * - layout_mode: mobile  -> always use mobile layout
 * - layout_mode: desktop -> always use original desktop/tablet layout
 *
 * The mobile layout deliberately keeps:
 * - the original house/weather image
 * - the PV / grid / battery / gas panels
 * - the home-use donut
 * - the animated energy flows
 * - the daily KPI values
 *
 * Phone presentation is responsive by orientation:
 * - wider/readable side panels
 * - larger home-use panel with donut
 * - KPI footer becomes 3 columns x 2 rows
 * - last-update text is hidden
 */

(async () => {
  const BASE_TAG = "house-power-flow-card-base";
  const BETA_TAG = "house-power-flow-card";
  const VERSION = "5.2.1";
  const MOBILE_BREAKPOINT = 600;
  const LANDSCAPE_MAX_WIDTH = 1000;
  const LANDSCAPE_MAX_HEIGHT = 700;

  if (customElements.get(BETA_TAG)) {
    console.info(`${BETA_TAG} is already registered.`);
    return;
  }

  // The responsive production card extends the internal base in this bundle.
  if (!customElements.get(BASE_TAG)) {
    try {
      await customElements.whenDefined(BASE_TAG);
    } catch (error) {
      console.error(
        "HOUSE-POWER-FLOW-CARD: internal base card could not be loaded.",
        error
      );
      return;
    }
  }

  const BaseCard = customElements.get(BASE_TAG);

  if (!BaseCard) {
    console.error(
      "HOUSE-POWER-FLOW-CARD: internal base class is not registered."
    );
    return;
  }

  const MOBILE_CSS = `
    /* =========================================================
       MOBILE LAYOUT
       ========================================================= */

    :host(.mobile-layout) {
      display: block !important;
      width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
    }

    :host(.mobile-layout) ha-card {
      width: 100% !important;
      height: auto !important;
      min-height: 0 !important;

      /*
       * Close to the original phone composition, but with enough
       * height for two readable KPI rows.
       */
      aspect-ratio: 1.34 / 1 !important;

      border-radius: 24px !important;
    }

    :host(.mobile-layout) .canvas {
      position: absolute !important;
      inset: 0 !important;
    }

    /*
     * Keep background + flow SVG on the exact same coordinate system.
     * We therefore deliberately keep preserveAspectRatio="slice".
     */
    :host(.mobile-layout) .scene {
      width: 100% !important;
      height: 100% !important;

      /*
       * Portrait v8:
       * no artificial SVG shrink. The shorter 1.34:1 card ratio
       * reveals a little more of the original 1536x1024 scene while
       * keeping background and flow paths pixel-locked. The left
       * panels and footer were rebalanced so no text is clipped.
       */
      transform: scale(1) !important;
      transform-origin: center center !important;
    }

    :host(.mobile-layout) .shade {
      background:
        linear-gradient(
          180deg,
          rgba(3,10,18,0.42) 0%,
          rgba(3,10,18,0.10) 15%,
          rgba(3,10,18,0.02) 43%,
          rgba(3,10,18,0.05) 63%,
          rgba(3,10,18,0.40) 75%,
          rgba(3,10,18,0.78) 100%
        ) !important;
    }


    /* =========================================================
       HEADER
       ========================================================= */

    :host(.mobile-layout) header {
      top: 2.4% !important;
      left: 3% !important;
      right: 3% !important;

      align-items: flex-start !important;
    }

    :host(.mobile-layout) .heading {
      gap: 6px !important;
    }

    :host(.mobile-layout) .heading-icon {
      width: 28px !important;
      height: 28px !important;
      max-width: 28px !important;
      max-height: 28px !important;

      border-radius: 8px !important;
    }

    :host(.mobile-layout) .heading-icon ha-icon {
      --mdc-icon-size: 15px !important;
    }

    :host(.mobile-layout) .title {
      font-size: 19px !important;
      line-height: 20px !important;
      letter-spacing: -0.025em !important;
    }

    :host(.mobile-layout) .live {
      margin-top: 2px !important;

      font-size: 10px !important;
      line-height: 12px !important;
    }

    :host(.mobile-layout) .live i {
      width: 5px !important;
      height: 5px !important;
      margin-left: 3px !important;
    }


    /* =========================================================
       WEATHER
       ========================================================= */

    :host(.mobile-layout) .weather {
      gap: 5px !important;
      margin-right: 0 !important;
      align-items: center !important;
    }

    :host(.mobile-layout) .weather ha-icon {
      --mdc-icon-size: 17px !important;
    }

    :host(.mobile-layout) .temperature {
      font-size: 20px !important;
      line-height: 21px !important;
    }

    :host(.mobile-layout) .weather-label {
      margin-top: 2px !important;

      font-size: 9px !important;
      line-height: 11px !important;

      opacity: 0.92 !important;
    }


    /* =========================================================
       PANEL BASE
       ========================================================= */

    :host(.mobile-layout) .panel {
      gap: 4px !important;

      border-radius: 11px !important;

      background:
        linear-gradient(
          145deg,
          rgba(22,45,68,0.95),
          rgba(10,25,40,0.96)
        ) !important;

      box-shadow:
        0 5px 14px rgba(0,0,0,0.27),
        inset 0 1px 0 rgba(255,255,255,0.055) !important;
    }

    :host(.mobile-layout) .panel > div:last-child {
      min-width: 0 !important;
      overflow: visible !important;
    }


    /* =========================================================
       LEFT PANELS
       ========================================================= */

    :host(.mobile-layout) .solar-panel {
      left: 2.2% !important;
      top: 21.2% !important;

      width: 27.5% !important;
      height: 12.2% !important;

      padding: 3px 5px !important;
    }

    :host(.mobile-layout) .grid-panel {
      left: 2.2% !important;
      top: 34.2% !important;

      width: 27.5% !important;
      height: 18.0% !important;

      padding: 3px 5px !important;
    }

    :host(.mobile-layout) .battery-panel {
      left: 2.2% !important;
      top: 53.0% !important;

      width: 27.5% !important;
      height: 12.2% !important;

      padding: 3px 5px !important;
    }

    :host(.mobile-layout) .gas-panel {
      left: 2.2% !important;
      top: 66.0% !important;

      width: 27.5% !important;
      height: 11.5% !important;

      padding: 3px 5px !important;
    }


    /* =========================================================
       LEFT PANEL ICONS
       ========================================================= */

    :host(.mobile-layout) .panel-icon,
    :host(.mobile-layout) .battery-icon {
      width: 16px !important;
      height: 16px !important;
      flex: 0 0 16px !important;
    }

    :host(.mobile-layout) .panel-icon ha-icon,
    :host(.mobile-layout) .battery-icon ha-icon {
      --mdc-icon-size: 10px !important;
    }


    /* =========================================================
       LEFT PANEL TEXT
       ========================================================= */

    :host(.mobile-layout) .panel-label {
      font-size: 9px !important;
      line-height: 9px !important;

      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }

    :host(.mobile-layout) .panel-value {
      margin-top: 1px !important;

      font-size: 14px !important;
      line-height: 14px !important;

      white-space: nowrap !important;
    }

    :host(.mobile-layout) .panel-sub {
      margin-top: 1px !important;

      font-size: 7px !important;
      line-height: 7px !important;

      opacity: 0.90 !important;

      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }


    /* =========================================================
       GRID IMPORT / EXPORT
       ========================================================= */

    :host(.mobile-layout) .grid-import,
    :host(.mobile-layout) .grid-export {
      margin-top: 1px !important;

      font-size: 11px !important;
      line-height: 11px !important;

      white-space: nowrap !important;
    }

    :host(.mobile-layout) .grid-caption {
      margin-top: 0 !important;
      margin-left: 0 !important;

      font-size: 7px !important;
      line-height: 7px !important;

      opacity: 0.84 !important;

      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }


    /* =========================================================
       BATTERY
       ========================================================= */

    :host(.mobile-layout) .battery-data {
      min-width: 0 !important;
      overflow: hidden !important;
    }

    :host(.mobile-layout) .battery-title {
      display: flex !important;
      align-items: baseline !important;
      gap: 2px !important;

      font-size: 8px !important;
      line-height: 8px !important;

      white-space: nowrap !important;
    }

    :host(.mobile-layout) .battery-current {
      margin-top: 1px !important;
    }

    :host(.mobile-layout) .battery-current strong {
      font-size: 10px !important;
      line-height: 10px !important;
    }

    :host(.mobile-layout) .battery-current small {
      margin-top: 1px !important;

      font-size: 7px !important;
      line-height: 7px !important;

      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }


    /* =========================================================
       HOME USE / DONUT
       The donut deliberately remains visible on mobile.
       ========================================================= */

    :host(.mobile-layout) .home-panel {
      right: 2.0% !important;
      top: 30.0% !important;

      width: 17.2% !important;
      min-height: 21.0% !important;

      padding: 3px 2px !important;

      border-radius: 9px !important;
    }

    :host(.mobile-layout) .home-ring {
      width: 34px !important;
      height: 34px !important;

      max-width: 34px !important;
      max-height: 34px !important;

      margin: 0 auto 2px !important;
    }

    :host(.mobile-layout) .home-ring::before {
      inset: 3px !important;
    }

    :host(.mobile-layout) .home-ring ha-icon {
      --mdc-icon-size: 15px !important;
    }

    :host(.mobile-layout) .home-label {
      font-size: 7.5px !important;
      line-height: 8px !important;
    }

    :host(.mobile-layout) .home-value {
      margin-top: 2px !important;

      font-size: 14px !important;
      line-height: 15px !important;

      white-space: nowrap !important;
    }

    :host(.mobile-layout) .home-sub {
      margin-top: 1px !important;

      font-size: 6px !important;
      line-height: 7px !important;

      opacity: 0.87 !important;
    }

    :host(.mobile-layout) .home-total {
      margin-top: 3px !important;
      padding-top: 2px !important;

      font-size: 6px !important;
      line-height: 7px !important;
    }

    :host(.mobile-layout) .home-total strong {
      margin-top: 1px !important;

      font-size: 10px !important;
      line-height: 11px !important;

      white-space: nowrap !important;
    }


    /* =========================================================
       SUPPORT BUTTON
       ========================================================= */

    :host(.mobile-layout) .support-button {
      top: 3px !important;
      right: 3px !important;

      width: 18px !important;
      height: 18px !important;

      min-width: 18px !important;
      min-height: 18px !important;
    }

    :host(.mobile-layout) .support-button ha-icon {
      --mdc-icon-size: 10px !important;
    }


    /* =========================================================
       KPI FOOTER
       Desktop: 6 next to each other
       Mobile : 3 columns x 2 rows
       ========================================================= */

    :host(.mobile-layout) .kpi-bar {
      height: 21.5% !important;

      grid-template-columns:
        repeat(6, minmax(0, 1fr)) !important;

      grid-template-rows:
        repeat(2, minmax(0, 1fr)) !important;

      background:
        linear-gradient(
          145deg,
          rgba(20,42,63,0.985),
          rgba(8,22,35,0.995)
        ) !important;
    }

    :host(.mobile-layout) .kpi {
      box-sizing: border-box !important;

      min-width: 0 !important;

      gap: 4px !important;
      padding: 4px 5px !important;

      border-right:
        1px solid rgba(255,255,255,0.07) !important;

      border-bottom:
        1px solid rgba(255,255,255,0.07) !important;

      grid-column: span 2;
    }

    :host(.mobile-layout) .kpi:not(:last-child)::after {
      display: none !important;
    }

    :host(.mobile-layout) .kpi:nth-child(3n) {
      border-right: none !important;
    }

    :host(.mobile-layout) .kpi:nth-last-child(-n + 3) {
      border-bottom: none !important;
    }

    :host(.mobile-layout) .kpi-bar[data-visible-count="5"] .kpi:nth-child(4) {
      grid-column: 2 / span 2;
    }

    :host(.mobile-layout) .kpi-bar[data-visible-count="5"] .kpi:nth-child(5) {
      border-right: none !important;
    }

    :host(.mobile-layout) .kpi-icon {
      width: 20px !important;
      height: 20px !important;

      max-width: 20px !important;
      max-height: 20px !important;

      flex: 0 0 20px !important;
    }

    :host(.mobile-layout) .kpi-icon ha-icon {
      --mdc-icon-size: 12px !important;
    }

    :host(.mobile-layout) .kpi-text {
      min-width: 0 !important;
      overflow: hidden !important;
    }

    :host(.mobile-layout) .kpi-label {
      font-size: 7.5px !important;
      line-height: 8px !important;

      color:
        rgba(226,234,244,0.80) !important;

      white-space: normal !important;

      display: -webkit-box !important;
      -webkit-line-clamp: 2 !important;
      -webkit-box-orient: vertical !important;

      overflow: hidden !important;
    }

    :host(.mobile-layout) .kpi-value {
      margin-top: 1px !important;

      font-size: 11.5px !important;
      line-height: 12px !important;

      font-weight: 780 !important;

      white-space: nowrap !important;

      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }


    /* =========================================================
       LAST UPDATE
       ========================================================= */

    :host(.mobile-layout) .updated {
      display: none !important;
    }


    /* =========================================================
       SUPPORT POPUP
       ========================================================= */

    :host(.mobile-layout) .support-dialog {
      padding: 5% !important;
    }

    :host(.mobile-layout) .support-dialog-card {
      width: 88% !important;
      padding: 18px !important;
      border-radius: 16px !important;
    }

    :host(.mobile-layout) .support-dialog-card h2 {
      font-size: 18px !important;
    }

    /* =========================================================
       PHONE LANDSCAPE LAYOUT
       ========================================================= */

    :host(.phone-landscape-layout) {
      display: block !important;
      width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
    }

    :host(.phone-landscape-layout) ha-card {
      width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
      aspect-ratio: 2 / 1 !important;
      border-radius: 22px !important;
    }

    :host(.phone-landscape-layout) .canvas {
      position: absolute !important;
      inset: 0 !important;
    }

    :host(.phone-landscape-layout) .scene {
      width: 100% !important;
      height: 100% !important;
      transform: scale(1.28) !important;
      transform-origin: center center !important;
    }

    :host(.phone-landscape-layout) .shade {
      background:
        linear-gradient(
          180deg,
          rgba(3,10,18,0.24) 0%,
          rgba(3,10,18,0.06) 18%,
          rgba(3,10,18,0.02) 45%,
          rgba(3,10,18,0.04) 62%,
          rgba(3,10,18,0.18) 80%,
          rgba(3,10,18,0.36) 100%
        ) !important;
    }

    :host(.phone-landscape-layout) header {
      top: 2.2% !important;
      left: 2.0% !important;
      right: 2.0% !important;
    }

    :host(.phone-landscape-layout) .heading {
      gap: 0.55cqw !important;
    }

    :host(.phone-landscape-layout) .heading-icon {
      width: 3.2cqw !important;
      height: 3.2cqw !important;
      max-width: 46px !important;
      max-height: 46px !important;
      border-radius: 0.85cqw !important;
    }

    :host(.phone-landscape-layout) .heading-icon ha-icon {
      --mdc-icon-size: 1.85cqw !important;
    }

    :host(.phone-landscape-layout) .title {
      font-size: clamp(16px, 1.55cqw, 24px) !important;
      line-height: 1.02 !important;
    }

    :host(.phone-landscape-layout) .live {
      margin-top: 0.08cqw !important;
      font-size: clamp(9px, 0.72cqw, 12px) !important;
    }

    :host(.phone-landscape-layout) .weather {
      gap: 0.55cqw !important;
      margin-right: 1.8cqw !important;
    }

    :host(.phone-landscape-layout) .weather ha-icon {
      --mdc-icon-size: 1.95cqw !important;
    }

    :host(.phone-landscape-layout) .temperature {
      font-size: clamp(17px, 1.55cqw, 24px) !important;
      line-height: 1 !important;
    }

    :host(.phone-landscape-layout) .weather-label {
      margin-top: 0.08cqw !important;
      font-size: clamp(8px, 0.64cqw, 11px) !important;
    }

    :host(.phone-landscape-layout) .solar-panel,
    :host(.phone-landscape-layout) .grid-panel,
    :host(.phone-landscape-layout) .battery-panel,
    :host(.phone-landscape-layout) .gas-panel {
      left: 1.15% !important;
      width: 12.7% !important;
      gap: 0.38cqw !important;
      padding: 0.38cqw 0.38cqw !important;
      border-radius: 0.88cqw !important;
    }

    :host(.phone-landscape-layout) .solar-panel {
      top: 20.8% !important;
      height: 12.1% !important;
    }

    :host(.phone-landscape-layout) .grid-panel {
      top: 33.5% !important;
      height: 17.6% !important;
    }

    :host(.phone-landscape-layout) .battery-panel {
      top: 52.0% !important;
      height: 12.0% !important;
    }

    :host(.phone-landscape-layout) .gas-panel {
      top: 64.6% !important;
      height: 12.0% !important;
    }

    :host(.phone-landscape-layout) .panel-icon,
    :host(.phone-landscape-layout) .battery-icon {
      width: 2.2cqw !important;
      height: 2.2cqw !important;
    }

    :host(.phone-landscape-layout) .panel-icon ha-icon,
    :host(.phone-landscape-layout) .battery-icon ha-icon {
      --mdc-icon-size: 1.22cqw !important;
    }

    :host(.phone-landscape-layout) .panel-label {
      font-size: clamp(8px, 0.66cqw, 11px) !important;
      line-height: 1.02 !important;
    }

    :host(.phone-landscape-layout) .panel-value {
      margin-top: 0.10cqw !important;
      font-size: clamp(12px, 0.98cqw, 17px) !important;
      line-height: 1 !important;
    }

    :host(.phone-landscape-layout) .panel-sub,
    :host(.phone-landscape-layout) .grid-caption {
      margin-top: 0.08cqw !important;
      font-size: clamp(6px, 0.48cqw, 8px) !important;
      line-height: 1.02 !important;
    }

    :host(.phone-landscape-layout) .grid-import,
    :host(.phone-landscape-layout) .grid-export {
      margin-top: 0.12cqw !important;
      font-size: clamp(10px, 0.82cqw, 14px) !important;
      line-height: 1 !important;
    }

    :host(.phone-landscape-layout) .grid-caption {
      margin-left: 0.62cqw !important;
    }

    :host(.phone-landscape-layout) .battery-title {
      gap: 0.16cqw !important;
      font-size: clamp(8px, 0.66cqw, 11px) !important;
      line-height: 1.02 !important;
    }

    :host(.phone-landscape-layout) .battery-current {
      margin-top: 0.08cqw !important;
    }

    :host(.phone-landscape-layout) .battery-current strong {
      font-size: clamp(10px, 0.80cqw, 14px) !important;
      line-height: 1 !important;
    }

    :host(.phone-landscape-layout) .battery-current small {
      margin-top: 0.06cqw !important;
      font-size: clamp(6px, 0.48cqw, 8px) !important;
      line-height: 1.02 !important;
    }

    /* Smaller right card so more of the image remains visible. */
    :host(.phone-landscape-layout) .home-panel {
      right: 1.35% !important;
      top: 26.0% !important;
      width: 10.7% !important;
      min-height: 23.4% !important;
      padding: 0.46cqw 0.42cqw 0.52cqw !important;
      border-radius: 0.88cqw !important;
    }

    :host(.phone-landscape-layout) .home-ring {
      width: 4.35cqw !important;
      height: 4.35cqw !important;
      max-width: 70px !important;
      max-height: 70px !important;
      margin: 0 auto 0.22cqw !important;
    }

    :host(.phone-landscape-layout) .home-ring::before {
      inset: 0.38cqw !important;
    }

    :host(.phone-landscape-layout) .home-ring ha-icon {
      --mdc-icon-size: 2.15cqw !important;
    }

    :host(.phone-landscape-layout) .home-label {
      font-size: clamp(9px, 0.74cqw, 12px) !important;
      line-height: 1.02 !important;
    }

    :host(.phone-landscape-layout) .home-value {
      margin-top: 0.16cqw !important;
      font-size: clamp(12px, 1.42cqw, 22px) !important;
      line-height: 1 !important;
      white-space: nowrap !important;
    }

    :host(.phone-landscape-layout) .home-sub {
      margin-top: 0.12cqw !important;
      font-size: clamp(7px, 0.54cqw, 9px) !important;
      line-height: 1.02 !important;
    }

    :host(.phone-landscape-layout) .home-total {
      margin-top: 0.22cqw !important;
      padding-top: 0.22cqw !important;
      font-size: clamp(7px, 0.54cqw, 9px) !important;
      line-height: 1.02 !important;
    }

    :host(.phone-landscape-layout) .home-total strong {
      margin-top: 0.10cqw !important;
      font-size: clamp(10px, 0.92cqw, 15px) !important;
      line-height: 1 !important;
      white-space: nowrap !important;
    }

    :host(.phone-landscape-layout) .support-button {
      top: 0.24cqw !important;
      right: 0.24cqw !important;
      width: 1.75cqw !important;
      height: 1.75cqw !important;
      min-width: 22px !important;
      min-height: 22px !important;
    }

    :host(.phone-landscape-layout) .support-button ha-icon {
      --mdc-icon-size: 0.92cqw !important;
    }

    :host(.phone-landscape-layout) .kpi-bar {
      height: 12.2% !important;
    }

    :host(.phone-landscape-layout) .kpi {
      gap: 0.24cqw !important;
      padding: 0.26cqw 0.28cqw !important;
    }

    :host(.phone-landscape-layout) .kpi-icon {
      width: 1.85cqw !important;
      height: 1.85cqw !important;
      max-width: 30px !important;
      max-height: 30px !important;
    }

    :host(.phone-landscape-layout) .kpi-icon ha-icon {
      --mdc-icon-size: 1.00cqw !important;
    }

    :host(.phone-landscape-layout) .kpi-label {
      font-size: clamp(7px, 0.52cqw, 9px) !important;
    }

    :host(.phone-landscape-layout) .kpi-value {
      margin-top: 0.06cqw !important;
      font-size: clamp(10px, 0.82cqw, 14px) !important;
      line-height: 1 !important;
    }

    :host(.phone-landscape-layout) .updated {
      right: 4px !important;
      bottom: 1px !important;
      font-size: clamp(6px, 0.42cqw, 8px) !important;
    }

  `;

  class HousePowerFlowCardBeta8 extends BaseCard {
    constructor() {
      super();

      this._betaPortraitQuery = window.matchMedia(
        `(max-width: ${MOBILE_BREAKPOINT}px)`
      );

      this._betaLandscapePhoneQuery = window.matchMedia(
        `(orientation: landscape) and (max-width: ${LANDSCAPE_MAX_WIDTH}px) and (max-height: ${LANDSCAPE_MAX_HEIGHT}px) and (pointer: coarse)`
      );

      this._betaMediaListener = () => {
        this._applyBetaLayout();
      };
    }

    setConfig(config) {
      super.setConfig({
        layout_mode: "auto",
        ...config,
      });

      this._ensureBetaStyles();
      this._applyBetaLayout();
    }

    connectedCallback() {
      super.connectedCallback?.();

      for (const query of [
        this._betaPortraitQuery,
        this._betaLandscapePhoneQuery,
      ]) {
        query.addEventListener?.(
          "change",
          this._betaMediaListener
        );

        // Safari / older WebView fallback.
        query.addListener?.(
          this._betaMediaListener
        );
      }

      this._ensureBetaStyles();
      this._applyBetaLayout();
    }

    disconnectedCallback() {
      for (const query of [
        this._betaPortraitQuery,
        this._betaLandscapePhoneQuery,
      ]) {
        query.removeEventListener?.(
          "change",
          this._betaMediaListener
        );

        query.removeListener?.(
          this._betaMediaListener
        );
      }

      super.disconnectedCallback?.();
    }

    _ensureBetaStyles() {
      if (!this.shadowRoot) return;

      let style = this.shadowRoot.getElementById(
        "house-power-flow-responsive-style"
      );

      if (!style) {
        style = document.createElement("style");
        style.id = "house-power-flow-responsive-style";
        style.textContent = MOBILE_CSS;
        this.shadowRoot.appendChild(style);
      }
    }

    _resolvedLayoutMode() {
      const requested = String(
        this._config?.layout_mode || "auto"
      ).toLowerCase();

      if (requested === "mobile") return "mobile";
      if (requested === "desktop") return "desktop";

      if (this._betaLandscapePhoneQuery.matches) {
        return "phone-landscape";
      }

      if (this._betaPortraitQuery.matches) {
        return "mobile";
      }

      return "desktop";
    }

    _applyBetaLayout() {
      const mode = this._resolvedLayoutMode();
      const mobile = mode === "mobile";
      const phoneLandscape = mode === "phone-landscape";
      const desktop = mode === "desktop";

      this.classList.toggle("mobile-layout", mobile);
      this.classList.toggle("phone-landscape-layout", phoneLandscape);
      this.classList.toggle("desktop-layout", desktop);

      this.dataset.layoutMode = mode;

      const scene = this.shadowRoot?.querySelector(".scene");
      if (scene) {
        scene.setAttribute(
          "preserveAspectRatio",
          phoneLandscape ? "xMidYMid meet" : "xMidYMid slice"
        );
      }
    }

    static getStubConfig() {
      const base =
        typeof BaseCard.getStubConfig === "function"
          ? BaseCard.getStubConfig()
          : {};

      return {
        ...base,
        type: `custom:${BETA_TAG}`,
        layout_mode: "auto",
      };
    }
  }

  customElements.define(
    BETA_TAG,
    HousePowerFlowCardBeta8
  );

  window.customCards = window.customCards || [];

  if (
    !window.customCards.some(
      (card) => card.type === BETA_TAG
    )
  ) {
    window.customCards.push({
      type: BETA_TAG,
      name: "House Power Flow Card",
      description:
        "Responsive power flow card with automatic portrait, phone-landscape and desktop layouts.",
      preview: true,
    });
  }

  console.info(
    `%c HOUSE-POWER-FLOW-CARD %c v${VERSION} `,
    "color:white;background:#7c3aed;font-weight:700;padding:2px 5px",
    "color:#7c3aed;background:#ede9fe;font-weight:700;padding:2px 5px"
  );
})();
