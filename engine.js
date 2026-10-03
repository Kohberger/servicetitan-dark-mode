/* ===== ST-DARK: CSP/Host Gate ==============================================
   Prevents CSP errors on strict pages (e.g., idp/authorize callbacks) by
   disabling all style/script modifications unless we're on the main app host.
   Update the allowlist below if your tenant uses a different app domain.
============================================================================= */
(function(){ if (window.__ST_DARK_SKIP__) return;
  try {
    var h = location.hostname;
    var ok =
      /(?:^|\.)go\.servicetitan\.com$/i.test(h) ||
      /(?:^|\.)go2\.servicetitan\.com$/i.test(h) ||
      /(?:^|\.)qa\.servicetitan\.com$/i.test(h) ||
      /(?:^|\.)staging\.servicetitan\.com$/i.test(h) ||
      /(?:^|\.)enterprise-hub\.servicetitan\.com$/i.test(h);
    // Skip injection for anything else (e.g., impersonation-idp.servicetitan.com)
    window.__ST_DARK_SKIP__ = !ok;

    // ---- Print-page gate -----------------------------------------------
    // ServiceTitan opens print-only pages (e.g. invoice/estimate templates)
    // in a new tab and immediately calls window.print() on that tab from the
    // opener, before our wrapper can intercept it.  These pages are meant
    // solely for printing and should always render in light mode, so skip
    // dark-mode injection entirely when the URL path is a print template.
    if (!window.__ST_DARK_SKIP__) {
      var p = location.pathname + location.search;
      var isPrintPage =
        /\/app\/api\/.*\/print\//i.test(p) ||   // accounting/estimating print templates
        /\/Invoice\/Print\//i.test(p) ||         // legacy invoice print route
        /\/Estimate\/Print\//i.test(p) ||        // legacy estimate print route
        /[?&]print=true/i.test(p);               // any page with ?print=true flag
      if (isPrintPage) window.__ST_DARK_SKIP__ = true;
    }
    // --------------------------------------------------------------------
  } catch (e) {
    window.__ST_DARK_SKIP__ = true;
  }
})();

