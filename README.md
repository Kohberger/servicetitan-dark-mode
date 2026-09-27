# ServiceTitan Dark Mode by BCN

Dark mode for ServiceTitan, with a draggable on/off toggle. Made by [Blue Collar Nerd](https://BlueCollarNerd.com).

It's a Chrome extension (Manifest V3) that runs only on `*.servicetitan.com`.

## Using it

- Click the floating toggle button on any ServiceTitan page to turn dark mode on or off. Drag it wherever you like.
- Or press **Alt+D**.
- Right-click the toggle for extra options. Right now there's one: **Beautify** (off by default), a cleaner layout for invoice pages, the invoice batching screen (Accounting > Invoicing) and the History section on job pages. The first time someone opens ServiceTitan after updating, a one-time notice by the toggle offers to turn it on.
- Dark mode is saved per ServiceTitan host. Beautify is a global setting, off by default.

## Running it from this repo

1. Clone or download this repo.
2. In Chrome, go to `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the repo folder.
4. After you change a file, click the reload icon on the extension's card and refresh your ServiceTitan tab.

## What's in here

| File | What it does |
| --- | --- |
| `manifest.json` | Extension settings: permissions, which scripts run where, version number. |
| `engine.js` | Runs inside the ServiceTitan page. Owns dark mode itself and all the page-specific fixes. |
| `content.js` | Runs in the extension's own sandbox. Draws the toggle button, saves settings and shows the first-run promo. |
| `toggle-core.js` | Positioning and tap-vs-drag logic for the toggle button, kept free of browser APIs so it can be tested. |
| `background.js` | Handles the Alt+D hotkey. |
| `features/beautify/` | Flag-controlled invoice layout, actions, invoice batching screen, and job History activity digest. Restores native UI when switched off. |
| `assets/`, `icons/` | Images. |
| `tests/`, `package.json` | Development only: unit tests. Run `npm test` (Node 22+, no install needed). |

## Contributing

Pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first. It covers how new features should be structured and the security rules every change has to follow.

---

Copyright © Blue Collar Nerd LLC. This code is public to read, but no open-source license has been granted.

## Beautify development

The isolated-world runtime in `features/beautify/runtime.js` mounts the invoice, invoice-email, invoice-batching and job-history enhancements only while the flag is on. It restores native nodes and attributes on disable, route/root changes, and before printing. All feature CSS is scoped to `html[data-st-beautify="on"]` and screen media. No changes to the dark-mode engine or permissions are required.

Invoice email uses `invoice-email.js` and `invoice-email.css` to restyle the existing form without moving its bound controls. Its recipient combobox lists existing customer/location checkbox addresses, filters as you type, and offers valid new addresses as options. Enter or an option click commits recipients as removable pills in a fixed-height area; the dropdown overlays the form. A narrowly scoped MAIN-world bridge (`email-recipients.js`) updates the native `SelectedEmails` observable; it never invokes Send or a network/contact-saving API. Added addresses get native-bound checkbox choices outside the original foreach range, which remain usable if Beautify is disabled. The picker omits helper copy, routine success messages, and customer/location-saving controls. An existing native address draft remains visible; the picker never clears that draft or its contact association. Send is blocked while picker text is unconfirmed or no recipient is specified. If the binding contract is unavailable, native controls are revealed as a fallback.

`tests/beautify/invoice-email.html` provides email layout and recipient regressions. Its small binding-contract fixture intercepts submission locally; no email can be sent. Run **Run email checks**, and also verify recipient addition/removal on the live page without clicking Send. Actual delivery requires a separately authorized test.

Run `npm run check` and `npm test`. For synthetic browser checks, serve this repository with `python3 -m http.server 8767 --bind 127.0.0.1`, open `tests/beautify/invoice-readability.html` and `tests/beautify/job-audit.html`, and click **Run checks** and **Check theme matrix**. The matrix simulates the engine's page inversion; it is not live extension-injection verification. Check the real signed-in page in all four dark-mode/Beautify combinations after reloading the extension. Never submit notes, payments, or invoice edits merely to test presentation.

These UI changes were ported from the local ServiceTitan Enhancement Suite. Tailwind Plus provided visual inspiration only; no licensed component source or third-party runtime was copied.
