document.addEventListener("DOMContentLoaded", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.runtime.sendMessage({
    type: "generateBibtex",
    tab: tab,
  });
  setTimeout(() => {
    window.close();
  }, 1000);
});