// engine.js — PAGE WORLD (MAIN). Targeted dark fixes for ServiceTitan Settings sidebar.
(function(){ if (window.__ST_DARK_SKIP__) return;
  if (window.__ST_DARK_SKIP__) return;

  let enabled = false;
  const isEHub = /^enterprise-hub\./i.test(location.hostname);

  const STYLE_ID = "st-dark-style";
  const ensureStyle = () => {
    let st = document.getElementById(STYLE_ID);
    if (!st) {
      st = document.createElement("style");
      st.id = STYLE_ID;
      st.type = "text/css";
      document.documentElement.appendChild(st);
    }
    return st;
  };

  const CSS = `
    html[data-st-dark="on"] { filter: invert(1) hue-rotate(180deg) contrast(0.85) !important; color-scheme: dark !important; }
/* ===== ST-DARK: Global canvas background ==================================
   Desired visible color: #252829
   Because the whole page is inverted on <html>, we set the *base* color to
   the inverse of #252829 (#DAD7D6). After invert(1) it renders as #252829.
=========================================================================== */
html[data-st-dark="on"],
html[data-st-dark="on"] body{
  background-color: #DAD7D6 !important;
}
html[data-st-dark="on"] :is(#app, #root, main, [data-anv="app-root"], .app-layout, .app-layout-main, .app-layout-content){
  background-color: #DAD7D6 !important;
}
/* ===== Dispatch board: darker, cooler background ===========================
   The lighter global bg (#252829) looks too washed-out on the dense grid of
   the dispatch board. When data-st-dispatch="on" is stamped on <html> by the
   route-watcher IIFE, use a deeper cool near-black: visible ~#16181A
   (pre-inversion CSS value: #F7F9FC). v1.5 dispatch polish: this is the
   canvas the board's rows (#1C1F22) and group bands (#24272B) sit on; see the
   dispatch block in SHADOW_CSS. The extra attribute raises specificity above
   the general rule so no !important ordering games are needed.
=========================================================================== */
html[data-st-dark="on"][data-st-dispatch="on"],
html[data-st-dark="on"][data-st-dispatch="on"] body {
  background-color: #F7F9FC !important;
}
html[data-st-dark="on"][data-st-dispatch="on"] :is(#app, #root, main, [data-anv="app-root"], .app-layout, .app-layout-main, .app-layout-content) {
  background-color: #F7F9FC !important;
}
/* ===== Tag Types settings page: perfect swatch color reproduction ===========
   The CSS filter chain invert+hue-rotate+contrast is mathematically lossy for
   highly-saturated colours because intermediate channel values exceed [0,1]
   and get clamped — no child filter or JS pre-distortion can undo this loss.

   Solution: when data-st-tagtypes="on" is stamped on <html> (by the route
   watcher inside the main IIFE), override the html filter to plain invert(1).
   A child filter of invert(1) on the swatch then produces double-inversion
   which is a perfect identity for every colour — no clamping ever occurs.

   Side-effect compensation: with only invert(1) on html, chromatic elements
   that look correct under the full filter now appear hue-shifted (orange↔blue).
   We restore them with the compound filter F = invert hue-rotate(180) contrast(0.85) invert,
   which, when combined with the html invert(1), exactly reproduces the full
   filter's output for any element — without touching the swatches.

   • Buttons          — visible orange↔blue swap on .ui.button / .Button / st-btn
   • Emoji spans      — [data-emoji-wrapped] get double-inversion (= identity)
   • BCN promo modal  — #st-dark-promo-overlay gets F to match full-filter look
============================================================================ */
html[data-st-dark="on"][data-st-tagtypes="on"] {
  filter: invert(1) !important;
}
html[data-st-dark="on"][data-st-tagtypes="on"] .tag-type-color-container,
html[data-st-dark="on"][data-st-tagtypes="on"] [class*="_chip_"],
html[data-st-dark="on"][data-st-tagtypes="on"] .tag-type-color-picker,
html[data-st-dark="on"][data-st-tagtypes="on"] .colorpicker,
html[data-st-dark="on"][data-st-tagtypes="on"] input,
html[data-st-dark="on"][data-st-tagtypes="on"] select,
html[data-st-dark="on"][data-st-tagtypes="on"] textarea {
  filter: invert(1) !important;
}
/* Double-inversion on inputs = identity, so the default white background stays
   white. Explicitly set dark colors — they appear as-is through the identity. */
html[data-st-dark="on"][data-st-tagtypes="on"] input,
html[data-st-dark="on"][data-st-tagtypes="on"] select,
html[data-st-dark="on"][data-st-tagtypes="on"] textarea {
  background-color: #1e1e1e !important;
  color: #f0f0f0 !important;
  -webkit-text-fill-color: #f0f0f0 !important;
}
/* Inputs nested inside .tag-type-color-picker or .colorpicker must NOT get the
   extra filter: invert(1) — their parent already has it, so adding a third
   inversion would produce a net single inversion and corrupt colors. Reset them
   so only the parent container's double-inversion applies. */
html[data-st-dark="on"][data-st-tagtypes="on"] .tag-type-color-picker input,
html[data-st-dark="on"][data-st-tagtypes="on"] .colorpicker input {
  filter: none !important;
  background-color: initial !important;
  color: initial !important;
  -webkit-text-fill-color: unset !important;
}
/* Restore correct appearance for chromatic UI elements under the invert(1) override.
   Covers <button> tags, Semantic UI .ui.button, ST React .Button (incl. SPAN-based
   buttons), .st-btn links, navigation badge/indicator elements, sup badges,
   the sample-data banner (.demo-mode-indicator), sandbox/warning banners, and the
   active-state navigation highlight ([class*="navigation-item-active"]).
   IMPORTANT: elements inside #st-dark-promo-overlay are EXCLUDED (see reset below)
   to avoid stacking two compensating filters on the same element. */
html[data-st-dark="on"][data-st-tagtypes="on"] button:not(#st-dark-promo-overlay button),
html[data-st-dark="on"][data-st-tagtypes="on"] .st-btn,
html[data-st-dark="on"][data-st-tagtypes="on"] .ui.button,
html[data-st-dark="on"][data-st-tagtypes="on"] .Button,
html[data-st-dark="on"][data-st-tagtypes="on"] .sandbox-indicator,
html[data-st-dark="on"][data-st-tagtypes="on"] .data-account-indicator,
html[data-st-dark="on"][data-st-tagtypes="on"] .demo-mode-indicator,
html[data-st-dark="on"][data-st-tagtypes="on"] .warning-indicator,
html[data-st-dark="on"][data-st-tagtypes="on"] [class*="navigation-item-active"],
html[data-st-dark="on"][data-st-tagtypes="on"] sup[class*="_badge_"] {
  filter: invert(1) hue-rotate(180deg) contrast(0.85) invert(1) !important;
}
/* Emoji spans: double-inversion with html gives exact identity (original emoji) */
html[data-st-dark="on"][data-st-tagtypes="on"] [data-emoji-wrapped] {
  filter: invert(1) !important;
}
/* BCN promo modal: restore full-filter appearance.
   The modal overlay itself gets the compound compensating filter; any child elements
   that are also targeted by the button/badge rule above would receive the filter
   TWICE (double-stacking), which breaks their colors. Reset children to filter:none
   so only the overlay's single compound filter applies to the whole modal. */
html[data-st-dark="on"][data-st-tagtypes="on"] #st-dark-promo-overlay {
  filter: invert(1) hue-rotate(180deg) contrast(0.85) invert(1) !important;
}
html[data-st-dark="on"][data-st-tagtypes="on"] #st-dark-promo-overlay button,
html[data-st-dark="on"][data-st-tagtypes="on"] #st-dark-promo-overlay .Button,
html[data-st-dark="on"][data-st-tagtypes="on"] #st-dark-promo-overlay [data-emoji-wrapped] {
  filter: none !important;
}

    html[data-st-dark="on"] img, html[data-st-dark="on"] video, html[data-st-dark="on"] picture,
    html[data-st-dark="on"] canvas, html[data-st-dark="on"] svg image { filter: invert(1) hue-rotate(180deg) !important; }
    html[data-st-dark="on"] [style*="background-image"] { filter: invert(1) hue-rotate(180deg) !important; }

/* ===== Classic-layout top nav bar ==========================================
   In the new layout the header uses header-light__* (white bg) and the html
   filter naturally darkens it — no counter-invert needed.
   In the classic layout two separate elements have native dark backgrounds
   (rgb(45,46,49)) that would flip light under the html inversion:
   • [data-cy="header-navigation-top"]  — the logo / search / profile bar
     (carries class header-dark__*)
   • [data-cy="navigation-items"]       — the tab row (Dashboard, Calls, …)
     (carries class header-stacked-nav__*)
   Counter-inverting both restores their original dark appearance.
   SVGs inside are icon glyphs; they look correct after the double-inversion.
============================================================================= */
html[data-st-dark="on"] [data-cy="header-navigation-top"],
html[data-st-dark="on"] [class*="header-dark"],
html[data-st-dark="on"] [data-cy="header-navigation"] [data-cy="navigation-items"],
html[data-st-dark="on"] [data-cy="header-navigation"] [class*="header-stacked-nav"] {
  filter: invert(1) hue-rotate(180deg) !important;
}

    html[data-st-dark="on"] #settingsMenu,
    html[data-st-dark="on"] [id^="settingsMenu"] {
      filter: invert(1) hue-rotate(180deg) !important;
      background-color: #121212 !important;
      color: #f2f2f3 !important;
      color-scheme: dark !important;
    }
    html[data-st-dark="on"] #settingsMenu :where(a, span, div, li, button, p, small, label),
    html[data-st-dark="on"] [id^="settingsMenu"] :where(a, span, div, li, button, p, small, label) {
      color: #f2f2f3 !important;
      opacity: 1 !important;
    }

    html[data-st-dark="on"] #settingsMenu :where(.active, .is-selected, [aria-current="page"], [aria-selected="true"]),
    html[data-st-dark="on"] [id^="settingsMenu"] :where(.active, .is-selected, [aria-current="page"], [aria-selected="true"]) {
      background-color: rgba(255,255,255,0.14) !important;
      color: #ffffff !important;
    }
    html[data-st-dark="on"] #settingsMenu :where(.active a, .is-selected a, [aria-current="page"] a),
    html[data-st-dark="on"] [id^="settingsMenu"] :where(.active a, .is-selected a, [aria-current="page"] a) {
      color: #ffffff !important;
    }

    html[data-st-dark="on"] #settingsMenu .Input,
    html[data-st-dark="on"] [id^="settingsMenu"] .Input,
    html[data-st-dark="on"] #settingsMenu .Input__innerWrapper,
    html[data-st-dark="on"] [id^="settingsMenu"] .Input__innerWrapper,
    html[data-st-dark="on"] #settingsMenu input[type="search"],
    html[data-st-dark="on"] [id^="settingsMenu"] input[type="search"] {
      background-color: #1a1a1a !important;
      border-color: #2a2a2a !important;
      box-shadow: none !important;
      filter: none !important;
      color: #f2f2f3 !important;
      -webkit-text-fill-color: #f2f2f3 !important;
      caret-color: #f2f2f3 !important;
    }
    html[data-st-dark="on"] #settingsMenu input::placeholder,
    html[data-st-dark="on"] [id^="settingsMenu"] input::placeholder {
      color: #a8b0b9 !important; opacity: 1 !important;
    }
  
    /* Preserve built-in dark Side Navigation (no invert) */
    /* .app-layout-side = legacy top-nav layout; [data-cy="side-navigation"] = new side-nav layout */
    html[data-st-dark="on"] .app-layout-side,
    html[data-st-dark="on"] [data-cy="side-navigation"] {
      /* The page-level invert lives on <html>; this cancels it for the side nav region */
      filter: invert(1) hue-rotate(180deg) !important;
    }
    /* Inside side nav, DO NOT re-invert media/backgrounds (avoids triple-inverts) */
    html[data-st-dark="on"] .app-layout-side img,
    html[data-st-dark="on"] .app-layout-side video,
    html[data-st-dark="on"] .app-layout-side picture,
    html[data-st-dark="on"] .app-layout-side canvas,
    html[data-st-dark="on"] .app-layout-side svg image,
    html[data-st-dark="on"] .app-layout-side [style*="background-image"],
    html[data-st-dark="on"] [data-cy="side-navigation"] img,
    html[data-st-dark="on"] [data-cy="side-navigation"] video,
    html[data-st-dark="on"] [data-cy="side-navigation"] picture,
    html[data-st-dark="on"] [data-cy="side-navigation"] canvas,
    html[data-st-dark="on"] [data-cy="side-navigation"] svg image,
    html[data-st-dark="on"] [data-cy="side-navigation"] [style*="background-image"] {
      filter: none !important;
    }


/* ===== Job / resource cards (dispatch board, schedules, etc.) =================
   Cards carry meaningful inline colors (job type, status, urgency) that get
   scrambled by the global invert. Counter-inverting restores them. The parent
   html's contrast(0.85) still applies, giving a gentle softening so the cards
   fit the dark theme rather than looking like a full light-mode island.
   Images/backgrounds inside cards get filter:none to prevent a triple-invert.
============================================================================== */
html[data-st-dark="on"] [data-anv="card"] {
  filter: invert(1) hue-rotate(180deg) !important;
}
html[data-st-dark="on"] [data-anv="card"] img,
html[data-st-dark="on"] [data-anv="card"] video,
html[data-st-dark="on"] [data-anv="card"] picture,
html[data-st-dark="on"] [data-anv="card"] canvas,
html[data-st-dark="on"] [data-anv="card"] svg image,
html[data-st-dark="on"] [data-anv="card"] [style*="background-image"] {
  filter: none !important;
}

/* ===== Chips / tags in the light DOM (calls page, booking, search results) ===
   Chips are semantic status labels (PO Required, Not To Exceed, Opted In, etc.)
   whose colors carry meaning. The global html invert scrambles them:
     - Chromatic chips (green, blue) happen to survive hue-rotate roughly intact.
     - Achromatic chips (light gray "Opted In", dark "Do not auto-send invoice")
       flip completely: light gray -> dark gray, black -> near-white.
   Fix: counter-invert every chip so all colors restore to their original values.
   This mirrors the same technique used for [data-anv="card"] above.

   Exception 1: chips INSIDE [data-anv="card"] — the card's own counter-invert
   already un-inverts all children; adding a chip invert would double-invert them.

   Exception 2: chips INSIDE native [popover] / :popover-open elements — those
   live on the CSS top-layer and never go through the html filter; counter-inverting
   them would introduce a net inversion.  (Dispatch-board popovers are in shadow
   DOM and are handled separately by SHADOW_CSS.)
============================================================================== */
html[data-st-dark="on"] [class*="chip"],
html[data-st-dark="on"] [style*="--int-"],
html[data-st-dark="on"] [data-anvil-component][style*="background-color"] {
  filter: invert(1) hue-rotate(180deg) !important;
}
/* ===== Call booking / call screen search results — legacy Knockout tags ======
   The customer tag chips on the call booking search screen are rendered by an
   older Knockout.js component as plain <span class="label"> elements inside
   ul.callscreen-search-location-results. They use no "chip" class and no CSS
   custom properties in inline style — just background-color/color directly.
   Counter-invert them the same way we do modern chip components.
============================================================================== */
html[data-st-dark="on"] .callscreen-search-location-results .label {
  filter: invert(1) hue-rotate(180deg) !important;
}
/* ===== Settings page color swatches =========================================
   Color swatches (.tag-type-color-container) are handled entirely in JS via
   fixSwatches() / clearSwatches() below.  No CSS filter is applied here because
   CSS filter chains clamp intermediate channel values, which permanently corrupts
   highly-saturated colours (e.g. yellow #FFBE00 needs a pre-distorted blue of
   −0.667, impossible to represent as a pixel).  The JS approach computes the
   exact affine inverse of the combined HTML filter matrix in floating-point and
   writes the result as a plain background-color, letting the HTML filter then
   reconstruct the original colour without any intermediate clamping.
============================================================================== */
html[data-st-dark="on"] [data-anv="card"] [class*="chip"],
html[data-st-dark="on"] [data-anv="card"] [style*="--int-"],
html[data-st-dark="on"] [data-anv="card"] [data-anvil-component][style*="background-color"],
html[data-st-dark="on"] [popover] [class*="chip"],
html[data-st-dark="on"] [popover] [style*="--int-"],
html[data-st-dark="on"] [popover] [data-anvil-component][style*="background-color"],
html[data-st-dark="on"] :popover-open [class*="chip"],
html[data-st-dark="on"] :popover-open [style*="--int-"],
html[data-st-dark="on"] :popover-open [data-anvil-component][style*="background-color"],
/* Popper.js dropdowns are already counter-inverted via [data-popper-placement].
   Applying chip counter-invert inside them would cause triple-inversion. */
html[data-st-dark="on"] [data-popper-placement] [class*="chip"],
html[data-st-dark="on"] [data-popper-placement] [style*="--int-"],
html[data-st-dark="on"] [data-popper-placement] [data-anvil-component][style*="background-color"] {
  filter: none !important;
}

/* ===== Global Search bar — card counter-invert exclusion ====================
   Global search result cards (data-anv="card") live in the light DOM inside
   servicetitan-global-search-bar.  The general [data-anv="card"] rule above
   would double-invert them, but the GS-specific v0.7.x patches were written
   for the shadow-DOM case and don't reach light-DOM elements.  The double-
   inversion therefore produces "black on black" text and white quick-actions.
   Fix: cancel the card counter-invert for GS cards so they stay single-inverted
   (dark bg + light text via the html filter).  Chips inside GS cards lose the
   card filter as their parent, so restore their own counter-invert explicitly.
============================================================================= */
html[data-st-dark="on"] servicetitan-global-search-bar [data-anv="card"],
html[data-st-dark="on"] [data-mfe-name="servicetitan-global-search-bar"] [data-anv="card"] {
  filter: none !important;
}
html[data-st-dark="on"] servicetitan-global-search-bar [data-anv="card"] [class*="chip"],
html[data-st-dark="on"] servicetitan-global-search-bar [data-anv="card"] [style*="--int-"],
html[data-st-dark="on"] servicetitan-global-search-bar [data-anv="card"] [data-anvil-component][style*="background-color"],
html[data-st-dark="on"] [data-mfe-name="servicetitan-global-search-bar"] [data-anv="card"] [class*="chip"],
html[data-st-dark="on"] [data-mfe-name="servicetitan-global-search-bar"] [data-anv="card"] [style*="--int-"],
html[data-st-dark="on"] [data-mfe-name="servicetitan-global-search-bar"] [data-anv="card"] [data-anvil-component][style*="background-color"] {
  filter: invert(1) hue-rotate(180deg) !important;
}


/* ===== Job page Tasks panel — card counter-invert exclusion ================
   The job page's Tasks panel is a [data-anv="card"], so the general card rule
   above counter-inverts it back to a light island. It has no status colors to
   preserve, so cancel the counter-invert and let the html filter darken it like
   the rest of the page. Match the stable component class prefix
   (job-tasks-card__*), never the generated hash suffix. fixJobCards() skips it
   too, so no inline !important filter overrides this.
   Its children lose the card counter-invert as their parent, so chips and media
   get their normal page-level counter-invert back (same as Global Search).
============================================================================= */
html[data-st-dark="on"] [data-anv="card"][class*="job-tasks-card__"] {
  filter: none !important;
}
html[data-st-dark="on"] [data-anv="card"][class*="job-tasks-card__"] [class*="chip"],
html[data-st-dark="on"] [data-anv="card"][class*="job-tasks-card__"] [style*="--int-"],
html[data-st-dark="on"] [data-anv="card"][class*="job-tasks-card__"] [data-anvil-component][style*="background-color"],
html[data-st-dark="on"] [data-anv="card"][class*="job-tasks-card__"] :is(img, video, picture, canvas, svg image, [style*="background-image"]) {
  filter: invert(1) hue-rotate(180deg) !important;
}

/* ===== Job page: one dark background, dark appointment cards ===============
   1) Background. The job page's header strip is white (renders near-black), but
      below it the global canvas (#DAD7D6) showed through as warm gray, so the
      page looked split in two. On the job page, use white as the base so the
      header, the page and the cards read as one dark surface; cards keep their
      borders for separation. .qa-header-job-name is ServiceTitan's QA hook on
      the job title, so this only matches the job page.
   2) Appointment cards. An appointment card's own background-color is its
      status color (the stripe down its left edge), so the chip rule above
      ([data-anvil-component][style*="background-color"]) counter-inverts the
      whole card and leaves a light island. Keep that counter-invert on the
      outer card so the stripe keeps its true color, and invert the content
      section again so the body goes dark like every other card. Chips inside
      still get their own counter-invert, so they keep their true colors.
      v1.5: only when the card itself is counter-inverted, i.e. it carries an
      inline status color that isn't a pale tint. In the Edit Appointment
      drawer the .qa-appointment-card has no inline color and sits inside a
      pale-tinted card, so re-inverting its section turned the form light
      (black inputs, near-invisible labels).
============================================================================= */
html[data-st-dark="on"]:has(.qa-header-job-name),
html[data-st-dark="on"]:has(.qa-header-job-name) body,
html[data-st-dark="on"]:has(.qa-header-job-name) :is(#app, #root, main, [data-anv="app-root"], .app-layout, .app-layout-main, .app-layout-content) {
  background-color: #FFFFFF !important;
}
html[data-st-dark="on"] .qa-appointment-card[style*="background-color"]:not([data-st-card-tint]) > .CardSection {
  filter: invert(1) hue-rotate(180deg) !important;
}

/* ===== Pale-tinted Anvil cards (job flyout, Edit Appointment drawer) ========
   The job flyout and the Edit Appointment drawer (⋮ → Reschedule) wrap the
   appointment in an Anvil Card whose inline background is a pale status tint
   (Scheduled rgb(190,231,245), Dispatched rgb(241,237,255), Working
   rgb(180,229,144), On Hold rgb(255,240,177)). The chip rule above treated
   those like status chips and counter-inverted them, leaving a light island.
   fixChips() marks Cards whose inline background has HSL lightness >= 70%
   with data-st-card-tint and skips the counter-invert, so the html filter
   darkens them like any other surface and the tint survives as a dark wash.
   Mid-tone status colors (the job page's green appointment stripe,
   rgb(24,167,97)) keep the counter-invert. The Edit Appointment drawer's
   outer card (appointment-form-card) is always treated as a surface: its
   color only shows as the left stripe, and the form sits on a nested card.
   Same specificity as the chip rule, so this later rule wins.
============================================================================= */
html[data-st-dark="on"] [data-anvil-component][data-st-card-tint],
html[data-st-dark="on"] [data-anvil-component="Card"][class*="appointment-form-card"] {
  filter: none !important;
}
/* Breadcrumb bar on record pages (the Location page shows "Customer > Location").
   It's transparent, so the gray canvas showed through as a strip above an
   otherwise dark page. Give it the same white base (renders near-black). */
html[data-st-dark="on"] ul.Breadcrumb {
  background-color: #FFFFFF !important;
}

/* ===== Semantic UI dropdown menus (tag picker, form selects, etc.) ===========
   .ui.dropdown .menu items get black text → white via the global html filter,
   which is correct for readability. But emoji characters are color bitmaps and
   get visually distorted by the invert+hue-rotate filter.

   Fix: counter-invert the menu element (net double-inversion ≈ color identity),
   then explicitly set a dark background and light text. After double-inversion:
     - Explicit background-color values render approximately as stated (dark).
     - Explicit text color values render approximately as stated (light).
     - Emoji emerge at approximately their original colors.
   The html's contrast(0.85) still applies as a gentle softening.

   Items also get a subtle divider and hover/selection highlight that read
   correctly on the dark surface.
============================================================================== */
html[data-st-dark="on"] .ui.dropdown .menu {
  filter: invert(1) hue-rotate(180deg) !important;
  background-color: #2d2d2d !important;
  border-color: #3a3a3a !important;
}
html[data-st-dark="on"] .ui.dropdown .menu .item {
  color: #e0e0e0 !important;
  border-top-color: rgba(255,255,255,0.07) !important;
}
html[data-st-dark="on"] .ui.dropdown .menu .item:hover,
html[data-st-dark="on"] .ui.dropdown .menu .item.active,
html[data-st-dark="on"] .ui.dropdown .menu .item.selected {
  background-color: rgba(255,255,255,0.10) !important;
  color: #ffffff !important;
}


/* ===== Top-layer popovers (main document) ====================================
   Dispatch board job popovers live inside the dispatch board shadow DOM and are
   handled entirely by SHADOW_CSS below — no main-doc rule needed for them.
   :popover-open is intentionally excluded: ST's nav submenus are portaled to
   the main document body as native popovers and are ALREADY dark by default;
   applying filter: invert to them flips them light. Only non-shadow, non-ST
   frameworks (Popper.js, Kendo) are targeted here as a general safety net.
============================================================================= */
html[data-st-dark="on"] [data-popper-placement],
html[data-st-dark="on"] .k-popup,
html[data-st-dark="on"] .k-animation-container {
  filter: invert(1) hue-rotate(180deg) !important;
}
/* ===== Profile dropdown (top-right user menu) =================================
   In the new layout the top header is header-light__* (NOT counter-inverted), so
   the dropdown's Popper is already dark from the single html inversion. Our global
   [data-popper-placement] rule would add a second inversion, flipping it back to
   white. Cancel it here.
   In the classic layout the header carries header-dark__* which IS counter-inverted
   (2 inversions total), so we need the third inversion back to restore dark mode.
============================================================================= */
html[data-st-dark="on"] [data-cy="profile-dropdown"] [data-popper-placement] {
  filter: none !important;
}
html[data-st-dark="on"] [class*="header-dark"] [data-cy="profile-dropdown"] [data-popper-placement] {
  filter: invert(1) hue-rotate(180deg) !important;
}
/* ===== Anvil components rendered via Popper.js ==============================
   Anvil stamps data-anvil-component on its dropdown/popover wrapper divs
   (values include "Popover", "ActionMenu", and likely others). Popper.js adds
   data-popper-placement to that same outer element, so the counter-invert rule
   above fires on it and approximately cancels the html dark filter — leaving the
   dropdown white/light-mode. Known affected components: date-range picker
   (Popover), dashboard selector (ActionMenu), refresh-interval menu (ActionMenu).
   Fix: cancel the counter-invert for ALL Anvil-managed Popper wrappers via the
   presence of data-anvil-component, letting the html dark filter make them dark.
   The classic-layout profile-dropdown rule below has higher specificity and still
   correctly overrides this for that one case.
   Images/media and chips inside get explicit counter-inverts so they still appear
   in their original colours against the now-dark background.
============================================================================= */
html[data-st-dark="on"] [data-anvil-component][data-popper-placement] {
  filter: none !important;
}
html[data-st-dark="on"] [data-anvil-component][data-popper-placement] img,
html[data-st-dark="on"] [data-anvil-component][data-popper-placement] video,
html[data-st-dark="on"] [data-anvil-component][data-popper-placement] picture,
html[data-st-dark="on"] [data-anvil-component][data-popper-placement] canvas {
  filter: invert(1) hue-rotate(180deg) !important;
}
html[data-st-dark="on"] [data-anvil-component][data-popper-placement] [class*="chip"],
html[data-st-dark="on"] [data-anvil-component][data-popper-placement] [style*="--int-"],
html[data-st-dark="on"] [data-anvil-component][data-popper-placement] [data-anvil-component][style*="background-color"] {
  filter: invert(1) hue-rotate(180deg) !important;
}
html[data-st-dark="on"] [data-popper-placement] img,
html[data-st-dark="on"] [data-popper-placement] video,
html[data-st-dark="on"] [data-popper-placement] picture,
html[data-st-dark="on"] [data-popper-placement] canvas,
html[data-st-dark="on"] .k-popup img,
html[data-st-dark="on"] .k-popup video,
html[data-st-dark="on"] .k-animation-container img,
html[data-st-dark="on"] .k-animation-container video {
  filter: invert(1) hue-rotate(180deg) !important;
}

/* ===== Anvil combobox / search dropdown (top-layer popover) =================
   Combobox dropdowns (technician search, etc.) render as [popover="manual"]
   elements in the CSS top-layer and therefore BYPASS the html filter entirely.
   They need direct dark values — the same approach used for the toolbar.
   Reliable hook: Anvil stamps data-anv="combobox-item" on every option row.
============================================================================= */
html[data-st-dark="on"] [popover]:has([data-anv="combobox-item"]) {
  background-color: #2a2a2a !important;
  border-color: #3a3a3a !important;
  color: #e0e0e0 !important;
  color-scheme: dark !important;
  box-shadow: 0 4px 16px rgba(0,0,0,0.5) !important;
}
html[data-st-dark="on"] [data-anv="combobox-item"] {
  color: #e0e0e0 !important;
  background-color: transparent !important;
}
html[data-st-dark="on"] [data-anv="combobox-item"]:hover,
html[data-st-dark="on"] [data-anv="combobox-item"][aria-selected="true"] {
  background-color: rgba(255,255,255,0.10) !important;
  color: #ffffff !important;
}
html[data-st-dark="on"] [data-anv="combobox-item"] * {
  color: inherit !important;
}

/* ===== Box-shadow white-glow suppression ====================================
   The page-level invert(1) flips dark box-shadows (rgba(0,0,0,X)) into white
   glows. True dark-mode UIs use surface color for elevation — not shadows —
   so disabling them globally is safe and looks intentional.
   Counter-inverted regions (side-nav, job cards, backdrop) are also covered;
   they don't rely on shadows for their appearance.
============================================================================= */
html[data-st-dark="on"] * {
  box-shadow: none !important;
}
/* v1.5: Anvil draws radio button circles as an inset box-shadow ring, so the
   rule above erased them and only the checked dot (a ::before) was left, e.g.
   Reports → Export → "Export Report" format choices. Inset rings don't cause
   the white-glow problem, so put these back. Values mirror Anvil's own rules;
   the unchecked ring uses --colorsBorderDefault instead of GreyStrong so it
   stays visible on dark surfaces. */
html[data-st-dark="on"] .Radio__box {
  box-shadow: 0 0 0 1px var(--colorsBorderDefault, #949596) inset !important;
}
html[data-st-dark="on"] .a-Radio:not(.Radio--disabled):hover .Radio__box {
  box-shadow: 0 0 0 1px var(--colorsBorderStrong, #6a6b6c) inset !important;
}
html[data-st-dark="on"] :is(.Radio--checked .Radio__box, .Radio__input:checked + .Radio__box) {
  box-shadow: 0 0 0 2px var(--colorsBorderPrimary, #0265dc) inset !important;
}
html[data-st-dark="on"] .Radio--error .Radio__box {
  box-shadow: 0 0 0 1px var(--colorsBorderCritical, #e13212) inset !important;
}
html[data-st-dark="on"] :is(.Radio--checked.Radio--error .Radio__box, .Radio--error .Radio__input:checked + .Radio__box) {
  box-shadow: 0 0 0 2px var(--colorsBorderCritical, #e13212) inset !important;
}
html[data-st-dark="on"] :is(.Radio--checked:not(.Radio--disabled):hover .Radio__box, .a-Radio:not(.Radio--disabled):hover .Radio__input:checked + .Radio__box) {
  box-shadow: 0 0 0 2px var(--colorsBorderPrimary, #0265dc) inset !important;
}
html[data-st-dark="on"] .a-Radio.Radio--focus-visible:focus-within .Radio__box {
  box-shadow: 0 0 0 2px var(--colorsBorderPrimary, #0265dc) inset, 0 0 0 3px var(--colorsFocusRingPrimary, #a9d1ff) !important;
}

/* ===== Flyout / drawer backdrop =============================================
   The backdrop overlay has background-color: rgb(20,20,20) and opacity:0.6.
   After the page-level invert(1) that dark color flips to near-white (#EBEBEB),
   producing a white haze instead of a dim. Counter-inverting the backdrop
   element cancels the page inversion and restores the intended dark dim.
   The parent contrast(0.85) still applies for a slight softening.
   We target the known Backbone/React class as well as a broader attribute
   selector so it catches any variant ServiceTitan may add in future.
============================================================================= */
html[data-st-dark="on"] .Backdrop,
html[data-st-dark="on"] [class*="Backdrop--is-open"],
html[data-st-dark="on"] [class*="backdrop--is-open"] {
  filter: invert(1) hue-rotate(180deg) !important;
}

/* ===== Pendo guide backdrop: prevent white-haze inversion ==================
   Pendo injects semi-transparent dark backdrops (rgba(20,20,20,0.6)) as four
   positional <div> panels (#pendo-backdrop-0 … -3) plus an outer wrapper
   (#pendo-backdrop / ._pendo-guide-backdrop_). The page-level invert(1) on
   <html> flips that dark color to near-white (#EBEBEB), producing the same
   white-haze problem as the flyout .Backdrop above.
   Fix: counter-invert all pendo backdrop elements. The [id^="pendo-backdrop"]
   selector catches the outer wrapper and all four panel IDs in one rule;
   the class selector handles any variant Pendo may add in future.
============================================================================= */
html[data-st-dark="on"] [id^="pendo-backdrop"],
html[data-st-dark="on"] ._pendo-guide-backdrop_,
html[data-st-dark="on"] [class*="_pendo-backdrop"] {
  filter: invert(1) hue-rotate(180deg) !important;
}

/* -------- PRINT-SAFE: force light output when printing -------- */
@media print {
  html[data-st-dark="on"] {
    filter: none !important;
    color-scheme: light !important;
    background: #ffffff !important;
  }
  html[data-st-dark="on"] img,
  html[data-st-dark="on"] video,
  html[data-st-dark="on"] picture,
  html[data-st-dark="on"] canvas,
  html[data-st-dark="on"] svg image,
  html[data-st-dark="on"] [style*="background-image"],
  html[data-st-dark="on"] .app-layout-side,
  html[data-st-dark="on"] [data-cy="side-navigation"],
  html[data-st-dark="on"] [data-cy="header-navigation-top"],
  html[data-st-dark="on"] [class*="header-dark"],
  html[data-st-dark="on"] [data-cy="header-navigation"] [data-cy="navigation-items"],
  html[data-st-dark="on"] [data-cy="header-navigation"] [class*="header-stacked-nav"] {
    filter: none !important;
  }
}

/* ===== Enterprise Hub overrides ============================================
   Enterprise Hub (enterprise-hub.servicetitan.com) uses data-anv="card" for
   module tiles and a plain <header> without data-cy attributes.  The rules
   below are scoped to [data-st-ehub="on"] so they never affect tenant pages.
============================================================================= */

/* Header: natively dark — counter-invert so it stays dark after html filter */
html[data-st-dark="on"][data-st-ehub="on"] header {
  filter: invert(1) hue-rotate(180deg) !important;
}
/* Prevent media inside the header from being triple-inverted */
html[data-st-dark="on"][data-st-ehub="on"] header img,
html[data-st-dark="on"][data-st-ehub="on"] header svg,
html[data-st-dark="on"][data-st-ehub="on"] header video {
  filter: invert(1) hue-rotate(180deg) !important;
}

/* Module tile cards: do NOT counter-invert — let the html filter darken them.
   The JS fixJobCards already skips EHub, this CSS override catches the static
   CSS rule at line ~270 that also counter-inverts [data-anv="card"]. */
html[data-st-dark="on"][data-st-ehub="on"] [data-anv="card"] {
  filter: none !important;
}
/* Module icon circles inside tiles — restore their original blue */
html[data-st-dark="on"][data-st-ehub="on"] [data-anv="card"] [class*="module-icon"] {
  filter: invert(1) hue-rotate(180deg) !important;
}

/* ===== v0.8.0: Inline-edit pencil visibility ================================
   Neutral-gray edit pencils (.InlineEdit__editIcon, i.a-Icon--edit, color
   ~#949596) sit in the filter's dead zone: dark grays invert bright, light
   grays invert dark, but MID-gray inverts to mid-gray (~#6E6E6E) - nearly
   invisible on dark panels. Reported by a user on the Dispatch Pro
   "Recommended Actions" panel; also affects the job flyout Quick Edit pencils.
   Fix: pre-inversion #3C3C3D renders as ~#B9B9B9 through the html filter.
   Excluded contexts: counter-inverted cards / Popper dropdowns (net identity
   there, original color already correct) and top-layer popovers (the html
   filter never applies, so the original color is already correct). */
html[data-st-dark="on"] :is(.InlineEdit__editIcon, i.a-Icon--edit):not([data-anv="card"] *):not([data-popper-placement] *):not([popover] *):not(:popover-open *) {
  color: #3C3C3D !important;
}
/* ===== v0.8.0: Dispatch board zone dots (light-DOM safety net) ==============
   Technician zone dots (svg[data-cy="zone-icon"]) draw a circle with
   fill="currentColor". The html filter flips black dots to white and hue-
   shifts colored ones. Counter-invert restores every zone's original color.
   (The daily dispatch board lives in shadow DOM and is fixed in SHADOW_CSS;
   this rule covers any light-DOM render of the same component.) */
html[data-st-dark="on"] svg[data-cy="zone-icon"] {
  filter: invert(1) hue-rotate(180deg) !important;
}
html[data-st-dark="on"] :is([data-anv="card"], [popover], :popover-open, [data-popper-placement]) svg[data-cy="zone-icon"] {
  filter: none !important;
}
`;

  const SHADOW_CSS = `
    :host-context(html[data-st-dark="on"]) img,
    :host-context(html[data-st-dark="on"]) video,
    :host-context(html[data-st-dark="on"]) picture,
    :host-context(html[data-st-dark="on"]) canvas,
    :host-context(html[data-st-dark="on"]) svg image,
    :host-context(html[data-st-dark="on"]) [style*="background-image"] { filter: invert(1) hue-rotate(180deg) !important; }

    /* Counter-invert job/resource cards inside shadow DOM so their inline
       status colors restore to near-original. The outer html contrast(0.85)
       still applies for a gentle dark-mode softening. */
    :host-context(html[data-st-dark="on"]) [data-anv="card"] {
      filter: invert(1) hue-rotate(180deg) !important;
    }
    /* Prevent triple-invert on media inside counter-inverted cards */
    :host-context(html[data-st-dark="on"]) [data-anv="card"] img,
    :host-context(html[data-st-dark="on"]) [data-anv="card"] video,
    :host-context(html[data-st-dark="on"]) [data-anv="card"] picture,
    :host-context(html[data-st-dark="on"]) [data-anv="card"] canvas,
    :host-context(html[data-st-dark="on"]) [data-anv="card"] svg image,
    :host-context(html[data-st-dark="on"]) [data-anv="card"] [style*="background-image"] {
      filter: none !important;
    }

    /* ===== Chips / tags in normal page flow =====================================
       Chips are semantic status labels (PO Required, Not To Exceed, etc.) whose
       colors carry meaning. Without intervention the html filter inverts and
       hue-shifts them, making green chips appear magenta, blue chips orange, etc.

       Counter-invert each chip so it renders with its original light-mode colors
       on the dark page background — the same technique used for [data-anv="card"].

       Exception 1: chips inside [data-anv="card"] — the card's own counter-invert
       already un-inverts everything inside it; a second invert on the chip would
       invert it again, producing wrong colors. Use filter:none there.

       Exception 2: chips inside [class*="popover-container"] — popovers live on
       the top-layer and never go through the html filter, so no counter-invert is
       needed or wanted. That override is written in the popover section below.
    =========================================================================== */
    :host-context(html[data-st-dark="on"]) [class*="chip"],
    :host-context(html[data-st-dark="on"]) [style*="--int-"],
    :host-context(html[data-st-dark="on"]) [data-anvil-component][style*="background-color"] {
      filter: invert(1) hue-rotate(180deg) !important;
    }
    :host-context(html[data-st-dark="on"]) [data-anv="card"] [class*="chip"],
    :host-context(html[data-st-dark="on"]) [data-anv="card"] [style*="--int-"],
    :host-context(html[data-st-dark="on"]) [data-anv="card"] [data-anvil-component][style*="background-color"] {
      filter: none !important;
    }
    /* Job page Tasks panel: excluded from the card counter-invert so it goes
       dark with the page; its chips and media get the page-level treatment.
       See the matching light-DOM block for details. */
    :host-context(html[data-st-dark="on"]) [data-anv="card"][class*="job-tasks-card__"] {
      filter: none !important;
    }
    :host-context(html[data-st-dark="on"]) [data-anv="card"][class*="job-tasks-card__"] [class*="chip"],
    :host-context(html[data-st-dark="on"]) [data-anv="card"][class*="job-tasks-card__"] [style*="--int-"],
    :host-context(html[data-st-dark="on"]) [data-anv="card"][class*="job-tasks-card__"] [data-anvil-component][style*="background-color"],
    :host-context(html[data-st-dark="on"]) [data-anv="card"][class*="job-tasks-card__"] :is(img, video, picture, canvas, svg image, [style*="background-image"]) {
      filter: invert(1) hue-rotate(180deg) !important;
    }

    /* ===== Week-view dispatch board: structural grid cells ===================
       In the week view both the date-column header cells and the per-technician
       body cells use [data-anv="card"], which the general rule above counter-
       inverts (filter: invert hue-rotate). Unlike job-bubble cards that carry
       meaningful inline colors, these structural cells have a near-white CSS
       background. The double-inversion (card filter + html filter) cancels out
       and the cells render white — the opposite of dark mode.

       Fix: cancel the counter-invert on both cell types. With filter:none the
       single html filter makes their near-white background appear near-black.
       Job-bubble cards (base-card__yW_Tv) nested INSIDE the body cells still
       carry the general [data-anv="card"] counter-invert, so their inline
       background colors survive double-inversion and appear as intended.

       Specificity note: [data-cy=...] and :has(> time[datetime]) each add one
       attribute/pseudo-class unit above the general rule, so these overrides
       always win without needing !important escalation beyond what is already
       present in the cascade.
    =========================================================================== */

    /* Week view body cells — one card per technician per day */
    :host-context(html[data-st-dark="on"]) [data-cy="wdb-schedule-column"] {
      filter: none !important;
    }

    /* Week view date column header cells — identified by direct <time> child */
    :host-context(html[data-st-dark="on"]) [data-anv="card"]:has(> time[datetime]) {
      filter: none !important;
    }

    /* Chips/tags inside date-header cells: the [data-anv="card"] chip exception
       above would leave them with filter:none and only the html inversion —
       wrong colors. Since the header card's own counter-invert is now gone,
       restore the chip counter-invert explicitly. The :has() pseudo-class gives
       this rule higher specificity (0,3,0) than the exception rule (0,2,0),
       so it cleanly overrides without order dependency. */
    :host-context(html[data-st-dark="on"]) [data-anv="card"]:has(> time[datetime]) [class*="chip"],
    :host-context(html[data-st-dark="on"]) [data-anv="card"]:has(> time[datetime]) [style*="--int-"] {
      filter: invert(1) hue-rotate(180deg) !important;
    }

    /* Counter-invert flyout backdrop so it dims rather than hazes white */
    :host-context(html[data-st-dark="on"]) .Backdrop,
    :host-context(html[data-st-dark="on"]) [class*="Backdrop--is-open"],
    :host-context(html[data-st-dark="on"]) [class*="backdrop--is-open"] {
      filter: invert(1) hue-rotate(180deg) !important;
    }

    /* ---- Dispatch board hover popovers ------------------------------------
       These are native popovers (popover: top-layer) INSIDE the dispatch board
       shadow DOM. The [popover] top-layer BYPASSES the html filter entirely —
       so we cannot rely on filter:invert to create dark mode here.
       Using filter:invert on the container distorts color emoji (🔥 ⚡ ❄️)
       because Apple Color Emoji are rendered as color bitmaps; the invert
       pipeline produces visible artifacts (black cores, red outlines) that
       cannot be corrected via a child counter-invert (the parent's filter
       re-inverts the child's output, forcing text dark while emoji lands
       back at original — but you can't fix one without breaking the other).
       Solution: style dark mode EXPLICITLY. Set dark bg + light text directly.
       SVG icons (designed for light mode) are individually inverted.
    ----------------------------------------------------------------------- */
    /* Native popover wrapper — only dispatch board job popovers. */
    :host-context(html[data-st-dark="on"]) [popover]:has([class*="popover-container"]) {
      background-color: #2d2d2d !important;
      border-color: #3a3a3a !important;
      color-scheme: dark !important;
    }
    /* v1.5.1: the job popover while it loads. For the first ~250ms after a
       hover it holds Anvil skeleton bars instead of a popover-container, so
       the rule above didn't match yet and the top-layer popover showed light
       gray (#F7F7F7 with #EEE bars) before switching to dark. Match the
       popover itself by its stable data-cy so it's dark from the first frame,
       and darken the skeleton bars. Its arrow path kept a light fill even
       once loaded (a white notch beside the dark popover); fill it too. */
    :host-context(html[data-st-dark="on"]) [popover][data-cy="dc-job-popover"] {
      background-color: #2d2d2d !important;
      border-color: #3a3a3a !important;
      color: #e0e0e0 !important;
      color-scheme: dark !important;
    }
    :host-context(html[data-st-dark="on"]) [popover][data-cy="dc-job-popover"] [data-anv^="skeleton"]:not([data-anv="skeleton-text"]),
    :host-context(html[data-st-dark="on"]) [popover][data-cy="dc-job-popover"] [data-anv="skeleton-text"] > * {
      background-color: #3a3a3a !important;
    }
    :host-context(html[data-st-dark="on"]) [popover][data-cy="dc-job-popover"] [class*="_arrow_"] path {
      fill: #2d2d2d !important;
    }
    /* Inner container — explicit dark mode, NO filter (preserves emoji colors). */
    :host-context(html[data-st-dark="on"]) [class*="popover-container"] {
      background-color: #2d2d2d !important;
      color: #e0e0e0 !important;
      color-scheme: dark !important;
    }
    /* Force light text on body text elements (dark bg needs light text).
       Chip/tag spans and anchors are excluded: they carry their own inline
       background-color and color styles which beat any non-!important author
       rule, so they need no override from us. */
    :host-context(html[data-st-dark="on"]) [class*="popover-container"] p,
    :host-context(html[data-st-dark="on"]) [class*="popover-container"] span:not([class*="chip"]),
    :host-context(html[data-st-dark="on"]) [class*="popover-container"] a:not([class*="chip"]),
    :host-context(html[data-st-dark="on"]) [class*="popover-container"] strong,
    :host-context(html[data-st-dark="on"]) [class*="popover-container"] em,
    :host-context(html[data-st-dark="on"]) [class*="popover-container"] label {
      color: #e0e0e0 !important;
    }
    /* ===== Chip / tag color fixes ===============================================
       Two problems solved here:

       1. BORDER: Chip CSS uses border .0625rem solid var(--int-border-color, #fff).
          Popover chips often omit --int-border-color in their inline style, so the
          border falls back to #fff (white). In light mode the white border is
          invisible against the white page background. In the dark popover (bg
          #2d2d2d) that same white border becomes clearly visible, making chips look
          "outlined" rather than filled. Fix: force border-color to transparent.

       2. TEXT COLOR: The span:not([chip]) rule above sets color:#e0e0e0 !important
          on all non-chip spans. The outer chip span is excluded (has "chip" in
          class). But the chip's inner label span (e.g. _chip-label_...) does NOT
          have "chip" in its class, so it matches the span rule and gets forced to
          #e0e0e0. For white-text chips this is invisible. For black-text chips
          (where ServiceTitan chose dark text for contrast) it incorrectly turns
          the text white.
          Fix: force chip inner spans to inherit from their chip parent. The chip
          parent retains its inline-style color (#141414 or #ffffff), so the
          label span inherits the correct value. Specificity is equal to the span
          rule (0,4,2 each) so the later declaration wins.
    =========================================================================== */
    :host-context(html[data-st-dark="on"]) [class*="popover-container"] [class*="chip"] {
      filter: none !important;         /* popover chips: no html filter, no counter-invert */
      border-color: transparent !important;
    }
    :host-context(html[data-st-dark="on"]) [class*="popover-container"] [class*="chip"] span {
      color: inherit !important;
    }
    /* Content / footer sections get explicit dark background. */
    :host-context(html[data-st-dark="on"]) [class*="popover-content"],
    :host-context(html[data-st-dark="on"]) [class*="popover-footer"] {
      background-color: #2d2d2d !important;
    }
    /* ===== Alert boxes inside the popover ======================================
       Alert boxes have a light colored background (e.g. rgb(255,219,219) pink).
       The span rule above has specificity (0,2,1); the alert-box reset must
       match that specificity so the later rule wins. Enumerating span/p/a
       explicitly achieves equal specificity (0,2,1) — and since this block
       appears after the span rule, it takes precedence for alert-box content.
    =========================================================================== */
    :host-context(html[data-st-dark="on"]) [class*="popover-container"] [class*="alert-box"],
    :host-context(html[data-st-dark="on"]) [class*="popover-container"] [class*="alert-box"] span,
    :host-context(html[data-st-dark="on"]) [class*="popover-container"] [class*="alert-box"] p,
    :host-context(html[data-st-dark="on"]) [class*="popover-container"] [class*="alert-box"] a {
      color: #333333 !important;
    }
    /* Alert-box SVGs are on a light background — don't invert them. */
    :host-context(html[data-st-dark="on"]) [class*="popover-container"] [class*="alert-box"] svg {
      filter: none !important;
    }
    /* SVG icons were drawn for light mode — invert them individually. */
    :host-context(html[data-st-dark="on"]) [class*="popover-container"] svg {
      filter: invert(1) hue-rotate(180deg) !important;
    }
    /* Prevent the global card counter-invert from firing inside the popover.
       No html filter applies here (top layer), so a card inversion would be wrong. */
    :host-context(html[data-st-dark="on"]) [class*="popover-container"] [data-anv="card"] {
      filter: none !important;
    }

    /* ===== Anvil combobox / search dropdown (top-layer popover in shadow DOM) =
       These [popover="manual"] dropdowns (e.g. technician search on dispatch
       board) live inside a shadow root AND on the CSS top-layer, so they bypass
       the html filter entirely. Main-document CSS cannot reach them. Direct dark
       values must be applied here via the shadow-injected stylesheet.
    ======================================================================== */
    :host-context(html[data-st-dark="on"]) [popover]:has([data-anv="combobox-item"]) {
      background-color: #2a2a2a !important;
      border-color: #3a3a3a !important;
      color: #e0e0e0 !important;
      color-scheme: dark !important;
      box-shadow: 0 4px 16px rgba(0,0,0,0.5) !important;
    }
    :host-context(html[data-st-dark="on"]) [data-anv="combobox-item"] {
      color: #e0e0e0 !important;
      background-color: transparent !important;
    }
    :host-context(html[data-st-dark="on"]) [data-anv="combobox-item"]:hover,
    :host-context(html[data-st-dark="on"]) [data-anv="combobox-item"][aria-selected="true"] {
      background-color: rgba(255,255,255,0.10) !important;
      color: #ffffff !important;
    }
    :host-context(html[data-st-dark="on"]) [data-anv="combobox-item"] * {
      color: inherit !important;
    }

    /* ===== v0.8.0: Inline-edit pencils + zone dots (shadow DOM) =============
       Pencils: mid-gray (~#949596) inverts to mid-gray - invisible on dark
       surfaces (Dispatch Pro "Recommended Actions" panel edit pencils).
       Pre-inversion #3C3C3D renders as ~#B9B9B9. Zone dots: counter-invert
       preserves original zone colors (black dots were flipping to white).
       Both skip counter-inverted cards and top-layer popover contexts. */
    :host-context(html[data-st-dark="on"]) :is([class*="InlineEdit__editIcon"], i.a-Icon--edit):not([data-anv="card"] *):not([popover] *):not([class*="popover-container"] *) {
      color: #3C3C3D !important;
    }
    :host-context(html[data-st-dark="on"]) svg[data-cy="zone-icon"] {
      filter: invert(1) hue-rotate(180deg) !important;
    }
    :host-context(html[data-st-dark="on"]) :is([data-anv="card"], [popover], [class*="popover-container"]) svg[data-cy="zone-icon"] {
      filter: none !important;
    }

    /* ===== v1.5: Dispatch board polish ======================================
       The dark board mixed six unrelated grays with bright #DFDFDF job cards
       and a light Jobs Tray header, and off-hours rendered lighter than
       working hours. One cool palette instead (pre-inversion → visible):
         canvas / gaps / timeline header  #F7F9FC → ~#16181A (main-doc rule)
         tech labels + working shifts     #EDF1F5 → ~#1C1F22
         group bands (Service, Sales…)    #E3E7EC → ~#24272B, #D3D8DD edges
       Job cards (day view job-card-*, week and vertical base-card__*) are
       counter-inverted, so their colors below are real colors. Every job
       card gets the dark #1B2026 base from CSS alone, so a card the board
       re-mounts while scrolling never shows its bright original color, not
       even for a frame. Default gray cards (inline rgb(240,240,240)) keep a
       neutral border. Cards with a status color then get a dark wash of their
       own hue from --st-card-bg, which the dispatchDividerFix IIFE sets in
       the same MutationObserver turn the card is added (before paint).
       Tags and anything with its own inline color keep their colors; status
       borders (e.g. the red alert outline) are left alone.
       Scoped to data-st-dispatch="on". */
    :host-context(html[data-st-dark="on"][data-st-dispatch="on"]) [class*="header-row__"] {
      background-color: #F7F9FC !important;
    }
    :host-context(html[data-st-dark="on"][data-st-dispatch="on"]) [class*="resource-label__"]:not([class*="resource-label-group__"]),
    :host-context(html[data-st-dark="on"][data-st-dispatch="on"]) [class*="color-segment__"].regular-shift {
      background-color: #EDF1F5 !important;
    }
    :host-context(html[data-st-dark="on"][data-st-dispatch="on"]) [class*="resource-label-group__"],
    :host-context(html[data-st-dark="on"][data-st-dispatch="on"]) [class*="resource-row-group__"],
    :host-context(html[data-st-dark="on"][data-st-dispatch="on"]) [class*="team-row__"] {
      background-color: #E3E7EC !important;
      box-shadow: inset 0 1px 0 #D3D8DD, inset 0 -1px 0 #D3D8DD !important;
    }
    :host-context(html[data-st-dark="on"][data-st-dispatch="on"]) [data-anv="card"]:is([class*="job-card-"], [class*="base-card__"])[style*="background-color"] {
      background-color: #1B2026 !important;
      color: #F2F5F8 !important;
      box-shadow: 0 1px 2px rgba(0,0,0,.35) !important;
    }
    :host-context(html[data-st-dark="on"][data-st-dispatch="on"]) [data-anv="card"]:is([class*="job-card-"], [class*="base-card__"])[style*="background-color: rgb(240, 240, 240)"] {
      border-color: #353C45 !important;
    }
    :host-context(html[data-st-dark="on"][data-st-dispatch="on"]) [data-anv="card"]:is([class*="job-card-"], [class*="base-card__"])[style*="background-color"][data-st-tinted] {
      background-color: var(--st-card-bg, #1B2026) !important;
    }
    :host-context(html[data-st-dark="on"][data-st-dispatch="on"]) [data-anv="card"]:is([class*="job-card-"], [class*="base-card__"])[style*="background-color"] :is(div, span, p, button, svg):not(.Tag):not(.Tag *):not([style*="color:"]) {
      color: #E9EDF1 !important;
    }
    :host-context(html[data-st-dark="on"][data-st-dispatch="on"]) [data-anv="card"]:is([class*="job-card-"], [class*="base-card__"])[style*="background-color"] span.fw-normal:not(.Tag):not(.Tag *):not([style*="color:"]) {
      color: #AEB6C0 !important;
    }
    :host-context(html[data-st-dark="on"][data-st-dispatch="on"]) [data-anv="card"]:is([class*="job-card-"], [class*="base-card__"])[style*="background-color"][data-st-tinted] span.fw-normal:not(.Tag):not(.Tag *):not([style*="color:"]) {
      color: #B8C0CA !important;
    }
    /* Vertical layout (Mobiscroll grid): same palette. Off-hours (.no-shift)
       sit at canvas level, working hours one step lighter, as in the
       horizontal board. */
    :host-context(html[data-st-dark="on"][data-st-dispatch="on"]) :is(.mbsc-schedule-wrapper, .mbsc-schedule-grid-wrapper, .mbsc-schedule-color.no-shift) {
      background-color: #F7F9FC !important;
    }
    :host-context(html[data-st-dark="on"][data-st-dispatch="on"]) .mbsc-schedule-color.regular-shift {
      background-color: #EDF1F5 !important;
    }
    /* Jobs Tray header is dark in light mode, so the html filter made it a
       light bar. Counter-invert it back to dark. */
    :host-context(html[data-st-dark="on"][data-st-dispatch="on"]) [data-cy="dc-jt-resize-handler"] {
      filter: invert(1) hue-rotate(180deg) !important;
    }
    :host-context(html[data-st-dark="on"][data-st-dispatch="on"]) :is(.k-grid, .k-grid-content, .k-grid-container, .k-grid-content tr) {
      background-color: #EDF1F5 !important;
    }
    :host-context(html[data-st-dark="on"][data-st-dispatch="on"]) :is(.k-grid-header, .k-grid-header-wrap, .k-grid-header th) {
      background-color: #E3E7EC !important;
    }
  `;
  const shadowStyleCache = new WeakSet();
  function injectShadowStyle(root) {
    try {
      if (!root || shadowStyleCache.has(root)) return;
      const s = document.createElement("style");
      s.textContent = SHADOW_CSS;
      root.appendChild(s);
      shadowStyleCache.add(root);
    } catch {}
  }
  const origAttachShadow = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function(init) {
    const root = origAttachShadow.call(this, init);
    try { injectShadowStyle(root); } catch {}
    return root;
  };

  const docEl = document.documentElement;
  const darkOn = () => docEl.getAttribute("data-st-dark") === "on";

  function applyDark() {
    ensureStyle().textContent = CSS;
    docEl.setAttribute("data-st-dark", "on");
    if (isEHub) docEl.setAttribute("data-st-ehub", "on");
    const walker = document.createTreeWalker(document, NodeFilter.SHOW_ELEMENT);
    const batch = [];
    while (walker.nextNode()) { const el = walker.currentNode; if (el.shadowRoot) batch.push(el.shadowRoot); }
    batch.forEach(injectShadowStyle);
    fixSettingsContainers(); fixSettingsSearch(); fixSelectedStates(); fixJobCards(); fixChips(); fixSwatches();
  }

  function removeDark() {
    const st = document.getElementById(STYLE_ID);
    if (st) st.textContent = "";
    docEl.removeAttribute("data-st-dark");
    docEl.removeAttribute("data-st-ehub");
    clearSettingsContainers(); clearJobCards(); clearChips(); clearSwatches();
  }
  function clearSettingsContainers(ctx=document) {
    try {
      ctx.querySelectorAll('#settingsMenu, [id^="settingsMenu"]').forEach(el => {
        el.removeAttribute('data-st-sidebar');
        el.style.removeProperty('filter');
        el.style.removeProperty('background-color');
        el.style.removeProperty('color');
        el.style.removeProperty('color-scheme');
        // Also clear inline styles set by fixSettingsSearch on the search input.
        const input = el.querySelector('input[type="search"], .Input__innerWrapper input, input[name="search"]');
        if (input) {
          input.style.removeProperty('background-color');
          input.style.removeProperty('color');
          input.style.removeProperty('-webkit-text-fill-color');
          input.style.removeProperty('caret-color');
          input.style.removeProperty('border');
          input.style.removeProperty('box-shadow');
          input.style.removeProperty('filter');
        }
        // Also clear inline styles set by fixSelectedStates on active items.
        el.querySelectorAll('.active, .is-selected, [aria-current="page"], [aria-selected="true"]').forEach(item => {
          item.style.removeProperty('background-color');
          item.style.removeProperty('color');
          const link = item.querySelector('a');
          if (link) link.style.removeProperty('color');
        });
      });
    } catch {}
  }

  function fixSettingsContainers(ctx=document) {
    try {
      ctx.querySelectorAll('#settingsMenu, [id^="settingsMenu"]').forEach(el => {
        el.setAttribute('data-st-sidebar', 'on');
        el.style.filter = 'invert(1) hue-rotate(180deg)';
        el.style.backgroundColor = '#121212';
        el.style.color = '#f2f2f3';
        el.style.colorScheme = 'dark';
      });
    } catch {}
  }
  function fixSelectedStates(ctx=document){
    try {
      ctx.querySelectorAll('#settingsMenu, [id^="settingsMenu"]').forEach(menu => {
        const sel = menu.querySelectorAll('.active, .is-selected, [aria-current="page"], [aria-selected="true"]');
        sel.forEach(el => {
          el.style.setProperty('background-color','rgba(255,255,255,0.14)','important');
          el.style.setProperty('color','#ffffff','important');
          const link = el.querySelector('a'); if (link) link.style.setProperty('color','#ffffff','important');
        });
      });
    } catch {}
  }
  function fixSettingsSearch(ctx=document){
    try {
      ctx.querySelectorAll('#settingsMenu, [id^="settingsMenu"]').forEach(menu => {
        const input = menu.querySelector('input[type="search"], .Input__innerWrapper input, input[name="search"]');
        if (input?.style?.setProperty) {
          input.style.setProperty('background-color', 'transparent', 'important');
          input.style.setProperty('color', '#f2f2f3', 'important');
          input.style.setProperty('-webkit-text-fill-color', '#f2f2f3', 'important');
          input.style.setProperty('caret-color', '#f2f2f3', 'important');
          input.style.setProperty('border', 'none', 'important');
          input.style.setProperty('box-shadow', 'none', 'important');
          input.style.setProperty('filter', 'none', 'important');
        }
      });
    } catch {}
  }

  // Counter-invert chips/tags so their semantic colors survive the html filter.
  // CSS-based fixes may miss chips whose class names don't include "chip" or that
  // live in shadow roots injected before the content script ran. Applying the
  // filter inline (highest CSS specificity) covers all such cases.
  // ServiceTitan chip elements carry --int-* custom properties in their inline
  // style (e.g. --int-font-color, --int-bg-color, --int-close-background-color,
  // etc.). Matching [style*="--int-"] catches ALL of these universally regardless
  // of which specific token names ServiceTitan uses on a given page or component.
  // Chips inside [data-anv="card"] are skipped: the card counter-invert already
  // restores them. Native [popover] chips are also skipped: top-layer elements
  // never receive the html filter so counter-inverting them would be wrong.
  // Also covers legacy Knockout <span class="label"> tags in the call booking
  // search results list (ul.callscreen-search-location-results).
  const CHIP_SEL = '[style*="--int-"],[class*="chip"],[data-anvil-component][style*="background-color"],.callscreen-search-location-results .label';
  // v1.5: Anvil Cards with a pale inline tint (job flyout / Edit Appointment
  // drawer status tints) are surfaces, not chips. Don't counter-invert them;
  // mark them so the CSS keeps them dark. Pale = HSL lightness >= 70%.
  const CARD_TINT_ATTR = 'data-st-card-tint';
  function isPaleCard(el) {
    if (el.getAttribute?.('data-anvil-component') !== 'Card') return false;
    // The Edit Appointment drawer's outer card only shows its status color as
    // the stripe down the left edge; the form sits on a nested card. Treat it
    // as a surface whatever the color (Done is a mid-tone green).
    if (/appointment-form-card/.test(el.className || '')) return true;
    const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(el.style?.backgroundColor || '');
    if (!m) return false;
    const v = [+m[1], +m[2], +m[3]];
    return (Math.max(...v) + Math.min(...v)) / 2 >= 178;
  }
  function fixChips(ctx=document) {
    try {
      const apply = (el) => {
        if (el.closest?.('[data-anv="card"]')) return;   // card handles it
        if (el.closest?.('[popover]')) return;            // top-layer, no filter
        if (isPaleCard(el)) {
          el.setAttribute(CARD_TINT_ATTR, '');
          el.style.removeProperty('filter');
          return;
        }
        el.removeAttribute(CARD_TINT_ATTR);
        el.style.setProperty('filter', 'invert(1) hue-rotate(180deg)', 'important');
      };
      if (ctx !== document && ctx.matches?.(CHIP_SEL)) apply(ctx);
      ctx.querySelectorAll?.(CHIP_SEL).forEach(apply);
    } catch {}
  }
  function clearChips(ctx=document) {
    try {
      const clear = (el) => { el.style.removeProperty('filter'); el.removeAttribute(CARD_TINT_ATTR); };
      if (ctx !== document && ctx.matches?.(CHIP_SEL)) clear(ctx);
      ctx.querySelectorAll?.(CHIP_SEL).forEach(clear);
    } catch {}
  }

  // Counter-invert job/resource cards so their inline status colors render
  // close to their original light-mode values. The html's contrast(0.85) still
  // applies (a gentle softening), but the disorienting full color-scramble is
  // undone. Images inside cards get filter:none to avoid a triple-invert.
  const GS_HOST_SEL = 'servicetitan-global-search-bar,[data-mfe-name="servicetitan-global-search-bar"]';
  // Job page Tasks panel: stays single-inverted (dark). Stable class prefix, not the hash.
  const TASKS_PANEL_SEL = '[data-anv="card"][class*="job-tasks-card__"]';
  function fixJobCards(ctx=document) {
    if (isEHub) return;   // Enterprise Hub tiles use data-anv="card" but should NOT be counter-inverted
    try {
      const applyCard = (el) => {
        if (el.closest?.(GS_HOST_SEL)) return;   // GS cards: single-inversion only
        if (el.matches?.(TASKS_PANEL_SEL)) return; // Tasks panel: CSS sets filter:none
        el.style.setProperty('filter', 'invert(1) hue-rotate(180deg)', 'important');
        el.querySelectorAll('img, video, picture, canvas').forEach(media => {
          media.style.setProperty('filter', 'none', 'important');
        });
      };
      if (ctx !== document && ctx.matches?.('[data-anv="card"]')) applyCard(ctx);
      ctx.querySelectorAll?.('[data-anv="card"]').forEach(applyCard);
    } catch {}
  }
  function clearJobCards(ctx=document) {
    try {
      const clearCard = (el) => {
        el.style.removeProperty('filter');
        el.querySelectorAll('img, video, picture, canvas').forEach(media => {
          media.style.removeProperty('filter');
        });
      };
      if (ctx !== document && ctx.matches?.('[data-anv="card"]')) clearCard(ctx);
      ctx.querySelectorAll?.('[data-anv="card"]').forEach(clearCard);
    } catch {}
  }

  // ── TAG-TYPE COLOR-SWATCH FIX ─────────────────────────────────────────────
  // CSS filter chains clamp intermediate channel values, so a chained
  // counter-filter cannot perfectly cancel the HTML filter for highly-saturated
  // colours.  Instead we compute the exact affine inverse of the combined filter
  // matrix in floating-point (no intermediate clamping) and write the
  // pre-distorted colour directly as the element's inline background.
  //
  // HTML filter: invert(1) hue-rotate(180deg) contrast(0.85)
  // Combined forward matrix F  [r g b → r' g' b'] with constant offset 0.925:
  //   [ 0.488  -1.216  -0.122 ]   const  0.925
  //   [-0.362  -0.366  -0.122 ]          0.925
  //   [-0.362  -1.216   0.728 ]          0.925
  //
  // Affine inverse M⁻¹ (analytically derived, verified: F(M⁻¹(c)) ≈ c):
  //   [ 0.674  -1.682  -0.168 ]   const  1.088
  //   [-0.502  -0.507  -0.169 ]          1.090
  //   [-0.500  -1.683   1.008 ]          1.087
  const SWATCH_SEL  = '.tag-type-color-container';
  const SWATCH_ATTR = 'data-st-swatch-bg';
  const MI = [
    [ 0.674, -1.682, -0.168, 1.088],
    [-0.502, -0.507, -0.169, 1.090],
    [-0.500, -1.683,  1.008, 1.087],
  ];
  function parseSwatchRGB(el) {
    const style = el.getAttribute('style') || '';
    const hexM  = style.match(/background(?:-color)?\s*:\s*#([0-9a-f]{3,6})/i);
    if (hexM) {
      let h = hexM[1];
      if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
      return [parseInt(h.slice(0,2),16)/255, parseInt(h.slice(2,4),16)/255, parseInt(h.slice(4,6),16)/255];
    }
    const rgbM = style.match(/background(?:-color)?\s*:\s*rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (rgbM) return [+rgbM[1]/255, +rgbM[2]/255, +rgbM[3]/255];
    return null;
  }
  function fixSwatches(ctx=document) {
    // On the Tag Types page the html filter is overridden to invert(1) and a
    // plain CSS invert(1) on .tag-type-color-container gives perfect results.
    // The JS pre-distortion (optimised for the full filter) must not run here.
    if (docEl.hasAttribute('data-st-tagtypes')) return;
    try {
      const apply = (el) => {
        // Persist the original background exactly once so clearSwatches can restore it.
        if (!el.hasAttribute(SWATCH_ATTR)) {
          const bgM = (el.getAttribute('style')||'').match(/background(?:-color)?\s*:\s*([^;]+)/i);
          el.setAttribute(SWATCH_ATTR, bgM ? bgM[1].trim() : '');
        }
        const rgb = parseSwatchRGB(el);
        if (!rgb) return;
        const [ri, gi, bi] = MI.map(row =>
          Math.round(Math.max(0, Math.min(255, (row[0]*rgb[0] + row[1]*rgb[1] + row[2]*rgb[2] + row[3]) * 255)))
        );
        el.style.setProperty('background', `rgb(${ri},${gi},${bi})`, 'important');
        el.style.setProperty('filter', 'none', 'important');
      };
      if (ctx !== document && ctx.matches?.(SWATCH_SEL)) apply(ctx);
      ctx.querySelectorAll?.(SWATCH_SEL).forEach(apply);
    } catch {}
  }
  function clearSwatches(ctx=document) {
    try {
      const clear = (el) => {
        const orig = el.getAttribute(SWATCH_ATTR);
        if (orig !== null) {
          if (orig) el.style.setProperty('background', orig); else el.style.removeProperty('background');
          el.removeAttribute(SWATCH_ATTR);
        }
        el.style.removeProperty('filter');
      };
      if (ctx !== document && ctx.matches?.(SWATCH_SEL)) clear(ctx);
      ctx.querySelectorAll?.(SWATCH_SEL).forEach(clear);
    } catch {}
  }

  let mo = null;
  function startObservers(){
    if (mo) return;
    mo = new MutationObserver(muts => {
      if (!darkOn()) return;
      for (const m of muts) {
        if (m.type === 'childList') {
          m.addedNodes.forEach(n => {
            if (n.nodeType !== 1) return;
            fixSettingsContainers(n);
            fixSettingsSearch(n);
            fixSelectedStates(n);
            fixJobCards(n); fixChips(n); fixSwatches(n);
          });
        } else if (m.type === 'attributes' && m.attributeName === 'class') {
          const t = m.target; if (!(t instanceof HTMLElement)) return;
          if (t.closest?.('#settingsMenu, [id^="settingsMenu"]')) {
            fixSelectedStates(t.closest('#settingsMenu, [id^="settingsMenu"]') || document);
          }
        }
      }
    });
    mo.observe(document, {subtree:true, childList:true, attributes:true, attributeFilter:['class']});
  }
  function stopObservers(){ try { mo?.disconnect(); } catch{}; mo = null; }

  window.addEventListener("message", (e) => {
    const msg = e?.data; if (!msg || msg.__st !== true) return;
    if (msg.type === "ST_DARK_SET") {
      enabled = !!msg.enabled; if (enabled) { applyDark(); startObservers(); } else { stopObservers(); removeDark(); }
    } else if (msg.type === "ST_DARK_TOGGLE") {
      enabled = !enabled; if (enabled) { applyDark(); startObservers(); } else { stopObservers(); removeDark(); }
      window.postMessage({ __st: true, type: "ST_DARK_STATE", enabled }, "*");
    }
  }, { passive: true });

  window.postMessage({ __st: true, type: "ST_DARK_HELLO" }, "*");

  // ── TAG-TYPES PAGE ROUTE WATCHER ──────────────────────────────────────────
  // Stamps data-st-tagtypes="on" on <html> while the URL contains tag-types.
  // Entering the page: clear any JS pre-distorted swatch backgrounds so the
  // CSS invert(1) counter can work cleanly against the original colours.
  // Leaving the page: remove the attribute (restoring the full html filter)
  // and re-apply JS swatch pre-distortion for pages that use the full filter.
  (function() {
    function updateTagTypes() {
      if (/tag-types/i.test(location.pathname + location.hash)) {
        if (!docEl.hasAttribute('data-st-tagtypes')) {
          docEl.setAttribute('data-st-tagtypes', 'on');
          clearSwatches(); // remove any JS pre-distorted backgrounds
        }
      } else {
        if (docEl.hasAttribute('data-st-tagtypes')) {
          docEl.removeAttribute('data-st-tagtypes');
          if (darkOn()) fixSwatches(); // re-apply JS approach on full-filter pages
        }
      }
    }
    var _push2    = history.pushState.bind(history);
    var _replace2 = history.replaceState.bind(history);
    history.pushState    = function() { _push2.apply(history, arguments);    updateTagTypes(); };
    history.replaceState = function() { _replace2.apply(history, arguments); updateTagTypes(); };
    window.addEventListener('popstate',    updateTagTypes);
    window.addEventListener('hashchange',  updateTagTypes);
    updateTagTypes(); // check current URL on load
  })();
})();

/* ==== ST-DARK: hard stop for white active chip in Settings sidebar ==== */
(function(){ if (window.__ST_DARK_SKIP__) return;
  const id='st-dark-settings-activechip';
  if (!document.getElementById(id)) {
    const st=document.createElement('style');
    st.id=id;
    st.textContent = `
      html[data-st-dark="on"] [data-st-sidebar="on"] [class*="active-settings-group__"],
      html[data-st-dark="on"] [data-st-sidebar="on"] [class*="--selected"]{
        background-color: rgba(255,255,255,0.12) !important;
        color: #ffffff !important;
      }
      html[data-st-dark="on"] [data-st-sidebar="on"] [class*="active-settings-group__"] a,
      html[data-st-dark="on"] [data-st-sidebar="on"] [class*="--selected"] a{
        color: #ffffff !important;
      }
    `;
    document.documentElement.appendChild(st);
  }
})();
/* ==== end hard stop ==== */

/* ===== ST-DARK v0.1.7: Settings sidebar hover + search hardening ===== */
(function(){ if (window.__ST_DARK_SKIP__) return;
  const ID = 'st-dark-settings-v017';
  if (document.getElementById(ID)) return;
  const st = document.createElement('style');
  st.id = ID;
  st.textContent = `
html[data-st-dark="on"] [data-st-sidebar="on"]{background-color:#121212!important;color:#eaeaea!important;color-scheme:dark!important}
html[data-st-dark="on"] [data-st-sidebar="on"] :where(a:hover,[role="menuitem"]:hover,li:hover,.item:hover,.accordion__item:hover,.settings-link:hover,
a:focus,a:active,[role="menuitem"]:focus,[role="menuitem"]:active){background-color:rgba(255,255,255,0.10)!important;color:#fff!important}
html[data-st-dark="on"] [data-st-sidebar="on"] :where(a:hover *,[role="menuitem"]:hover *,a:focus *,[role="menuitem"]:focus *){color:#fff!important}
html[data-st-dark="on"] [data-st-sidebar="on"] :where(.active,.is-selected,[aria-current="page"],[aria-selected="true"],[class*="active-settings-group__"],[class*="--selected"]){background-color:rgba(255,255,255,0.14)!important;color:#fff!important}
html[data-st-dark="on"] [data-st-sidebar="on"] :where(.active a,.is-selected a,[aria-current="page"] a,[class*="active-settings-group__"] a,[class*="--selected"] a){color:#fff!important}
html[data-st-dark="on"] [data-st-sidebar="on"] .Input,
html[data-st-dark="on"] [data-st-sidebar="on"] .Input__innerWrapper,
html[data-st-dark="on"] [data-st-sidebar="on"] .Input__InnerWrapper,
html[data-st-dark="on"] [data-st-sidebar="on"] [class*="search-input"]{background-color:#1a1a1a!important;border-color:#2a2a2a!important;box-shadow:none!important;filter:none!important}
html[data-st-dark="on"] [data-st-sidebar="on"] input[type="search"],
html[data-st-dark="on"] [data-st-sidebar="on"] input[type="text"],
html[data-st-dark="on"] [data-st-sidebar="on"] .Input__innerWrapper input,
html[data-st-dark="on"] [data-st-sidebar="on"] .Input__InnerWrapper input{background:transparent!important;color:#f2f2f3!important;-webkit-text-fill-color:#f2f2f3!important;caret-color:#f2f2f3!important;border:none!important;box-shadow:none!important;filter:none!important}
html[data-st-dark="on"] [data-st-sidebar="on"] input::placeholder{color:#a8b0b9!important;opacity:1!important}
html[data-st-dark="on"] [data-st-sidebar="on"] .Input__innerWrapper svg,
html[data-st-dark="on"] [data-st-sidebar="on"] .Input__InnerWrapper svg{color:#d9d9d9!important;fill:#d9d9d9!important;stroke:#d9d9d9!important}
`;
  document.documentElement.appendChild(st);
})();
/* ===== end v0.1.7 block ===== */

/* ===== ST-DARK v0.1.9: CHILD submenu hover + pseudo-element chip fix ===== */
(function(){ if (window.__ST_DARK_SKIP__) return;
  const ID='st-dark-settings-v019';
  if (document.getElementById(ID)) return;
  const st=document.createElement('style'); st.id=ID;
  st.textContent=`
html[data-st-dark="on"] [data-st-sidebar="on"] :where(li, a, button, [role="menuitem"], [class*="item"], [class*="row"])::before,
html[data-st-dark="on"] [data-st-sidebar="on"] :where(li, a, button, [role="menuitem"], [class*="item"], [class*="row"])::after{
  background-color: transparent !important;
  border-color: transparent !important;
}
html[data-st-dark="on"] [data-st-sidebar="on"] :where(.accordion, [class*="accordion"]) :where(li:hover, a:hover, button:hover, [role="menuitem"]:hover, [class*="item"]:hover, [class*="row"]:hover){
  background: rgba(255,255,255,0.10) !important;
  color:#fff !important;
}
html[data-st-dark="on"] [data-st-sidebar="on"] :where(.accordion, [class*="accordion"]) :where(li:hover, a:hover, button:hover, [role="menuitem"]:hover, [class*="item"]:hover, [class*="row"]:hover) *{
  color:#fff !important;
}
html[data-st-dark="on"] [data-st-sidebar="on"] :where(.accordion, [class*="accordion"]) :where(li:hover, a:hover, button:hover, [role="menuitem"]:hover, [class*="item"]:hover, [class*="row"]:hover)::before,
html[data-st-dark="on"] [data-st-sidebar="on"] :where(.accordion, [class*="accordion"]) :where(li:hover, a:hover, button:hover, [role="menuitem"]:hover, [class*="item"]:hover, [class*="row"]:hover)::after{
  background: rgba(255,255,255,0.10) !important;
  border-color: transparent !important;
}
`;
  document.documentElement.appendChild(st);
})();
/* ===== end v0.1.9 ===== */

/* ===== ST-DARK v0.2.1: Accordion child + parent hover kill (pseudo-elements too) ===== */
(function(){ if (window.__ST_DARK_SKIP__) return;
  const id='st-dark-accordion-hover-v021';
  if(document.getElementById(id)) return;
  const st=document.createElement('style'); st.id=id; st.textContent=`
html[data-st-dark="on"] [data-st-sidebar="on"] :where(
  .accordion__item a:hover,
  .accordion__item button:hover,
  .accordion__item [role="menuitem"]:hover,
  .accordion__item li:hover,
  .accordion__item [class*="title_"]:hover,
  .accordion__item [class*="settings-"]:hover,
  a:hover,[role="menuitem"]:hover,li:hover,button:hover
){
  background-color: rgba(255,255,255,0.10) !important; color:#fff !important;
}
html[data-st-dark="on"] [data-st-sidebar="on"] .accordion__item :where(
  a:hover,button:hover,[role="menuitem"]:hover,li:hover,[class*="title_"]:hover,[class*="settings-"]:hover
) * { color:#fff !important; }
html[data-st-dark="on"] [data-st-sidebar="on"] .accordion__item :where(
  a:hover,button:hover,[role="menuitem"]:hover,li:hover,[class*="title_"]:hover,[class*="settings-"]:hover
)::before,
html[data-st-dark="on"] [data-st-sidebar="on"] .accordion__item :where(
  a:hover,button:hover,[role="menuitem"]:hover,li:hover,[class*="title_"]:hover,[class*="settings-"]:hover
)::after { background-color: rgba(255,255,255,0.10) !important; }
html[data-st-dark="on"] [data-st-sidebar="on"] :where(.active,.is-selected,[aria-current="page"],[aria-selected="true"],[class*="active-settings-group__"],[class*="--selected"]),
html[data-st-dark="on"] [data-st-sidebar="on"] :where(.active,.is-selected,[aria-current="page"],[aria-selected="true"],[class*="active-settings-group__"],[class*="--selected"]):hover{
  background-color: rgba(255,255,255,0.14) !important; color:#fff !important;
}`;
  document.documentElement.appendChild(st);
})();
/* ===== end 0.2.1 ===== */

/* ===== ST-DARK v0.2.2: HARD hover override for accordion parent + child rows ===== */
(function(){ if (window.__ST_DARK_SKIP__) return;
  const ID='st-dark-accordion-hover-v022';
  if (document.getElementById(ID)) return;
  const st=document.createElement('style'); st.id=ID;
  st.textContent = `
html[data-st-dark="on"] [data-st-sidebar="on"]{color-scheme:dark!important}
html[data-st-dark="on"] [data-st-sidebar="on"] :is(a,button,[role="menuitem"],li,.item,.settings-link,.title_header_item,[class*="settings-group-title"],.accordion__item,[class*="accordion"],[class*="menu-item"])::before,
html[data-st-dark="on"] [data-st-sidebar="on"] :is(a,button,[role="menuitem"],li,.item,.settings-link,.title_header_item,[class*="settings-group-title"],.accordion__item,[class*="accordion"],[class*="menu-item"])::after{
  background:transparent!important;border-color:transparent!important;box-shadow:none!important
}
html[data-st-dark="on"] [data-st-sidebar="on"] :is(a,button,[role="menuitem"],li,.item,.settings-link,.title_header_item,[class*="settings-group-title"],.accordion__item,[class*="accordion"] a,[class*="accordion"] button,[class*="menu-item"]) :is(span,div,small,em,strong){color:inherit!important}
html[data-st-dark="on"] [data-st-sidebar="on"] :is(a,button,[role="menuitem"],li,.item,.settings-link,.title_header_item,[class*="settings-group-title"],.accordion__item,[class*="accordion"] a,[class*="accordion"] button,[class*="menu-item"]):hover{
  background-color:rgba(255,255,255,.10)!important;color:#fff!important
}
html[data-st-dark="on"] [data-st-sidebar="on"] :is(a,button,[role="menuitem"],li,.item,.settings-link,.title_header_item,[class*="settings-group-title"],.accordion__item,[class*="accordion"] a,[class*="accordion"] button,[class*="menu-item"]):hover *{color:#fff!important}
html[data-st-dark="on"] [data-st-sidebar="on"] :is(.active,.is-selected,[aria-current="page"],[aria-selected="true"],[class*="active-settings-group__"]){background-color:rgba(255,255,255,.14)!important;color:#fff!important}
html[data-st-dark="on"] [data-st-sidebar="on"] :is(.active,.is-selected,[aria-current="page"],[aria-selected="true"],[class*="active-settings-group__"]):hover{background-color:rgba(255,255,255,.14)!important;color:#fff!important}
html[data-st-dark="on"] [data-st-sidebar="on"] .Input,
html[data-st-dark="on"] [data-st-sidebar="on"] .Input__innerWrapper,
html[data-st-dark="on"] [data-st-sidebar="on"] .Input__InnerWrapper{background-color:#1a1a1a!important;border-color:#2a2a2a!important;box-shadow:none!important;filter:none!important}
html[data-st-dark="on"] [data-st-sidebar="on"] input[type="search"],
html[data-st-dark="on"] [data-st-sidebar="on"] input[type="text"]{background:transparent!important;color:#f2f2f3!important;-webkit-text-fill-color:#f2f2f3!important;caret-color:#f2f2f3!important}
html[data-st-dark="on"] [data-st-sidebar="on"] input::placeholder{color:#a8b0b9!important;opacity:1!important}
`;
  document.documentElement.appendChild(st);
})();

/* ===== ST-DARK v0.2.3: Settings search "highlighted" row fix ===== */
(function(){ if (window.__ST_DARK_SKIP__) return;
  const ID='st-dark-settings-v023';
  if (document.getElementById(ID)) return;
  const st=document.createElement('style'); st.id=ID;
  st.textContent = `
html[data-st-dark="on"] [data-st-sidebar="on"] :is([class*="highlighted"], .highlighted){
  background-color: rgba(255,255,255,0.12) !important;
  color: #fff !important;
}
html[data-st-dark="on"] [data-st-sidebar="on"] :is([class*="highlighted"], .highlighted) *{
  color: #fff !important;
}
html[data-st-dark="on"] [data-st-sidebar="on"] :is([class*="highlighted"], .highlighted)::before,
html[data-st-dark="on"] [data-st-sidebar="on"] :is([class*="highlighted"], .highlighted)::after{
  background: rgba(255,255,255,0.12) !important;
  border-color: transparent !important;
  box-shadow: none !important;
}
html[data-st-dark="on"] [data-st-sidebar="on"] mark{
  background: rgba(255,255,255,0.18) !important;
  color: #fff !important;
}
`;
  document.documentElement.appendChild(st);
})();
/* ===== end v0.2.3 ===== */


/* ===== ST-DARK: BCN promo modal + overlay neutralizer with proper light-mode restore ===== */
(function(){ if (window.__ST_DARK_SKIP__) return;
  if (window.__stDarkBcnModalFix2) return; window.__stDarkBcnModalFix2 = true;
  const docEl = document.documentElement;
  const darkOn = () => docEl.getAttribute("data-st-dark") === "on";

  function locate(){
    const img = document.querySelector('img[alt*="Ultimate ServiceTitan Guide"], img[src*="assets/guide.jpg"]');
    if (!img) return {};
    const card = img.closest('div') || null;
    const overlay = card && card.parentElement instanceof HTMLElement ? card.parentElement : null;
    return {overlay, card};
  }

  function applyFix(){
    if (!darkOn()) return;
    const {overlay} = locate();
    if (!overlay) return;
    overlay.dataset.stDarkBcnFixed = "1";
    overlay.style.setProperty('filter','invert(1) hue-rotate(180deg)','important');
    overlay.querySelectorAll('img').forEach(el => {
      el.dataset.stDarkBcnImg = "1";
      el.style.setProperty('filter','none','important');
    });
  }

  function removeFix(){
    const {overlay} = locate();
    if (!overlay) return;
    if (overlay.dataset.stDarkBcnFixed === "1"){
      overlay.style.removeProperty('filter');
      delete overlay.dataset.stDarkBcnFixed;
    }
    overlay.querySelectorAll('img').forEach(el => {
      if (el.dataset.stDarkBcnImg === "1"){
        el.style.removeProperty('filter');
        delete el.dataset.stDarkBcnImg;
      }
    });
  }

  function sync(){
    if (darkOn()) applyFix();
    else removeFix();
  }

  // run now
  sync();

  // watch for modal insertion
  const mo = new MutationObserver(muts => {
    for (const m of muts){
      if (m.type === 'childList' && m.addedNodes.length){
        sync();
      }
    }
  });
  mo.observe(document, {subtree:true, childList:true});

  // respond to dark-mode state messages
  window.addEventListener('message',(e)=>{
    const msg=e?.data; if (!msg || msg.__st!==true) return;
    if (msg.type === 'ST_DARK_STATE' || msg.type === 'ST_DARK_SET' || msg.type === 'ST_DARK_TOGGLE') {
      // Apply or remove based on current attribute
      // Delay a tick so the attribute is definitely updated
      setTimeout(sync, 0);
    }
  }, {passive:true});
})();
/* ===== end modal neutralizer ===== */


/* ===== ST-DARK v0.3.2: Global Search overlay (top-layer) patch — minimal & isolated ===== */
(function(){ if (window.__ST_DARK_SKIP__) return;
  if (window.__stDarkGS_TopLayer) return; window.__stDarkGS_TopLayer = true;
  const docEl = document.documentElement;
  const darkOn = () => docEl.getAttribute("data-st-dark")==="on";

  // 1) Document-level CSS for the plain-DOM search overlay (no shadow)
  const DOC_STYLE_ID = "st-dark-gs-doc-style";
  const DOC_CSS = `
  /* Only when dark mode is on, and only the Search overlay section that contains the Search input */
  html[data-st-dark="on"] section[data-open="true"]:has([role="search"] input[name="search-query-text"]) {
    background-color:#121212 !important; color:#eaeef2 !important; color-scheme: dark !important;
  }
  html[data-st-dark="on"] section[data-open="true"]:has([role="search"] input[name="search-query-text"]) :is(.bg-default,.bg-stronger,[popover],[role="listbox"],[data-anv="combobox-list"]) {
    background-color:#121212 !important; color:#eaeef2 !important;
  }
  html[data-st-dark="on"] section[data-open="true"]:has([role="search"] input[name="search-query-text"]) :is(a,span,div,li,button,p,small,label,h1,h2,h3,h4,h5,h6) {
    color:#eaeef2 !important; opacity:1 !important;
  }
  html[data-st-dark="on"] section[data-open="true"]:has([role="search"] input[name="search-query-text"]) :is([data-anv="icon"],svg) {
    color:#d9d9d9 !important; fill:#d9d9d9 !important; stroke:#d9d9d9 !important;
  }
  html[data-st-dark="on"] section[data-open="true"]:has([role="search"] input[name="search-query-text"]) :is(input,textarea) {
    background-color:#1b1b1c !important; color:#eaeef2 !important; -webkit-text-fill-color:#eaeef2 !important; caret-color:#eaeef2 !important; border:none !important; box-shadow:none !important;
  }
  html[data-st-dark="on"] section[data-open="true"]:has([role="search"] input[name="search-query-text"]) :is(input,textarea)::placeholder {
    color:#a8b0b9 !important; opacity:1 !important;
  }

  /* ---- Quick-actions toolbar override ----------------------------------------
     The rules above set explicit dark values (#121212 bg, #eaeef2 text) on the
     whole search section.  After the html filter inverts them the toolbar ends up
     with a near-white background and near-black icons — the opposite of what we
     want.  Fix: use single-inversion-compatible LIGHT values here so the html
     filter inverts them to the correct dark-mode appearance.
     These selectors are intentionally more specific (B=5-6) than the generic
     section rules above (B=4) so they always win even when both are !important.
  ---------------------------------------------------------------------------- */
  html[data-st-dark="on"] section[data-open="true"]:has([role="search"] input[name="search-query-text"]) [data-fs-element="Global Search - Result | Quick Actions Container"],
  html[data-st-dark="on"] section[data-open="true"]:has([role="search"] input[name="search-query-text"]) [data-anv="toolbar"] {
    background-color: #e0e0e0 !important;
    border-color: rgba(0,0,0,0.14) !important;
    box-shadow: none !important;
  }
  html[data-st-dark="on"] section[data-open="true"]:has([role="search"] input[name="search-query-text"]) [data-fs-element="Global Search - Result | Quick Actions Container"] :is(a,span,div,li,button,p,small,label,h1,h2,h3,h4,h5,h6),
  html[data-st-dark="on"] section[data-open="true"]:has([role="search"] input[name="search-query-text"]) [data-anv="toolbar"] :is(a,span,div,li,button,p,small,label,h1,h2,h3,h4,h5,h6) {
    color: #1a1a1a !important;
  }
  html[data-st-dark="on"] section[data-open="true"]:has([role="search"] input[name="search-query-text"]) [data-fs-element="Global Search - Result | Quick Actions Container"] :is([data-anv="icon"],svg),
  html[data-st-dark="on"] section[data-open="true"]:has([role="search"] input[name="search-query-text"]) [data-anv="toolbar"] :is([data-anv="icon"],svg) {
    color: #1a1a1a !important; fill: #1a1a1a !important; stroke: #1a1a1a !important;
  }
  `;

  function ensureDocStyle(){
    let st = document.getElementById(DOC_STYLE_ID);
    if (!st){
      st = document.createElement("style"); st.id = DOC_STYLE_ID; st.textContent = DOC_CSS;
      document.documentElement.appendChild(st);
    }
  }

  // 2) Shadow-root stylesheet for the web-component version
  const SHADOW_STYLE_ID = "st-dark-gs-shadow-style";
  const SHADOW_CSS = `
  :host-context(html[data-st-dark="on"]) section[data-open="true"]{
    background-color:#121212 !important; color:#eaeef2 !important; color-scheme: dark !important;
  }
  :host-context(html[data-st-dark="on"]) section[data-open="true"] :is(.bg-default,.bg-stronger,[popover],[role="listbox"],[data-anv="combobox-list"]){
    background-color:#121212 !important; color:#eaeef2 !important;
  }
  :host-context(html[data-st-dark="on"]) section[data-open="true"] :is(a,span,div,li,button,p,small,label,h1,h2,h3,h4,h5,h6){
    color:#eaeef2 !important; opacity:1 !important;
  }
  :host-context(html[data-st-dark="on"]) :is([data-anv="icon"],svg){
    color:#d9d9d9 !important; fill:#d9d9d9 !important; stroke:#d9d9d9 !important;
  }
  :host-context(html[data-st-dark="on"]) section[data-open="true"] :is(input,textarea){
    background-color:#1b1b1c !important; color:#eaeef2 !important; -webkit-text-fill-color:#eaeef2 !important; caret-color:#eaeef2 !important; border:none !important; box-shadow:none !important;
  }
  :host-context(html[data-st-dark="on"]) section[data-open="true"] :is(input,textarea)::placeholder{
    color:#a8b0b9 !important; opacity:1 !important;
  }
  `;

  function patchGSShadow(host){
    try{
      if (!host) return;
      const root = host.shadowRoot; if (!root) return;
      if (root.getElementById(SHADOW_STYLE_ID)) return;
      const st = document.createElement("style"); st.id = SHADOW_STYLE_ID; st.textContent = SHADOW_CSS;
      root.appendChild(st);
    } catch {}
  }

  function scanAndPatch(){
    if (!darkOn()) return;
    ensureDocStyle();
    // shadow hosts — individual tenant search bar
    document.querySelectorAll('servicetitan-global-search-bar,[data-mfe-name="servicetitan-global-search-bar"]').forEach(patchGSShadow);
    // Enterprise Hub: search is nested two shadow roots deep
    // Outer: <servicetitan-global-search-ehub-*> → inner: <servicetitan-global-search-bar-*>
    if (/^enterprise-hub\./i.test(location.hostname)) {
      try {
        const center = document.querySelector('header [class*="center"]');
        if (center) {
          for (const child of center.children) {
            if (child.tagName.toLowerCase().startsWith('servicetitan-global-search-ehub') && child.shadowRoot) {
              for (const inner of child.shadowRoot.querySelectorAll('*')) {
                if (inner.tagName.toLowerCase().startsWith('servicetitan-global-search-bar') && inner.shadowRoot) {
                  patchGSShadow(inner);
                }
              }
            }
          }
        }
      } catch {}
    }
  }

  // initial + observe
  scanAndPatch();
  const mo = new MutationObserver(() => { scanAndPatch(); });
  mo.observe(document, {subtree:true, childList:true});

  // Enterprise Hub: the search overlay lives two shadow roots deep and
  // ServiceTitan may re-render the inner component at any time, destroying
  // our injected styles.  Strategy:
  //   1. Find the inner search-bar host via click-triggered polling (the
  //      overlay only renders on first interaction).
  //   2. Keep a lightweight MutationObserver (childList only, NOT subtree)
  //      that checks whether our style elements still exist.
  //   3. Debounce with requestAnimationFrame so re-injection never cascades.
  if (/^enterprise-hub\./i.test(location.hostname)) {
    let ehubSearchHost = null;   // the inner <servicetitan-global-search-bar-*>
    let ehubRafPending = false;
    let ehubEventFired = false;

    const ensureStyles = () => {
      if (!ehubSearchHost?.shadowRoot) return;
      const sr = ehubSearchHost.shadowRoot;
      if (!sr.querySelector('section')) return;          // overlay not open
      if (!sr.getElementById('st-dark-gs-shadow-style')) patchGSShadow(ehubSearchHost);
      // Notify v0.7.4/v0.7.6/v0.7.8 — they're idempotent (check by ID before adding)
      if (!ehubEventFired || !sr.getElementById('st-dark-gs-074')) {
        ehubEventFired = true;
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('st-ehub-search-ready', { detail: { host: ehubSearchHost } }));
        }, 0);
      }
    };

    const findAndWatch = () => {
      if (ehubSearchHost) return true;
      try {
        const center = document.querySelector('header [class*="center"]');
        if (!center) return false;
        for (const child of center.children) {
          if (!child.tagName.toLowerCase().startsWith('servicetitan-global-search-ehub') || !child.shadowRoot) continue;
          for (const inner of child.shadowRoot.querySelectorAll('*')) {
            if (!inner.tagName.toLowerCase().startsWith('servicetitan-global-search-bar') || !inner.shadowRoot) continue;
            ehubSearchHost = inner;
            ensureStyles();
            // Persistent observer — debounced via rAF, childList only (not subtree)
            new MutationObserver(() => {
              if (!ehubRafPending) {
                ehubRafPending = true;
                requestAnimationFrame(() => { ehubRafPending = false; ensureStyles(); });
              }
            }).observe(inner.shadowRoot, { childList: true });
            return true;
          }
        }
      } catch {}
      return false;
    };

    // Try immediately + delayed (component may not exist yet)
    findAndWatch();
    setTimeout(findAndWatch, 500);
    setTimeout(findAndWatch, 2000);

    // On header click/keyboard, poll briefly for the overlay to appear
    const onInteract = () => {
      if (ehubSearchHost) { ensureStyles(); return; }
      let tries = 0;
      const t = setInterval(() => { if (findAndWatch() || ++tries >= 10) clearInterval(t); }, 150);
    };
    document.addEventListener('click', (e) => {
      const h = document.querySelector('header');
      if (h?.contains(e.target)) onInteract();
    }, true);
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') onInteract();
    }, true);
  }

  // also respond to your dark-state messages
  window.addEventListener("message", (e)=>{
    const msg=e?.data; if (!msg || msg.__st!==true) return;
    if (msg.type==="ST_DARK_STATE" || msg.type==="ST_DARK_SET" || msg.type==="ST_DARK_TOGGLE"){
      setTimeout(scanAndPatch,0);
    }
  }, {passive:true});
})();
/* ===== end v0.3.2 patch ===== */

