# Contributing

Thanks for helping make ServiceTitan nicer to use. Other people run this extension on ServiceTitan pages full of customer data, so the rules below keep it stable and safe.

## How to contribute

1. **Fork** this repo, or ask Richard for collaborator access.
2. **Create a branch** for your change, for example `git checkout -b invoice-modernize`.
3. **Load your copy in Chrome.** Go to `chrome://extensions`, turn on Developer mode, click **Load unpacked** and pick the repo folder. Reload the extension after each change.
4. **Open a pull request** against `main` and fill out the checklist in the template.
5. **Richard reviews, tests and merges.** He handles version numbers and Chrome Web Store releases, so please don't change `version` in `manifest.json`.

Small fixes (a dark mode color that's wrong, a broken selector) can go straight to a pull request. For a new feature, open an issue first describing what it does so you don't build something that can't be merged.

## How the extension is built

- **`engine.js`** runs in the page itself (Chrome's "MAIN world"). It owns dark mode: it sets `html[data-st-dark="on"]` and injects the CSS fixes for each part of ServiceTitan. It stops early on print pages and non-app hosts through `window.__ST_DARK_SKIP__`.
- **`content.js`** runs in the extension's isolated world. It draws the floating toggle, saves settings in `chrome.storage.sync` and talks to `engine.js` with `window.postMessage({ __st: true, type: ... })`.
- **`background.js`** handles the Alt+D hotkey.

## Rules for new features

1. **Its own files.** Put each new feature in its own folder under `features/` (for example `features/invoice-modernize/`) and register it as its own entry in `manifest.json`. Don't add features to `engine.js`. If you need to change it, explain why in the pull request.
2. **Its own on/off switch.** Save the setting in `chrome.storage.sync` under a key that starts with `st_feature_`, for example `st_feature_invoice_modernize`. When the feature is on, set an attribute on `<html>`, for example `data-st-invoice-modern="on"`, and put all of your CSS under it. Turning the feature off must leave the page exactly as ServiceTitan ships it. There's no settings panel yet. If your feature needs one, say so in your issue so we can agree on how it should look.
3. **Works in both themes.** Test with dark mode on and off. On most pages dark mode inverts the whole page with a CSS filter, so any colors you add get inverted too.
4. **Fails quietly.** ServiceTitan changes its pages often. If the elements your feature looks for aren't there, do nothing. Never throw errors or break the page. Where you can, target stable hooks like `data-*` attributes and ARIA roles, not generated class names like `_chip_a1b2c`.
5. **Leaves print pages alone.** Respect `window.__ST_DARK_SKIP__`. Printed invoices and estimates must come out untouched.
6. **Handles iframes and modals.** The extension runs in every frame, so check that your feature behaves in popups and embedded frames too.

## Security rules

The extension runs inside every ServiceTitan page, where it can see customer, job and invoice data. A pull request won't be merged if it does any of these:

- makes network requests (`fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, tracking pixels) or loads scripts, styles or fonts from outside the extension
- uses `eval` or `new Function`, or inserts HTML built from page data without escaping it
- reads, stores or sends customer, job or invoice data beyond what it needs to restyle the page on screen
- adds permissions or host permissions to `manifest.json`. Every new permission makes existing users approve the extension again, so open an issue first if you truly need one.
- adds analytics, tracking or third-party libraries

Submit readable source only. Minified or bundled code can't be reviewed.

## Contribution terms

By opening a pull request, you confirm that you wrote the code or have the right to submit it. You also agree that Blue Collar Nerd LLC may use, modify and distribute your contribution as part of this extension, including versions published on the Chrome Web Store. Contributors are credited in the release notes.
