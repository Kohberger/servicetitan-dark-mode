// content.js — overlay UI, storage, messaging, drag, first run promo
(function () {
  const isST = /servicetitan/i.test(location.hostname);
  if (!isST) return;

  const HOST_KEY = `st_dark_enabled::${location.host}`;
  const POS_KEY    = `st_dark_pos::${location.host}`;    // {x, y} pixel coords
  const CORNER_KEY = `st_dark_corner::${location.host}`; // legacy — migration only
  const PROMO_KEY = "st_dark_promo_dismissed"; // boolean
  const margin = 14;

  const post = (payload) => window.postMessage(Object.assign({ __st: true }, payload), "*");

  function addOverlay () {
    const host = document.createElement('div');
    host.style.position = 'fixed';
    host.style.zIndex = '2147483647';
    host.style.width = '44px';
    host.style.height = '44px';
    host.style.pointerEvents = 'none';
    host.style.filter = 'invert(1) hue-rotate(180deg)';
    const root = host.attachShadow({ mode: 'closed' });
    root.innerHTML = `
      <style>
        :host { all: initial; }
        .wrap { pointer-events: auto; display: grid; place-items: center; width: 44px; height: 44px;
                border-radius: 999px; box-shadow: 0 4px 12px rgba(0,0,0,.35);
                background: rgba(28,28,28,.85); backdrop-filter: blur(8px);
                border: 1px solid rgba(255,255,255,.08); cursor: pointer; user-select: none; touch-action: none; }
        .wrap:hover { transform: translateY(-1px); }
        .icon { width: 22px; height: 22px; display: block; }
        .hidden { display: none; }
        .tip { position: absolute; right: 54px; bottom: 8px; background: rgba(28,28,28,.9); color: #fff;
               font: 12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding: 6px 8px;
               border-radius: 6px; border: 1px solid rgba(255,255,255,.08); white-space: nowrap;
               opacity: 0; transform: translateX(6px); transition: opacity .15s ease, transform .15s ease; pointer-events: none; }
        .wrap:hover + .tip { opacity: 1; transform: translateX(0); }
      </style>
      <div class="wrap" id="btn" title="Toggle dark (Alt+D)">
        <svg id="sun" class="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6.76 4.84l-1.8-1.79L3.17 4.84l1.79 1.79 1.8-1.79zM1 13h3v-2H1v2zm10-9h2V1h-2v3zm7.07 1.05l1.79-1.79-1.79-1.79-1.79 1.79 1.79 1.79zM20 13h3v-2h-3v2zm-8 8h2v-3h-2v3zm-7.07-2.05l1.79 1.79 1.8-1.8-1.79-1.79-1.8 1.8zM17.24 19.16l1.79 1.79 1.8-1.8-1.79-1.79-1.8 1.8zM12 6a6 6 0 100 12A6 6 0 0012 6z" fill="white"/>
        </svg>
        <svg id="moon" class="icon hidden" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.354 15.354A9 9 0 018.646 3.646 7 7 0 1019 16a6.96 6.96 0 001.354-.646z" fill="white"/>
        </svg>
      </div>
      <div class="tip">ServiceTitan Dark</div>
    `;
    document.documentElement.appendChild(host);

    const $ = (sel) => root.querySelector(sel);
    const btn = $('#btn'); const sun = $('#sun'); const moon = $('#moon');

    const setIcon = (isEnabled) => {
      sun.classList.toggle('hidden', !!isEnabled);
      moon.classList.toggle('hidden', !isEnabled);
    };

    const SIZE = 44; // toggle dimensions (px) — matches host width/height
    function applyPos(x, y) {
      const maxX = window.innerWidth  - SIZE - margin;
      const maxY = window.innerHeight - SIZE - margin;
      x = Math.max(margin, Math.min(x, maxX));
      y = Math.max(margin, Math.min(y, maxY));
      host.style.left = x + "px"; host.style.top = y + "px";
      host.style.right = "auto"; host.style.bottom = "auto";
    }
    function cornerToPos(c) {
      const w = window.innerWidth, h = window.innerHeight;
      if (c === "lb") return { x: margin,         y: h - SIZE - margin };
      if (c === "rt") return { x: w - SIZE - margin, y: margin           };
      if (c === "lt") return { x: margin,           y: margin            };
      return               { x: w - SIZE - margin, y: h - SIZE - margin }; // rb
    }

    try {
      chrome.storage.sync.get([POS_KEY, CORNER_KEY], (res) => {
        if (res[POS_KEY] && typeof res[POS_KEY].x === "number") {
          applyPos(res[POS_KEY].x, res[POS_KEY].y);        // saved free position
        } else if (res[CORNER_KEY]) {
          const p = cornerToPos(res[CORNER_KEY]);            // migrate old corner
          applyPos(p.x, p.y);
        } else {
          const p = cornerToPos("rb");                       // default: bottom-right
          applyPos(p.x, p.y);
        }
      });
    } catch { applyPos(cornerToPos("rb").x, cornerToPos("rb").y); }

    let dragging = false, moved = false;
    let startX = 0, startY = 0, startLeft = 0, startTop = 0;
    const THRESH = 5;

    const cleanup = (aborters=[]) => {
      aborters.forEach(a => { try { a.abort(); } catch{} });
      btn.style.cursor = "pointer";
      dragging = false; moved = false;
    };

    const toggle = () => post({ type: "ST_DARK_TOGGLE" });

    btn.addEventListener("pointerdown", (ev) => {
      if (ev.button !== 0 && ev.pointerType === "mouse") return;
      ev.preventDefault();
      dragging = false; moved = false;
      startX = ev.clientX; startY = ev.clientY;
      const rect = host.getBoundingClientRect();
      startLeft = rect.left; startTop = rect.top;
      btn.style.cursor = "grabbing";
      try { btn.setPointerCapture(ev.pointerId); } catch {}

      const acMove = new AbortController();
      const acUp = new AbortController();
      const acCancel = new AbortController();
      const acLost = new AbortController();
      const acBlur = new AbortController();

      const onMove = (e) => {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (!dragging && (Math.abs(dx) > THRESH || Math.abs(dy) > THRESH)) dragging = true;
        if (dragging) {
          moved = true;
          let nx = startLeft + dx;
          let ny = startTop + dy;
          const maxX = window.innerWidth - host.offsetWidth - margin;
          const maxY = window.innerHeight - host.offsetHeight - margin;
          nx = Math.max(margin, Math.min(nx, maxX));
          ny = Math.max(margin, Math.min(ny, maxY));
          host.style.left = nx + "px";
          host.style.top = ny + "px";
          host.style.right = "auto";
          host.style.bottom = "auto";
        }
      };
      const finish = (e) => {
        try { btn.releasePointerCapture(ev.pointerId); } catch {}
        if (dragging) {
          const rect2 = host.getBoundingClientRect();
          try { chrome.storage.sync.set({ [POS_KEY]: { x: rect2.left, y: rect2.top } }); } catch {}
        }
        if (!moved) { toggle(); }
        cleanup([acMove, acUp, acCancel, acLost, acBlur]);
      };

      const onClickOnce = (e) => { if (moved) { e.preventDefault(); e.stopImmediatePropagation(); } };
      btn.addEventListener("click", onClickOnce, { once: true, capture: true });

      window.addEventListener("pointermove", onMove, { signal: acMove.signal });
      window.addEventListener("pointerup", finish, { signal: acUp.signal });
      window.addEventListener("pointercancel", finish, { signal: acCancel.signal });
      btn.addEventListener("lostpointercapture", finish, { signal: acLost.signal });
      window.addEventListener("blur", finish, { signal: acBlur.signal });
    }, { passive: false });

    window.addEventListener('message', (e) => {
      const msg = e?.data; if (!msg || msg.__st !== true) return;
      if (msg.type === 'ST_DARK_STATE') {
        setIcon(!!msg.enabled);
        try { chrome.storage.sync.set({ [HOST_KEY]: !!msg.enabled }); } catch {}
      }
    }, { passive: true });

    return { setIcon, host };
  }

  function maybeShowPromoModal() {
    const PROMO_KEY = "st_dark_promo_dismissed";
    chrome.storage.local.get(PROMO_KEY, (res) => {
      if (res && res[PROMO_KEY]) return;
      const overlay = document.createElement("div");
      overlay.id = "st-dark-promo-overlay";
      overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:2147483646`;

      const card = document.createElement("div");
      card.style.cssText = `max-width:520px;width:92%;background:#1b1b1b;color:#fff;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.45);padding:20px;border:1px solid rgba(255,255,255,.08);font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif`;

      const img = document.createElement("img");
      img.alt = "Blue Collar Nerd – Ultimate ServiceTitan Guide";
      img.src = chrome.runtime.getURL("assets/guide.jpg");
      img.style.cssText = "display:block;width:100%;height:auto;border-radius:8px;margin-bottom:14px;";

      const h = document.createElement("div");
      h.style.cssText = "font-size:18px;font-weight:600;margin-bottom:6px";
      h.textContent = "Master ServiceTitan Faster";

      const p = document.createElement("div");
      p.style.cssText = "opacity:.92;margin-bottom:12px";
      p.innerHTML = `Blue Collar Nerd’s <em>Ultimate ServiceTitan Guide</em> is a searchable library of step‑by‑step videos to train your team and solve real problems in minutes. Learn the right settings, proven workflows, and time‑saving tips the pros use. Visit <a href="https://BlueCollarNerd.com" target="_blank" rel="noopener" style="color:#99caff">BlueCollarNerd.com</a> and use code <strong>DARKMODE</strong> for <strong>30% off your first pay period</strong>.`;

      const learnMore = document.createElement("a");
      learnMore.href = "https://BlueCollarNerd.com";
      learnMore.target = "_blank";
      learnMore.rel = "noopener";
      learnMore.textContent = "Learn More →";
      learnMore.style.cssText = "display:block;width:100%;text-align:center;padding:10px 0;margin-bottom:14px;border-radius:8px;background:#f47b20;color:#fff;font-weight:700;font-size:15px;text-decoration:none;letter-spacing:.02em";

      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:6px";

      const label = document.createElement("label");
      label.style.cssText = "display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.style.cssText = "width:16px;height:16px";
      const span = document.createElement("span");
      span.textContent = "Don’t show this again";
      label.appendChild(cb); label.appendChild(span);

      const btn = document.createElement("button");
      btn.textContent = "Dismiss";
      btn.style.cssText = "padding:8px 14px;border:0;border-radius:8px;background:#2f8cff;color:#fff;cursor:pointer";
      btn.addEventListener("click", () => {
        if (cb.checked) chrome.storage.local.set({ [PROMO_KEY]: true });
        overlay.remove();
      });
      overlay.addEventListener("click", (e) => { if (e.target === overlay) btn.click(); });

      row.appendChild(label); row.appendChild(btn);
      card.appendChild(img); card.appendChild(h); card.appendChild(p); card.appendChild(learnMore); card.appendChild(row);
      overlay.appendChild(card);
      document.documentElement.appendChild(overlay);
    });
  }

  let overlay;
  chrome.storage.sync.get(HOST_KEY, (res) => {
    const isEnabled = res[HOST_KEY] !== false;
    overlay = addOverlay();
    const post = (payload) => window.postMessage(Object.assign({ __st: true }, payload), "*");
    post({ type: "ST_DARK_SET", enabled: isEnabled });
    overlay.setIcon(isEnabled);
    maybeShowPromoModal(); // first time opening ServiceTitan after install
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "ST_DARK_TOGGLE_REQUEST") {
      const post = (payload) => window.postMessage(Object.assign({ __st: true }, payload), "*");
      post({ type: "ST_DARK_TOGGLE" });
    }
  });

  window.addEventListener('message', (e) => {
    const msg = e?.data; if (!msg || msg.__st !== true) return;
    if (msg.type === "ST_DARK_HELLO") {
      chrome.storage.sync.get(HOST_KEY, (res) => {
        const isEnabled = res[HOST_KEY] !== false;
        const post = (payload) => window.postMessage(Object.assign({ __st: true }, payload), "*");
        post({ type: "ST_DARK_SET", enabled: isEnabled });
        overlay?.setIcon(isEnabled);
      });
    }
  }, { passive: true });
})();