/* ===== ST-DARK v0.7.4: Minimal fix — keep pill on hover, no extra yellow ==================
   - Remove any earlier st-dark-gs-* sheets from the search component shadowRoot.
   - Inject only what's needed:
       * Names/links blue (#3391ff)
       * Letters inside highlight pill blue (keep ServiceTitan's original yellow bg)
       * Full-row gray hover; remove white halo
       * Neutralize quick-actions
   - No 'clear child backgrounds' rule, so the pill never disappears.
   - Safe: CSS-only; short retry loop; no observers; no inline writes.
=========================================================================================== */
(function(){ if (window.__ST_DARK_SKIP__) return;
  if (window.__stDarkGS_074) return; window.__stDarkGS_074 = true;

  const STYLE_ID = 'st-dark-gs-074';
  const OLD_PREFIX = 'st-dark-gs-';

  const CSS = `
/* Names/links in results: Darkreader blue — dark mode only */
:host-context(html[data-st-dark="on"]) a[data-anv="link"],
:host-context(html[data-st-dark="on"]) a[class^="_link_"],
:host-context(html[data-st-dark="on"]) a[class*=" _link_"]{
  color:#3391ff !important;
  -webkit-text-fill-color:#3391ff !important;
}

/* Keep existing yellow pill; only the letters turn blue — dark mode only */
:host-context(html[data-st-dark="on"]) span[class^="highlight__"] > em,
:host-context(html[data-st-dark="on"]) span[class*=" highlight__"] > em{
  color:#3391ff !important;
  -webkit-text-fill-color:#3391ff !important;
  font-weight:600;
}

/* Full-row hover/selected in gray (no white halo) — dark mode only */
:host-context(html[data-st-dark="on"]) article[data-result-rank],
:host-context(html[data-st-dark="on"]) li[role="option"],
:host-context(html[data-st-dark="on"]) [class^="_card_"],
:host-context(html[data-st-dark="on"]) [class*=" _card_"]{
  transition:background-color .15s ease, box-shadow .15s ease, outline-color .15s ease, border-color .15s ease;
  border-radius:10px;
}
:host-context(html[data-st-dark="on"]) article[data-result-rank]:is(:hover,[aria-selected="true"]),
:host-context(html[data-st-dark="on"]) li[role="option"]:is(:hover,[aria-selected="true"]),
:host-context(html[data-st-dark="on"]) [class^="_card_"]:is(:hover,[aria-selected="true"]),
:host-context(html[data-st-dark="on"]) [class*=" _card_"]:is(:hover,[aria-selected="true"]){
  background-color:#2a2a2a !important;
  box-shadow:none !important;
  outline:none !important;
  border-color:rgba(255,255,255,0.14) !important;
}

/* Cancel the general SHADOW_CSS card counter-invert for global search.
   GS cards should be single-inverted (html filter only) so they render
   as dark bg + light text in dark mode. */
:host-context(html[data-st-dark="on"]) [data-anv="card"] {
  filter: none !important;
}
/* Chips inside GS cards no longer have a parent counter-invert, so they
   need their own counter-invert to restore original chip colors. */
:host-context(html[data-st-dark="on"]) [data-anv="card"] [class*="chip"],
:host-context(html[data-st-dark="on"]) [data-anv="card"] [style*="--int-"],
:host-context(html[data-st-dark="on"]) [data-anv="card"] [data-anvil-component][style*="background-color"] {
  filter: invert(1) hue-rotate(180deg) !important;
}

/* Neutralize quick-actions washout — dark mode only */
:host-context(html[data-st-dark="on"]) .actions__wQ5Dp,
:host-context(html[data-st-dark="on"]) .actions_wQ5Dp,
:host-context(html[data-st-dark="on"]) [data-fs-element="global-search-quick-actions-container"]{
  background:transparent !important;
  box-shadow:none !important;
  filter:none !important;
  border-color:transparent !important;
}`;

  function cleanOld(root){
    if (!root) return;
    const styles = root.querySelectorAll('style[id^="'+OLD_PREFIX+'"]');
    styles.forEach(s => s.remove());
  }

  function injectInto(host){
    const root = host && host.shadowRoot;
    if (!root) return false;
    cleanOld(root);
    if (root.getElementById && root.getElementById(STYLE_ID)) return true;
    const s = document.createElement('style');
    s.id = STYLE_ID; s.textContent = CSS;
    (root.querySelector('head') || root).appendChild(s);
    return true;
  }

  function findAllSearchHosts(){
    const hosts = [];
    document.querySelectorAll('servicetitan-global-search-bar,[data-mfe-name="servicetitan-global-search-bar"]').forEach(h => hosts.push(h));
    // Enterprise Hub: nested two shadow roots deep
    try {
      const center = document.querySelector('header [class*="center"]');
      if (center) {
        for (const child of center.children) {
          if (child.tagName.toLowerCase().startsWith('servicetitan-global-search-ehub') && child.shadowRoot) {
            for (const inner of child.shadowRoot.querySelectorAll('*')) {
              if (inner.tagName.toLowerCase().startsWith('servicetitan-global-search-bar') && inner.shadowRoot) {
                hosts.push(inner);
              }
            }
          }
        }
      }
    } catch {}
    return hosts;
  }

  function tryInject(){
    let injected = false;
    findAllSearchHosts().forEach(h => {
      injected = injectInto(h) || injected;
    });
    return injected;
  }

  let tries = 0, max = 40;
  const timer = setInterval(() => {
    tries++;
    const ok = tryInject();
    if (ok || tries >= max) clearInterval(timer);
  }, 100);

  // Enterprise Hub: patch on-demand when the search shadow root becomes available
  window.addEventListener('st-ehub-search-ready', (e) => { if (e.detail?.host) injectInto(e.detail.host); });
})();
/* ===== end v0.7.4 ======================================================================= */


