# ServiceTitan Dark Mode by BCN

Dark mode for ServiceTitan, with a draggable on/off toggle. Made by [Blue Collar Nerd](https://BlueCollarNerd.com).

It's a Chrome extension (Manifest V3) that runs only on `*.servicetitan.com`.

## Using it

- Click the floating toggle button on any ServiceTitan page to turn dark mode on or off. Drag it wherever you like.
- Or press **Alt+D**.
- Right-click the toggle for extra options. Right now there's one: **De-uglify** (off by default).
- The setting is saved per ServiceTitan host.

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
| `features/deuglify/` | The De-uglify switch. Sets `<html data-st-deuglify="on">` when it's on. |
| `assets/`, `icons/` | Images. |
| `tests/`, `package.json` | Development only: unit tests. Run `npm test` (Node 22+, no install needed). |

## Contributing

Pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first. It covers how new features should be structured and the security rules every change has to follow.

---

Copyright © Blue Collar Nerd LLC. This code is public to read, but no open-source license has been granted.
