chrome.tabs.query({ active: true, currentWindow: true }, function (tab) {
  (async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.runtime.sendMessage({
      type: "generateBibtex",
      tab: tab,
    });
    // setTimeout(() => {
    //   window.close();
    // }, 1000);
  })();
});