/* ===== ST-DARK v0.7.6: Tighten global search pill (em only) =====================
   Change: Only style the <em> inside the highlight span within the global search
   component's shadow root. No document-level CSS to prevent spillover. 
   Goal: darker, slightly more transparent pill for better readability.
=================================================================================== */
(function(){ if (window.__ST_DARK_SKIP__) return;
  if (window.__stDarkGS_076) return; window.__stDarkGS_076 = true;

  const STYLE_ID = 'st-dark-gs-076';

  const SHADOW_CSS = `
  /* narrow target: the <em> inside the highlight wrapper only */
  :host-context(html[data-st-dark="on"]) span[class^="highlight__"] > em,
  :host-context(html[data-st-dark="on"]) span[class*=" highlight__"] > em{
    background-color: rgba(110, 85, 0, 0.34) !important; /* darker amber, more transparent */
    border-radius: 6px !important;
    padding: 1px 4px !important;
    color: inherit !important; /* keep readable foreground */
  }
  `;

  function injectIntoShadow(host){
    try{
      const root = host && host.shadowRoot; if (!root) return;
      if (root.getElementById(STYLE_ID)) return;
      const s = document.createElement('style'); s.id = STYLE_ID; s.textContent = SHADOW_CSS;
      (root.querySelector('head') || root).appendChild(s);
    }catch{}
  }

  function findSearchHosts076(){
    const hosts = [];
    document.querySelectorAll('servicetitan-global-search-bar,[data-mfe-name="servicetitan-global-search-bar"]').forEach(h => hosts.push(h));
    try {
      const center = document.querySelector('header [class*="center"]');
      if (center) for (const c of center.children)
        if (c.tagName.toLowerCase().startsWith('servicetitan-global-search-ehub') && c.shadowRoot)
          for (const inner of c.shadowRoot.querySelectorAll('*'))
            if (inner.tagName.toLowerCase().startsWith('servicetitan-global-search-bar') && inner.shadowRoot)
              hosts.push(inner);
    } catch {}
    return hosts;
  }

  let tries = 0, max = 40;
  const tick = () => {
    findSearchHosts076().forEach(injectIntoShadow);
    if (++tries < max) setTimeout(tick, 100);
  };
  tick();

  // Enterprise Hub: patch on-demand when the search shadow root becomes available
  window.addEventListener('st-ehub-search-ready', (e) => { if (e.detail?.host) injectIntoShadow(e.detail.host); });
})();
/* ===== end v0.7.6 =============================================================== */


