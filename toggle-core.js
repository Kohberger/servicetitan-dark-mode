// toggle-core.js — ISOLATED world, loaded before content.js. Pure helpers for
// the floating toggle: edge-anchored positioning and tap-vs-drag gestures.
// No DOM or chrome.* access here, so it can be unit tested in Node (tests/).
(function (root) {
  const MARGIN = 14;       // default gap between the toggle and the viewport edges (px)
  const VERSION = 2;       // stored position format; v1 was absolute {x, y}
  const HORIZONTAL = ["left", "right"];
  const VERTICAL = ["top", "bottom"];
  const CORNERS = {        // legacy "corner" preference (pre-drag versions)
    rb: ["right", "bottom"],
    lb: ["left", "bottom"],
    rt: ["right", "top"],
    lt: ["left", "top"],
  };

  const isNum = (n) => typeof n === "number" && Number.isFinite(n);
  const extent = (n) => (isNum(n) && n > 0 ? n : 0);

  function defaultPosition() {
    return { version: VERSION, horizontal: "right", vertical: "bottom", offsetX: MARGIN, offsetY: MARGIN };
  }

  // A clean copy of a valid v2 position, or null for anything else.
  function normalizePosition(raw) {
    if (!raw || typeof raw !== "object" || raw.version !== VERSION) return null;
    if (!HORIZONTAL.includes(raw.horizontal) || !VERTICAL.includes(raw.vertical)) return null;
    if (!isNum(raw.offsetX) || !isNum(raw.offsetY) || raw.offsetX < 0 || raw.offsetY < 0) return null;
    return {
      version: VERSION,
      horizontal: raw.horizontal,
      vertical: raw.vertical,
      offsetX: raw.offsetX,
      offsetY: raw.offsetY,
    };
  }

  // Describes a toggle whose top-left corner is at (left, top) by its offsets
  // from the nearest horizontal and vertical viewport edges.
  function positionFromRect(left, top, size, viewport) {
    const w = extent(viewport?.width), h = extent(viewport?.height);
    left = isNum(left) ? left : 0;
    top = isNum(top) ? top : 0;
    const right = w - left - size;
    const bottom = h - top - size;
    const horizontal = left <= right ? "left" : "right";
    const vertical = top <= bottom ? "top" : "bottom";
    return {
      version: VERSION,
      horizontal,
      vertical,
      offsetX: Math.max(0, Math.round(horizontal === "left" ? left : right)),
      offsetY: Math.max(0, Math.round(vertical === "top" ? top : bottom)),
    };
  }

  // Keeps [value, value + size] inside [margin, length - margin]. When the
  // viewport is too small for the margins, centers the toggle, and pins it to
  // the leading edge if it doesn't fit at all.
  function clampAxis(value, size, length, margin = MARGIN) {
    length = extent(length);
    const lo = margin;
    const hi = length - size - margin;
    if (hi < lo) return Math.max(0, Math.floor((length - size) / 2));
    return Math.min(Math.max(isNum(value) ? value : hi, lo), hi);
  }

  // Pixel {left, top} for a stored position in the given viewport. The stored
  // offsets are never modified, so growing the window restores the placement.
  function positionToPixels(pos, size, viewport, margin = MARGIN) {
    const p = normalizePosition(pos) || defaultPosition();
    const w = extent(viewport?.width), h = extent(viewport?.height);
    const left = p.horizontal === "left" ? p.offsetX : w - size - p.offsetX;
    const top = p.vertical === "top" ? p.offsetY : h - size - p.offsetY;
    return { left: clampAxis(left, size, w, margin), top: clampAxis(top, size, h, margin) };
  }

  // Turns whatever is in storage into a v2 position. `migrated` is true when
  // the result came from a legacy format and should be written back once.
  // Legacy {x, y} coordinates are interpreted against the current viewport.
  function resolveStoredPosition(stored, legacyCorner, size, viewport) {
    const v2 = normalizePosition(stored);
    if (v2) return { position: v2, migrated: false };
    if (stored && typeof stored === "object" && stored.version === undefined && isNum(stored.x) && isNum(stored.y)) {
      return { position: positionFromRect(stored.x, stored.y, size, viewport), migrated: true };
    }
    const corner = typeof legacyCorner === "string" && Object.hasOwn(CORNERS, legacyCorner) ? CORNERS[legacyCorner] : null;
    if (corner) {
      return {
        position: { version: VERSION, horizontal: corner[0], vertical: corner[1], offsetX: MARGIN, offsetY: MARGIN },
        migrated: true,
      };
    }
    return { position: defaultPosition(), migrated: false };
  }

  // Tap-vs-drag state machine for a single pointer gesture. At most one of
  // onTap / onDragEnd fires, and only once: end() taps if the pointer never
  // moved past the threshold; cancel() (pointercancel, lost capture, blur)
  // never taps, but still commits a drag that was in progress.
  function createGesture({ x, y, threshold = 5, onDragMove, onDragEnd, onTap } = {}) {
    let dragging = false;
    let done = false;
    const beyond = (nx, ny) => Math.abs(nx - x) > threshold || Math.abs(ny - y) > threshold;
    const moveTo = (nx, ny) => {
      if (!isNum(nx) || !isNum(ny)) return;
      if (!dragging && beyond(nx, ny)) dragging = true;
      if (dragging) onDragMove?.(nx - x, ny - y);
    };
    return {
      move(nx, ny) { if (!done) moveTo(nx, ny); },
      end(nx, ny) {
        if (done) return;
        moveTo(nx, ny);   // a fast flick can skip pointermove entirely
        done = true;
        if (dragging) onDragEnd?.(); else onTap?.();
      },
      cancel() {
        if (done) return;
        done = true;
        if (dragging) onDragEnd?.();
      },
      get dragging() { return dragging; },
      get done() { return done; },
    };
  }

  const api = {
    MARGIN,
    VERSION,
    defaultPosition,
    normalizePosition,
    positionFromRect,
    clampAxis,
    positionToPixels,
    resolveStoredPosition,
    createGesture,
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.STToggleCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
