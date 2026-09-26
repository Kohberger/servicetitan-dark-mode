// background.js (MV3 service worker)
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-dark") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "ST_DARK_TOGGLE_REQUEST" });
});