/* ===== ST-DARK v0.7.8: Global search result quick-actions menu — dark styling =====
   ServiceTitan added a hover action bar on search results (e.g. collect payment,
   email invoice). It renders light-colored in both modes. This patch targets its
   actual selector (data-fs-element="Global Search - Result | Quick Actions Container")
   and makes it dark when dark mode is on. Injected into the search shadow root.
=================================================================================== */
(function(){ if (window.__ST_DARK_SKIP__) return;
  if (window.__stDarkGS_078) return; window.__stDarkGS_078 = true;

  const STYLE_ID = 'st-dark-gs-078';

  const SHADOW_CSS = `
  /* The quick-actions toolbar renders in a CSS top-layer / popover anchor that
     BYPASSES the html filter: invert(1).  The computed background shows as a
     light value even after our CSS sets it, confirming no inversion occurs.
     Fix: use DIRECT DARK VALUES — no filter tricks — since this element renders
     outside the html filter context. */
  :host-context(html[data-st-dark="on"]) [data-fs-element="Global Search - Result | Quick Actions Container"],
  :host-context(html[data-st-dark="on"]) [class^="actions_"],
  :host-context(html[data-st-dark="on"]) [class*=" actions_"] {
    background-color: #2a2a2a !important;
    border-color: #3e3e3e !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.5) !important;
    color-scheme: dark !important;
  }

  /* Ghost buttons — transparent bg stays transparent; remove any light borders */
  :host-context(html[data-st-dark="on"]) [data-anv="toolbar-button"],
  :host-context(html[data-st-dark="on"]) [class^="actions_"] button,
  :host-context(html[data-st-dark="on"]) [class*=" actions_"] button {
    background-color: transparent !important;
    border-color: transparent !important;
    color: #d4d4d4 !important;
  }
  :host-context(html[data-st-dark="on"]) [data-anv="toolbar-button"]:hover,
  :host-context(html[data-st-dark="on"]) [class^="actions_"] button:hover,
  :host-context(html[data-st-dark="on"]) [class*=" actions_"] button:hover {
    background-color: rgba(255,255,255,0.10) !important;
  }

  /* Icons — direct light value (no inversion needed) */
  :host-context(html[data-st-dark="on"]) [data-fs-element="Global Search - Result | Quick Actions Container"] svg,
  :host-context(html[data-st-dark="on"]) [class^="actions_"] svg,
  :host-context(html[data-st-dark="on"]) [class*=" actions_"] svg {
    color: #d4d4d4 !important;
    fill: #d4d4d4 !important;
    stroke: #d4d4d4 !important;
  }

  /* Text labels — direct light value */
  :host-context(html[data-st-dark="on"]) [data-fs-element="Global Search - Result | Quick Actions Container"] :is(span, div, p),
  :host-context(html[data-st-dark="on"]) [class^="actions_"] :is(span, div, p),
  :host-context(html[data-st-dark="on"]) [class*=" actions_"] :is(span, div, p) {
    color: #d4d4d4 !important;
  }
  `;

  function injectIntoShadow(host){
    try{
      const root = host && host.shadowRoot; if (!root) return;
      if (root.getElementById(STYLE_ID)) return;
      const s = document.createElement('style'); s.id = STYLE_ID; s.textContent = SHADOW_CSS;
      (root.querySelector('head') || root).appendChild(s);
    }catch{}
  }

  function findSearchHosts078(){
    const hosts = [];
    document.querySelectorAll('servicetitan-global-search-bar,[data-mfe-name="servicetitan-global-search-bar"]').forEach(h => hosts.push(h));
    try {
      const center = document.querySelector('header [class*="center"]');
      if (center) for (const c of center.children)
        if (c.tagName.toLowerCase().startsWith('servicetitan-global-search-ehub') && c.shadowRoot)
          for (const inner of c.shadowRoot.querySelectorAll('*'))
            if (inner.tagName.toLowerCase().startsWith('servicetitan-global-search-bar') && inner.shadowRoot)
              hosts.push(inner);
    } catch {}
    return hosts;
  }

  let tries = 0, max = 40;
  const tick = () => {
    findSearchHosts078().forEach(injectIntoShadow);
    if (++tries < max) setTimeout(tick, 100);
  };
  tick();

  // Enterprise Hub: patch on-demand when the search shadow root becomes available
  window.addEventListener('st-ehub-search-ready', (e) => { if (e.detail?.host) injectIntoShadow(e.detail.host); });
})();
/* ===== end v0.7.8 =============================================================== */



