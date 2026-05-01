// @ts-check
/// <reference path="./types.js" />
/// <reference path="./chrome.d.ts" />

importScripts("core.js");

/** @type {BibtexCoreAPI} */
const backgroundCore = BibtexCore;
const defaultOptions = backgroundCore.defaultOptions;

/** @type {DateFormatCode} */
let dateFormat = defaultOptions.dateFormat;
/** @type {boolean} */
let optOmitEmpty = defaultOptions.omitEmptyFields;
/** @type {boolean} */
let optIncludeAccessed = defaultOptions.includeAccessDate;
/** @type {FormattingStyle} */
let optFormattingStyle = defaultOptions.formattingStyle;
/** @type {boolean} */
let optNoInferAuthor = defaultOptions.noInferAuthor;
/** @type {boolean} */
let optNoInferDate = defaultOptions.noInferDate;

/** @type {number | null} */
let lastInjectedTabId = null;
/** @type {string | null} */
let lastRequestId = null;

/** @type {Promise<void> | null} */
let offscreenCreating = null;

const optionsReady = initializeOptions();

/**
 * @param {Options} options
 * @returns {void}
 */
function applyOptions(options) {
  optOmitEmpty = options.omitEmptyFields;
  optIncludeAccessed = options.includeAccessDate;
  optNoInferAuthor = options.noInferAuthor;
  optNoInferDate = options.noInferDate;
  dateFormat = options.dateFormat;
  optFormattingStyle = options.formattingStyle;
}

/**
 * @param {string} reason
 * @returns {Promise<void>}
 */
async function ensureOffscreenDocument(reason) {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
  });
  if (contexts.length > 0) return;

  if (offscreenCreating) {
    await offscreenCreating;
    return;
  }

  offscreenCreating = chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: [reason],
    justification:
      reason === chrome.offscreen.Reason.LOCAL_STORAGE
        ? "Read legacy extension settings during migration."
        : "Write text to the clipboard.",
  });

  try {
    await offscreenCreating;
  } finally {
    offscreenCreating = null;
  }
}

/**
 * @returns {Promise<Options | null>}
 */
async function migrateLegacyOptions() {
  await ensureOffscreenDocument(chrome.offscreen.Reason.LOCAL_STORAGE);

  return await new Promise((resolve) => {
    chrome.runtime.sendMessage(
      /** @type {LegacyOptionsRequest} */ ({
        type: "get-legacy-options",
        target: "offscreen-doc",
      }),
      /** @param {LegacyOptionsResponse | undefined} response */
      (response) => {
        resolve(response?.legacyOptions || null);
      },
    );
  });
}

/**
 * @returns {Promise<void>}
 */
async function initializeOptions() {
  const data = await chrome.storage.sync.get("options");
  if (data.options) {
    applyOptions(backgroundCore.normalizeOptions(data.options));
    return;
  }

  const migrated = await migrateLegacyOptions();
  const options = backgroundCore.normalizeOptions(migrated || defaultOptions);
  await chrome.storage.sync.set({ options });
  applyOptions(options);

  chrome.runtime.sendMessage(
    /** @type {CloseOffscreenRequest} */ ({
      type: "close-offscreen",
      target: "offscreen-doc",
    }),
  );
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.options?.newValue) {
    applyOptions(backgroundCore.normalizeOptions(changes.options.newValue));
  }
});

chrome.runtime.onInstalled.addListener(() => {
  // optionsReady already initializes at module load; avoid duplicate calls
});

/**
 * Recursively extract a display string from a value that may be a
 * primitive, object with `.name`/`.person`, or nested array.
 * @param {unknown} value
 * @returns {string}
 */
function safeExtractString(value) {
  if (Array.isArray(value)) {
    const result = value.map((item) => safeExtractString(item)).join(", ");
    return result || "";
  }

  if (value && typeof value === "object") {
    const obj = /** @type {Record<string, unknown>} */ (value);
    if (typeof obj.name === "string") return obj.name;
    if (typeof obj.person === "string") return obj.person;
    return String(value);
  }

  return value ? String(value) : "";
}

chrome.action.onClicked.addListener(async (tab) => {
  if (tab && tab.id) {
    try {
      await optionsReady;
      const requestId = crypto.randomUUID();
      lastInjectedTabId = tab.id;
      lastRequestId = requestId;
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (activeRequestId) => {
          const pageGlobal = /** @type {Record<string, unknown>} */ (globalThis);
          pageGlobal.__bibtexRequestId = activeRequestId;
        },
        args: [requestId],
      });
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["core.js", "ai.js", "content.js"],
      });
    } catch (error) {
      console.error("Script injection failed:", error);
    }
  }
});

/**
 * @param {MetadataMessage | MetadataAIMessage} message
 * @param {boolean} isAI
 */
function handleMetadataMessage(message, isAI) {
  const title = message.title || "Untitled";
  const url = message.url || "No URL";
  const mauthor = message.author || "";
  const mdate = message.date || "Unknown";

  const currentAuthor = mauthor !== "" ? safeExtractString(mauthor) : "";
  const author = optNoInferAuthor ? "" : currentAuthor;
  const date = optNoInferDate ? "" : mdate;

  /** @type {AIFields} */
  const aiFields = isAI
    ? {
        publicationType: /** @type {MetadataAIMessage} */ (message).publicationType || null,
        abstract: /** @type {MetadataAIMessage} */ (message).abstract || null,
        citationKey: /** @type {MetadataAIMessage} */ (message).citationKey || null,
      }
    : {};

  void addToClipboard(
    backgroundCore.generateBibTeXEntry(
      title,
      url,
      author,
      date,
      optFormattingStyle,
      dateFormat,
      optOmitEmpty,
      optIncludeAccessed,
      aiFields,
    ),
  )
    .then(() => {
      const iconPath = isAI ? "images/icon30ai.png" : "images/icon30copied.png";
      chrome.action.setIcon({ path: { 30: iconPath } }, () => {
        setTimeout(() => {
          chrome.action.setIcon(
            { path: { 30: "images/icon30.png" } },
            () => {},
          );
        }, 2000);
      });
    })
    .catch((error) => {
      console.error("Failed to copy tab info:", error);
    });
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.type === "metadata" || message.type === "metadata-ai") {
    if (!sender.tab || sender.tab.id !== lastInjectedTabId) return;
    if (message.requestId !== lastRequestId) return;
    const isAI = message.type === "metadata-ai";
    handleMetadataMessage(message, isAI);
    lastRequestId = null;
  }
});

/**
 * @param {string} value — BibTeX string to copy
 * @returns {Promise<void>}
 */
async function addToClipboard(value) {
  await ensureOffscreenDocument(chrome.offscreen.Reason.CLIPBOARD);

  chrome.runtime.sendMessage({
    type: "copy-data-to-clipboard",
    target: "offscreen-doc",
    data: value,
  });
}
