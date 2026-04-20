// @ts-check
/// <reference path="./types.js" />
/// <reference path="./chrome.d.ts" />

/** @type {DateFormatCode} */
const defaultDateFormat = "B-2";
/** @type {FormattingStyle} */
const defaultFormattingStyle = "wikipedia";
const defaultOmitEmpty = false;
const defaultIncludeAccessed = true;
const defaultNoInferAuthor = false;
const defaultNoInferDate = false;

/** @type {DateFormatCode} */
let dateFormat = defaultDateFormat;
/** @type {boolean} */
let optOmitEmpty = defaultOmitEmpty;
/** @type {boolean} */
let optIncludeAccessed = defaultIncludeAccessed;
/** @type {FormattingStyle} */
let optFormattingStyle = defaultFormattingStyle;
/** @type {boolean} */
let optNoInferAuthor = defaultNoInferAuthor;
/** @type {boolean} */
let optNoInferDate = defaultNoInferDate;

/** @type {number | null} */
let lastInjectedTabId = null;

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.options?.newValue) {
    const opts = changes.options.newValue;
    optOmitEmpty = Boolean(opts.omitEmptyFields);
    optIncludeAccessed = Boolean(opts.includeAccessDate);
    optNoInferAuthor = Boolean(opts.noInferAuthor);
    optNoInferDate = Boolean(opts.noInferDate);
    dateFormat = opts.dateFormat || defaultDateFormat;
    optFormattingStyle = opts.formattingStyle || defaultFormattingStyle;
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get("options", (data) => {
    if (!data.options) {
      chrome.storage.sync.set({
        options: {
          dateFormat: defaultDateFormat,
          formattingStyle: defaultFormattingStyle,
          omitEmptyFields: defaultOmitEmpty,
          includeAccessDate: defaultIncludeAccessed,
          noInferAuthor: defaultNoInferAuthor,
          noInferDate: defaultNoInferDate,
          enableAI: false,
        },
      });
    }
  });
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
      lastInjectedTabId = tab.id;
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["ai.js", "content.js"],
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

  try {
    addToClipboard(
      generateBibTeXEntry(
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
    );
    const iconPath = isAI ? "images/icon30ai.png" : "images/icon30copied.png";
    chrome.action.setIcon({ path: { 30: iconPath } }, () => {
      setTimeout(() => {
        chrome.action.setIcon(
          { path: { 30: "images/icon30.png" } },
          () => {},
        );
      }, 2000);
    });
  } catch (error) {
    console.error("Failed to copy tab info:", error);
  }
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.type === "metadata" || message.type === "metadata-ai") {
    if (!sender.tab || sender.tab.id !== lastInjectedTabId) return;
    const isAI = message.type === "metadata-ai";
    handleMetadataMessage(message, isAI);
  }
});

/**
 * @param {string} value — BibTeX string to copy
 * @returns {Promise<void>}
 */
async function addToClipboard(value) {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
  });
  if (contexts.length === 0) {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: [chrome.offscreen.Reason.CLIPBOARD],
      justification: "Write text to the clipboard.",
    });
  }

  chrome.runtime.sendMessage({
    type: "copy-data-to-clipboard",
    target: "offscreen-doc",
    data: value,
  });
}

/**
 * @param {Date} d
 * @param {DateFormatCode} format
 * @returns {string}
 */
function formatDate(d, format) {
  let month = String(d.getMonth() + 1);
  let day = String(d.getDate());

  if (month.length === 1) month = "0" + month;
  if (day.length === 1) day = "0" + day;

  switch (format) {
    case "M-1": return month + "/" + day + "/" + d.getFullYear();
    case "M-2": return month + "-" + day + "-" + d.getFullYear();
    case "M-3": return month + "." + day + "." + d.getFullYear();
    case "L-1": return day + "/" + month + "/" + d.getFullYear();
    case "L-2": return day + "-" + month + "-" + d.getFullYear();
    case "L-3": return day + "." + month + "." + d.getFullYear();
    case "B-1": return d.getFullYear() + "/" + month + "/" + day;
    case "B-2": return d.getFullYear() + "-" + month + "-" + day;
    case "B-3": return d.getFullYear() + "." + month + "." + day;
    case "O-1": return month + "/" + d.getFullYear();
    default:    return month + "/" + day + "/" + d.getFullYear();
  }
}

// Shared recursive escape engine — escapeMap determines behavior
// https://github.com/dangmai/escape-latex
// http://www.cespedes.org/blog/85/how-to-escape-latex-special-characters
/**
 * @param {string} str
 * @param {Record<string, string>} escapeMap
 * @returns {string}
 */
function escapeWithMap(str, escapeMap) {
  /** @param {string} s */
  const escapeRegExp = (s) =>
    s.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");

  const keys = Object.keys(escapeMap);
  const keyPatterns = keys.map((k) => escapeRegExp(k));

  for (let i = 0; i < keys.length; i++) {
    const pos = str.search(keyPatterns[i]);
    if (pos !== -1) {
      const match = /** @type {RegExpMatchArray} */ (str.match(keyPatterns[i]));
      return (
        escapeWithMap(str.slice(0, pos), escapeMap) +
        escapeMap[keys[i]] +
        escapeWithMap(str.slice(pos + match[0].length), escapeMap)
      );
    }
  }
  return str;
}