/* ===== EMOJI COUNTER-INVERT ================================================
   The html filter: invert(1) hue-rotate(180deg) distorts emoji because emoji
   are color bitmap glyphs — hue-rotate scrambles their colors.  The CSS-only
   approach (applying filter:none to every ancestor) isn't practical because
   emoji appear inline inside arbitrary text nodes.

   Fix: walk the DOM for text nodes that contain emoji, wrap each emoji
   character run in a <span> with the counter-invert filter applied inline
   (specificity wins over any author rule), then watch for dynamically added
   content with a MutationObserver and re-process new nodes on each turn.

   Skip:
     • Nodes that are already inside a counter-inverted chip/tag element
       (those elements invert the emoji back to correct by themselves).
     • <script>, <style>, <textarea>, <input> text content.
     • Nodes already processed (data-emoji-wrapped="1" guard on the parent).
============================================================================ */
(function emojiCounterInvert(){
  if (window.__ST_DARK_SKIP__) return;

  // Matches any character with the Emoji_Presentation or Extended_Pictographic
  // Unicode property — i.e., characters that render as colorful glyphs.
  const EMOJI_RE = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;

  // Selectors whose subtree already gets counter-inverted by other rules.
  // Emoji inside these are already restored — wrapping them again would produce
  // a third inversion and scramble colors. Includes chips/cards AND any element
  // that carries its own counter-invert filter (Popper dropdowns, Kendo popups,
  // Semantic UI dropdowns, etc.).
  // NOTE: [data-popper-placement] is added by Popper.js asynchronously (after
  // React's initial render), so it may not be present when the MutationObserver
  // fires. Class-based selectors (.Popper, Popper__body, Popover__body) are set
  // from first render and are therefore reliable even at insertion time.
  //
  // IMPORTANT: Anvil components ([data-anvil-component][data-popper-placement])
  // now have filter:none applied (see CSS block above), so they are NOT
  // counter-inverted — emoji wrapping MUST run inside them.  Only non-Anvil
  // Popper.js elements (which still carry filter:invert counter-invert) should
  // be skipped.  Use :not([data-anvil-component]) to distinguish them.
  //
  // [popover] / :popover-open: native popover elements land on the CSS top-layer
  // and bypass the html filter entirely (and have no other filter applied in
  // dark mode), so their emojis already render at original colors.  Wrapping
  // them would introduce a net inversion.  Covers both light-DOM popovers and
  // shadow-DOM native popovers such as the dispatch board job hover popover.
  const SKIP_CHIP_SEL = '[style*="--int-"],[class*="chip"],[data-anvil-component][style*="background-color"],.callscreen-search-location-results .label,[data-anv="card"],[data-popper-placement]:not([data-anvil-component]),.k-popup,.k-animation-container,.ui.dropdown .menu,[popover],:popover-open';

  // Tags whose text content should never be touched.
  const SKIP_TAGS = new Set(['SCRIPT','STYLE','TEXTAREA','INPUT','NOSCRIPT','TEMPLATE']);

  function wrapEmoji(textNode) {
    const parent = textNode.parentNode;
    if (!parent) return;
    if (SKIP_TAGS.has(parent.tagName)) return;
    // Already wrapped by us
    if (parent.dataset && parent.dataset.emojiWrapped) return;
    // Inside a chip/card that already restores colors
    if (parent.closest && parent.closest(SKIP_CHIP_SEL)) return;

    const raw = textNode.nodeValue;
    if (!EMOJI_RE.test(raw)) return;
    EMOJI_RE.lastIndex = 0; // reset after .test()

    // Build a DocumentFragment replacing the text node with text + wrapped spans
    const frag = document.createDocumentFragment();
    let last = 0, m;
    EMOJI_RE.lastIndex = 0;
    while ((m = EMOJI_RE.exec(raw)) !== null) {
      if (m.index > last) {
        frag.appendChild(document.createTextNode(raw.slice(last, m.index)));
      }
      const span = document.createElement('span');
      span.textContent = m[0];
      span.style.cssText = 'filter:invert(1) hue-rotate(180deg);display:inline;';
      span.dataset.emojiWrapped = '1';
      frag.appendChild(span);
      last = m.index + m[0].length;
    }
    if (last < raw.length) {
      frag.appendChild(document.createTextNode(raw.slice(last)));
    }
    parent.replaceChild(frag, textNode);
  }

  function processNode(root) {
    // Only run when dark mode is active
    if (!document.documentElement.hasAttribute('data-st-dark')) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = node.parentNode;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (SKIP_TAGS.has(p.tagName)) return NodeFilter.FILTER_REJECT;
        if (p.dataset && p.dataset.emojiWrapped) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(wrapEmoji);
  }

  function removeEmojiWraps(root) {
    (root.querySelectorAll ? root : document).querySelectorAll('span[data-emoji-wrapped]').forEach(span => {
      const parent = span.parentNode;
      if (!parent) return;
      parent.replaceChild(document.createTextNode(span.textContent), span);
      parent.normalize();
    });
  }

  // Walk `root` looking for elements that have their own shadow root, then
  // process emoji in each shadow root and (once obs is defined) observe it
  // for future mutations.  Recurses for nested shadow DOMs.
  // IMPORTANT: only call with observe=true after `obs` is defined below.
  function processAndObserveShadowSubtree(root, observe) {
    try {
      const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
      let el;
      while ((el = w.nextNode())) {
        if (el.shadowRoot) {
          if (document.documentElement.hasAttribute('data-st-dark')) {
            processNode(el.shadowRoot);
          }
          if (observe) {
            try { obs.observe(el.shadowRoot, { childList: true, subtree: true }); } catch(e) {}
          }
          processAndObserveShadowSubtree(el.shadowRoot, observe);
        }
      }
    } catch(e) {}
  }

  // Initial pass once DOM is ready
  function init() {
    processNode(document.body || document.documentElement);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Debounced MutationObserver for dynamic content
  let timer = null;
  const pending = new Set();
  const obs = new MutationObserver(mutations => {
    if (!document.documentElement.hasAttribute('data-st-dark')) return;
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          pending.add(node);
          // If the element carries its own shadow root, process inside it too.
          if (node.shadowRoot) pending.add(node.shadowRoot);
        } else if (node.nodeType === Node.TEXT_NODE && node.parentNode) {
          pending.add(node.parentNode);
        }
      });
    });
    clearTimeout(timer);
    timer = setTimeout(() => {
      pending.forEach(node => { try { processNode(node); } catch(e){} });
      pending.clear();
    }, 80);
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });

  // Now that obs exists, process and observe all shadow roots that are already
  // present in the DOM (e.g. the dispatch board shadow root that hosts the jobs
  // tray).  This is the primary fix for emoji in shadow-DOM content.
  processAndObserveShadowSubtree(document.body || document.documentElement, true);

  // Intercept attachShadow so any shadow roots created *after* this point are
  // automatically added to the observer.  Chain correctly — the main IIFE has
  // already wrapped attachShadow once, so we save *its* version here.
  (function() {
    const _origAS = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function(options) {
      const root = _origAS.call(this, options);
      try { obs.observe(root, { childList: true, subtree: true }); } catch(e) {}
      return root;
    };
  })();

  // Toggle: re-run on dark mode enable, strip wraps on disable
  const htmlEl = document.documentElement;
  const toggleObs = new MutationObserver(() => {
    if (htmlEl.hasAttribute('data-st-dark')) {
      processNode(document.body || htmlEl);
      // Also re-process shadow roots (covers the case where dark mode is toggled
      // on after the page has already fully loaded with shadow roots present).
      processAndObserveShadowSubtree(document.body || htmlEl, true);
    } else {
      removeEmojiWraps(document.body || htmlEl);
      // Also strip wraps from inside shadow roots.
      try {
        const w = document.createTreeWalker(document.body || htmlEl, NodeFilter.SHOW_ELEMENT);
        let el;
        while ((el = w.nextNode())) {
          if (el.shadowRoot) removeEmojiWraps(el.shadowRoot);
        }
      } catch(e) {}
    }
  });
  toggleObs.observe(htmlEl, { attributes: true, attributeFilter: ['data-st-dark'] });
})();

