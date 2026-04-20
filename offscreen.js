// @ts-check
/// <reference path="./types.js" />
/// <reference path="./chrome.d.ts" />

chrome.runtime.onMessage.addListener(handleMessages);

/**
 * @param {ClipboardMessage & { target: string }} message
 * @returns {Promise<void>}
 */
async function handleMessages(message) {
  if (message.target !== "offscreen-doc") return;

  switch (message.type) {
    case "copy-data-to-clipboard":
      handleClipboardWrite(message.data);
      break;
    default:
      console.warn(`Unexpected message type received: '${message.type}'.`);
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
