// @ts-check
/// <reference path="./types.js" />
/// <reference path="./chrome.d.ts" />

/** @type {BibtexCoreAPI} */
const offscreenCore = BibtexCore;

chrome.runtime.onMessage.addListener(handleMessages);

/**
 * @param {ClipboardMessage | LegacyOptionsRequest | CloseOffscreenRequest} message
 * @param {chrome.runtime.MessageSender} _sender
 * @param {(response?: LegacyOptionsResponse) => void} sendResponse
 * @returns {boolean | void}
 */
function handleMessages(message, _sender, sendResponse) {
  if (message.target !== "offscreen-doc") return;

  switch (message.type) {
    case "copy-data-to-clipboard":
      void handleClipboardWrite(message.data);
      break;
    case "get-legacy-options":
      sendResponse({ legacyOptions: getLegacyOptions() });
      return true;
    case "close-offscreen":
      window.close();
      break;
    default:
      console.warn("Unexpected offscreen message received.");
  }
}

/** @type {HTMLTextAreaElement} */
const textEl = /** @type {HTMLTextAreaElement} */ (document.querySelector("#text"));

/**
 * @param {string} data
 * @returns {Promise<void>}
 */
async function handleClipboardWrite(data) {
  try {
    if (typeof data !== "string") {
      throw new TypeError(
        `Value provided must be a 'string', got '${typeof data}'.`,
      );
    }

    textEl.value = data;
    textEl.select();
    document.execCommand("copy");
  } finally {
    window.close();
  }
}

/**
 * Read pre-MV3 extension settings from extension localStorage.
 * @returns {Options | null}
 */
function getLegacyOptions() {
  return offscreenCore.parseLegacyOptions(localStorage);
}