/* ===== DISPATCH BOARD ROUTE WATCHER ========================================
   The dispatch board looks best with the original slightly-darker background.
   This IIFE watches for SPA navigation (pushState / replaceState / popstate)
   and stamps data-st-dispatch="on" on <html> while the URL path contains
   "/dispatch". The CSS override block earlier in this file uses that attribute
   to apply the darker pre-inversion value (#E0DEDD → visible #1F2122).
============================================================================ */
(function(){ if (window.__ST_DARK_SKIP__) return;
  if (window.__stDarkDispatchWatcher) return; window.__stDarkDispatchWatcher = true;

  var html = document.documentElement;

  function update() {
    if (/\/dispatch/i.test(location.pathname + location.hash)) {
      html.setAttribute('data-st-dispatch', 'on');
    } else {
      html.removeAttribute('data-st-dispatch');
    }
  }

  // Wrap history methods so SPA route changes are caught immediately.
  var _push = history.pushState.bind(history);
  var _replace = history.replaceState.bind(history);
  history.pushState = function() { _push.apply(history, arguments); update(); };
  history.replaceState = function() { _replace.apply(history, arguments); update(); };
  window.addEventListener('popstate', update);
  window.addEventListener('hashchange', update);

  // Run once on load.
  update();
})();

/* ===== PRINT-SAFE MODE =====================================================
   Automatically suspend dark mode for print/print-preview, then restore it.
   Uses three layers to ensure Chrome's print preview renders light-mode:
     1. Proactive keydown (capture phase) – fires before Chrome processes Ctrl/Cmd+P
     2. Proactive window.print() wrapper – catches in-page "Print" buttons
     3. Reactive beforeprint / matchMedia – fallback safety net
============================================================================ */
(function(){ if (window.__ST_DARK_SKIP__) return;
  try {
    var html = document.documentElement;
    function suspendDarkForPrint(){
      if (html && html.getAttribute('data-st-dark') === 'on') {
        html.setAttribute('data-st-dark-print-suspended','1');
        html.removeAttribute('data-st-dark');
      }
    }
    function restoreDarkAfterPrint(){
      if (html && html.hasAttribute('data-st-dark-print-suspended')) {
        html.setAttribute('data-st-dark','on');
        html.removeAttribute('data-st-dark-print-suspended');
      }
    }

    // Layer 1: Intercept Ctrl+P / Cmd+P in the capture phase (earliest possible
    // moment) so dark mode is off before Chrome begins rendering print preview.
    document.addEventListener('keydown', function(e){
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        suspendDarkForPrint();
        // Restoration is handled by the afterprint event below.
      }
    }, true /* useCapture – fires before any bubbling handlers */);

    // Layer 2: Wrap window.print() so in-page "Print" buttons also suspend dark
    // mode before Chrome captures the page state for its preview.
    // The forced reflow (offsetHeight read) is critical — it makes the browser
    // synchronously recalculate styles after removing the dark mode attribute,
    // so Chrome's print preview captures the light-mode state, not the dark one.
    try {
      var _origPrint = window.print.bind(window);
      window.print = function(){
        suspendDarkForPrint();
        // Force a synchronous style recalculation + layout so the browser
        // processes the dark-mode removal before the print dialog opens.
        try { void document.documentElement.offsetHeight; } catch(re){}
        _origPrint();
      };
    } catch(pe){/* no-op if print cannot be wrapped */}

    // Layer 3: Reactive fallbacks (beforeprint / matchMedia) as a safety net
    // for any print trigger not covered by the proactive layers above.
    window.addEventListener('beforeprint', suspendDarkForPrint);
    window.addEventListener('afterprint', restoreDarkAfterPrint);
    // MQL fallback/Chrome print preview
    if (window.matchMedia) {
      var mql = window.matchMedia('print');
      if (mql && mql.addEventListener) {
        mql.addEventListener('change', function(e){ e.matches ? suspendDarkForPrint() : restoreDarkAfterPrint(); });
      } else if (mql && mql.addListener) {
        mql.addListener(function(e){ e.matches ? suspendDarkForPrint() : restoreDarkAfterPrint(); });
      }
    }
  } catch(e){/* no-op */}
})();