/** @type {Record<string, string>} */
const BIBTEX_KEY_ESCAPES = {
  "{": ".", "}": ".", "\\": ".", "#": ".", $: ".",
  "%": ".", "&": ".", "^": ".", _: ".", "~": ".",
};

/** @type {Record<string, string>} */
const LATEX_ESCAPES = {
  "{": "\\{", "}": "\\}", "\\": "\\textbackslash{}",
  "#": "\\#", $: "\\$", "%": "\\%", "&": "\\&",
  "^": "\\textasciicircum{}", _: "\\_", "~": "\\textasciitilde{}",
};

/**
 * Escape string for BibTeX citation key — replaces special chars with dots.
 * @param {string} str
 * @returns {string}
 */
function bescape(str) {
  return escapeWithMap(str, BIBTEX_KEY_ESCAPES);
}

/**
 * Escape string for LaTeX text fields.
 * @param {string} str
 * @returns {string}
 */
function lescape(str) {
  return escapeWithMap(str, LATEX_ESCAPES);
}

/**
 * Escape URL for safe embedding in BibTeX — strip chars that break field delimiters.
 * @param {string} url
 * @returns {string}
 */
function escapeUrl(url) {
  return url.replace(/["{}\\]/g, encodeURIComponent);
}

/**
 * Sanitize AI-provided citation key: alphanumeric + hyphens only.
 * @param {string} key
 * @returns {string}
 */
function sanitizeCitationKey(key) {
  return key.replace(/[^a-zA-Z0-9\-]/g, "").substring(0, 40);
}

/**
 * @param {string} tabTitle
 * @param {string} tabUrl
 * @param {string} author
 * @param {string} date
 * @param {FormattingStyle} formatting_style
 * @param {DateFormatCode} date_format
 * @param {boolean} omit_empty
 * @param {boolean} include_accessed
 * @param {AIFields} [aiFields]
 * @returns {string}
 */
function generateBibTeXEntry(
  tabTitle,
  tabUrl,
  author,
  date,
  formatting_style,
  date_format,
  omit_empty,
  include_accessed,
  aiFields,
) {
  const ai = aiFields || {};
  const safeUrl = escapeUrl(tabUrl);

  const citationKey = ai.citationKey
    ? sanitizeCitationKey(ai.citationKey)
    : bescape(
        tabTitle
          .replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/\s]/g, "")
          .substring(0, 8),
      ) + Math.floor(Math.random() * 100).toString();

  const pubType = ai.publicationType;
  /** @type {string} */
  let entryType;
  /** @type {string | null} */
  let extraTypeField = null;

  if (pubType === "article") {
    entryType = "@article";
  } else if (pubType === "blogpost") {
    entryType = "@misc";
    extraTypeField = "Blog post";
  } else if (pubType === "report" || pubType === "documentation") {
    entryType = "@techreport";
  } else if (pubType === "news") {
    entryType = "@misc";
    extraTypeField = "News article";
  } else if (pubType === "book") {
    entryType = "@book";
  } else {
    switch (formatting_style) {
      case "wikipedia":
      case "misc":
        entryType = "@misc";
        break;
      case "online":
        entryType = "@online";
        break;
    }
  }

  let entry = entryType + "{" + citationKey + ":online,\n";

  if (author === "") {
    if (!omit_empty) {
      entry += "  author = {},\n";
    }
  } else {
    entry += "  author = {" + author + "},\n";
  }

  entry += "  title = {" + lescape(tabTitle) + "},\n";

  switch (formatting_style) {
    case "wikipedia":
      entry += '  url = "' + safeUrl + '",\n';
      break;
    case "misc":
      entry += "  howpublished = {\\url{" + safeUrl + "}},\n";
      break;
    case "online":
      entry += "  url = {" + safeUrl + "},\n";
      break;
  }

  if (date === "") {
    if (!omit_empty) {
      entry += "  month = {},\n";
      entry += "  year = {},\n";
    }
  } else {
    try {
      const dateF = new Date(date);

      if (isNaN(dateF.getTime())) {
        if (!omit_empty) {
          entry += "  month = {},\n";
          entry += "  year = {},\n";
        }
      } else {
        /** @type {number | string} */
        let year = dateF.getFullYear();
        /** @type {number | string} */
        let month = dateF.getMonth() + 1;
        if (year === 1970 && month === 1) {
          year = "";
          month = "";
        }
        entry += "  month = {" + month + "},\n";
        entry += "  year = {" + year + "},\n";
      }
    } catch (error) {
      console.error("Error parsing date", /** @type {Error} */ (error).message);
      if (!omit_empty) {
        entry += "  month = {},\n";
        entry += "  year = {},\n";
      }
    }
  }

  if (extraTypeField) {
    entry += "  type = {" + extraTypeField + "},\n";
  }
  if (ai.abstract) {
    entry += "  abstract = {" + lescape(ai.abstract) + "},\n";
  }

  if (include_accessed) {
    switch (formatting_style) {
      case "wikipedia":
        entry += '  note = "[Online; accessed ';
        entry += formatDate(new Date(), date_format) + ']"\n';
        break;
      case "misc":
        entry += "  note = {(Accessed on ";
        entry += formatDate(new Date(), date_format) + ")}\n";
        break;
      case "online":
        entry += "  urldate = {";
        entry += formatDate(new Date(), date_format) + "}\n";
        break;
    }
  }

  entry += "}";
  return entry;
}
