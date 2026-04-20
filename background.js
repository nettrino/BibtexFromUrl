const defaultDateFormat = "B-2";
const defaultFormattingStyle = "wikipedia";
const defaultOmitEmpty = false;
const defaultIncludeAccessed = true;
const defaultNoInferAuthor = false;
const defaultNoInferDate = false;

let dateFormat = defaultDateFormat;
let optOmitEmpty = defaultOmitEmpty;
let optIncludeAccessed = defaultIncludeAccessed;
let optFormattingStyle = defaultFormattingStyle;
let optNoInferAuthor = defaultNoInferAuthor;
let optNoInferDate = defaultNoInferDate;

// Track which tab we last injected into, to validate message senders
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

function safeExtractString(value) {
  if (Array.isArray(value)) {
    const result = value.map((item) => safeExtractString(item)).join(", ");
    return result || "";
  }

  if (value && typeof value === "object") {
    if (typeof value.name === "string") return value.name;
    if (typeof value.person === "string") return value.person;
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

function handleMetadataMessage(message, isAI) {
  const title = message.title || "Untitled";
  const url = message.url || "No URL";
  const mauthor = message.author || "";
  const mdate = message.date || "Unknown";

  const currentAuthor = mauthor !== "" ? safeExtractString(mauthor) : "";
  const author = optNoInferAuthor ? "" : currentAuthor;
  const date = optNoInferDate ? "" : mdate;

  const aiFields = isAI
    ? {
        publicationType: message.publicationType || null,
        abstract: message.abstract || null,
        citationKey: message.citationKey || null,
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
  // Only accept metadata messages from content scripts in tabs we injected into
  if (message.type === "metadata" || message.type === "metadata-ai") {
    if (!sender.tab || sender.tab.id !== lastInjectedTabId) return;
    const isAI = message.type === "metadata-ai";
    handleMetadataMessage(message, isAI);
  }
});

async function addToClipboard(value) {
  // Check if offscreen document already exists before creating
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
function escapeWithMap(str, escapeMap) {
  const escapeRegExp = (s) =>
    s.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");

  const keys = Object.keys(escapeMap);
  const keyPatterns = keys.map((k) => escapeRegExp(k));

  for (let i = 0; i < keys.length; i++) {
    const pos = str.search(keyPatterns[i]);
    if (pos !== -1) {
      const match = str.match(keyPatterns[i]);
      return (
        escapeWithMap(str.slice(0, pos), escapeMap) +
        escapeMap[keys[i]] +
        escapeWithMap(str.slice(pos + match[0].length), escapeMap)
      );
    }
  }
  return str;
}

const BIBTEX_KEY_ESCAPES = {
  "{": ".", "}": ".", "\\": ".", "#": ".", $: ".",
  "%": ".", "&": ".", "^": ".", _: ".", "~": ".",
};

const LATEX_ESCAPES = {
  "{": "\\{", "}": "\\}", "\\": "\\textbackslash{}",
  "#": "\\#", $: "\\$", "%": "\\%", "&": "\\&",
  "^": "\\textasciicircum{}", _: "\\_", "~": "\\textasciitilde{}",
};

function bescape(str) {
  return escapeWithMap(str, BIBTEX_KEY_ESCAPES);
}

function lescape(str) {
  return escapeWithMap(str, LATEX_ESCAPES);
}

// Escape URL for safe embedding in BibTeX — strip chars that break field delimiters
function escapeUrl(url) {
  return url.replace(/["{}\\]/g, encodeURIComponent);
}

// Sanitize AI-provided citation key: alphanumeric + hyphens only
function sanitizeCitationKey(key) {
  return key.replace(/[^a-zA-Z0-9\-]/g, "").substring(0, 40);
}

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
  let entryType;
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

      if (isNaN(dateF)) {
        if (!omit_empty) {
          entry += "  month = {},\n";
          entry += "  year = {},\n";
        }
      } else {
        let year = dateF.getFullYear();
        let month = dateF.getMonth() + 1;
        if (year === 1970 && month === 1) {
          year = "";
          month = "";
        }
        entry += "  month = {" + month + "},\n";
        entry += "  year = {" + year + "},\n";
      }
    } catch (error) {
      console.error("Error parsing date", error.message);
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