/* ===== ST-DARK v0.8.0: Dispatch board divider restoration ==================
   Problem: ServiceTitan hard-codes 1px light-gray borders (the #DFE0E1
   family) as the separators between the board rows, the jobs tray, and the
   Activity Center. In dark mode those grays invert to ~#202021 - almost
   exactly the special darker dispatch background - so every divider
   disappears. The colors are hard-coded per element (no CSS variable to
   override) and the class names are build-hashed, so a computed-style scan
   is the only robust approach.

   Fix: while dark mode is on AND the dispatch route watcher has stamped
   data-st-dispatch="on", scan the dispatch-related shadow roots
   (servicetitan-dispatch-*) for solid borders whose computed color is a
   near-uniform light gray (all channels 210-245, spread <= 8) and override
   the border color inline to rgb(221,226,232), which the html filter renders
   as a subtle cool gray line that matches the v1.5 dispatch palette (it was
   rgb(197,197,198) before v1.5, which read too bright on the darker canvas).
   Turning dark mode off removes the inline overrides; the underlying
   stylesheets are never touched.

   v1.5 also tints status-colored job cards here (see "Status-colored job
   cards" below and the dispatch block in SHADOW_CSS).

   Skipped contexts: counter-inverted cards, top-layer popovers, and popover
   containers - borders there do not pass through the html filter the same
   way, so their original colors are already correct. */
(function dispatchDividerFix(){
  if (window.__ST_DARK_SKIP__) return;
  if (window.__stDarkDividerFix) return; window.__stDarkDividerFix = true;

  const docEl = document.documentElement;
  const active = () => docEl.getAttribute('data-st-dark') === 'on' &&
                       docEl.getAttribute('data-st-dispatch') === 'on';
  const ATTR = 'data-st-divider-fix';
  const FIX_COLOR = 'rgb(221,226,232)';   /* renders a subtle cool gray through the html filter */
  const SIDES = ['top','right','bottom','left'];
  const SKIP_SEL = '[data-anv="card"],[popover],[class*="popover-container"]';

  const isDividerGray = (c) => {
    const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/.exec(c || '');
    if (!m) return false;
    if (m[4] !== undefined && parseFloat(m[4]) < 0.15) return false;
    const r = +m[1], g = +m[2], b = +m[3];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    return mn >= 210 && mx <= 245 && (mx - mn) <= 8;
  };

  function fixEl(el) {
    try {
      if (el.closest && el.closest(SKIP_SEL)) return;
      const cs = getComputedStyle(el);
      let fixed = '';
      for (const s of SIDES) {
        if (cs.getPropertyValue('border-' + s + '-width') !== '0px' &&
            cs.getPropertyValue('border-' + s + '-style') === 'solid' &&
            isDividerGray(cs.getPropertyValue('border-' + s + '-color'))) {
          el.style.setProperty('border-' + s + '-color', FIX_COLOR, 'important');
          fixed += (fixed ? ' ' : '') + s;
        }
      }
      if (fixed) el.setAttribute(ATTR, fixed);
    } catch (e) {}
  }

  function scanRoot(root) {
    if (!active()) return;
    try {
      if (root.nodeType === 1) fixEl(root);
      const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
      let el;
      while ((el = w.nextNode())) fixEl(el);
    } catch (e) {}
  }

  function dispatchRoots() {
    const roots = [];
    try {
      document.querySelectorAll('*').forEach(e => {
        if (/^servicetitan-dispatch/i.test(e.tagName) && e.shadowRoot) roots.push(e.shadowRoot);
      });
    } catch (e) {}
    return roots;
  }

  /* ---- Status-colored job cards (v1.5) ------------------------------------
     Job cards are counter-inverted, so a status color (Dispatched lilac,
     Working green, ...) showed as a bright pastel block on the dark board.
     Give each one a dark wash of its own hue instead: hsl(hue, <=45%, 17%)
     in --st-card-bg plus a data-st-tinted flag that the SHADOW_CSS dispatch
     block uses. Default gray cards (rgb(240,240,240)) are styled by CSS alone.
     Cards change color in place when their status changes, so this also
     watches style attributes. */
  const TINT_ATTR = 'data-st-tinted';
  const TINT_VAR = '--st-card-bg';
  const JOB_CARD_SEL = '[data-anv="card"]:is([class*="job-card-"], [class*="base-card__"])';

  function cardWash(bg) {
    const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(bg || '');
    if (!m) return null;
    const r = +m[1] / 255, g = +m[2] / 255, b = +m[3] / 255;
    if (m[1] === '240' && m[2] === '240' && m[3] === '240') return null;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    let h = 0, s = 0;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    return 'hsl(' + Math.round(h) + ', ' + Math.round(Math.min(s * 100, 45)) + '%, 17%)';
  }

  function tintCard(c) {
    try {
      const wash = cardWash(c.style.backgroundColor);
      if (!wash) {
        if (c.hasAttribute(TINT_ATTR)) { c.removeAttribute(TINT_ATTR); c.style.removeProperty(TINT_VAR); }
        return;
      }
      if (c.style.getPropertyValue(TINT_VAR) !== wash) c.style.setProperty(TINT_VAR, wash);
      if (!c.hasAttribute(TINT_ATTR)) c.setAttribute(TINT_ATTR, '');
    } catch (e) {}
  }

  function tintRoot(root) {
    if (!active()) return;
    try { root.querySelectorAll(JOB_CARD_SEL).forEach(tintCard); } catch (e) {}
  }

  /* Tint cards inside the observer callback itself. MutationObserver
     callbacks run as a microtask right after the DOM change and before the
     browser paints, so a card the board re-mounts while scrolling is tinted
     before it's ever drawn. (An earlier 100ms throttle left re-mounted
     cards in their bright original color for ~100ms, which flashed while
     scrolling.) Only added subtrees and style changes on job cards are
     touched, so this stays cheap. Our own --st-card-bg write re-enters once
     and stops because the value is unchanged. */
  const tintObs = new MutationObserver(muts => {
    if (!active()) return;
    for (const m of muts) {
      if (m.type === 'attributes') {
        if (m.target.matches?.(JOB_CARD_SEL)) tintCard(m.target);
      } else {
        m.addedNodes.forEach(n => {
          if (n.nodeType !== 1) return;
          if (n.matches(JOB_CARD_SEL)) tintCard(n);
          n.querySelectorAll?.(JOB_CARD_SEL).forEach(tintCard);
        });
      }
    }
  });

  function watchRoot(sr) {
    if (observedRoots.has(sr)) return;
    observedRoots.add(sr);
    try { rootObs.observe(sr, { childList: true, subtree: true }); } catch (e) {}
    try { tintObs.observe(sr, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] }); } catch (e) {}
    scanRoot(sr);
    tintRoot(sr);
  }

  function clearAll() {
    dispatchRoots().forEach(sr => {
      try {
        sr.querySelectorAll('[' + ATTR + ']').forEach(el => {
          (el.getAttribute(ATTR) || '').split(' ').forEach(s => {
            if (s) el.style.removeProperty('border-' + s + '-color');
          });
          el.removeAttribute(ATTR);
        });
        sr.querySelectorAll('[' + TINT_ATTR + ']').forEach(c => {
          c.removeAttribute(TINT_ATTR);
          c.style.removeProperty(TINT_VAR);
        });
      } catch (e) {}
    });
  }

  /* Debounced observer: fixes borders on nodes added to observed roots. */
  const observedRoots = new WeakSet();
  let pending = new Set();
  let timer = null;
  const rootObs = new MutationObserver(muts => {
    if (!active()) return;
    for (const m of muts) {
      m.addedNodes.forEach(n => { if (n.nodeType === 1) pending.add(n); });
    }
    if (pending.size) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const batch = pending; pending = new Set();
        batch.forEach(n => scanRoot(n));
      }, 150);
    }
  });

  function activate() {
    dispatchRoots().forEach(sr => {
      if (observedRoots.has(sr)) { scanRoot(sr); tintRoot(sr); }
      else watchRoot(sr);
    });
  }

  /* React to dark-mode toggles and dispatch route changes. */
  new MutationObserver(() => {
    if (active()) activate(); else clearAll();
  }).observe(docEl, { attributes: true, attributeFilter: ['data-st-dark', 'data-st-dispatch'] });

  /* Catch dispatch shadow hosts created after load (SPA navigation).
     Debounced; only queries for new hosts while the fix is active. */
  let hostTimer = null;
  new MutationObserver(() => {
    if (!active()) return;
    clearTimeout(hostTimer);
    hostTimer = setTimeout(() => {
      dispatchRoots().forEach(watchRoot);
    }, 300);
  }).observe(docEl, { childList: true, subtree: true });

  /* Handle the case where both attributes were already set before this
     script block ran. */
  if (active()) activate();
})();
/* ===== end v0.8.0 divider restoration ====================================== */
