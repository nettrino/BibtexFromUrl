const defaultDateFormat = "B-2";
const defaultFormattingStyle = "wikipedia";
const defaultOmitEmpty = false;
const defaultIncludeAccessed = true;
const defaultNoInferAuthor = false;
const defaultNoInferDate = false;

var dateFormat = defaultDateFormat;
var optOmitEmpty = defaultOmitEmpty;
var optIncludeAccessed = defaultIncludeAccessed;
var optFormattingStyle = defaultFormattingStyle;
var optNoInferAuthor = defaultNoInferAuthor;
var optNoInferDate = defaultNoInferDate;

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.options?.newValue) {
    const omitEmpty = Boolean(changes.options.newValue.omitEmptyFields);
    const includeAccessDate = Boolean(
      changes.options.newValue.includeAccessDate,
    );
    const noInferAuthor = Boolean(changes.options.newValue.noInferAuthor);
    const noInferDate = Boolean(changes.options.newValue.noInferDate);
    const selectedDateFormat =
      changes.options.newValue.dateFormat || defaultDateFormat;
    const selectedFormattingStyle =
      changes.options.newValue.formattingStyle || defaultFormattingStyle;

    dateFormat = selectedDateFormat;
    optOmitEmpty = omitEmpty;
    optIncludeAccessed = includeAccessDate;
    optFormattingStyle = selectedFormattingStyle;
    optNoInferDate = noInferDate;
    optNoInferAuthor = noInferAuthor;
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ dateFormat });
  chrome.storage.sync.set({ optOmitEmpty });
  chrome.storage.sync.set({ optIncludeAccessed });
  chrome.storage.sync.set({ optFormattingStyle });
  chrome.storage.sync.set({ optNoInferAuthor });
  chrome.storage.sync.set({ optNoInferDate });
});

function safeExtractString(value) {
  if (Array.isArray(value)) {
    // If the value is an array, try to extract the 'name' or 'person' property from each item
    const result = value.map((item) => safeExtractString(item)).join(", ");
    return result || ""; // Return the concatenated result or null if nothing valid was found
  }

  if (value && typeof value === "object") {
    // Check if it's an object with a 'name' property (common in JSON-LD and meta)
    if (value.name) {
      return value.name;
    }
    // If the object doesn't have a 'name', try to access 'person' or fallback to a string version of the object
    if (value.person) {
      return value.person;
    }
    return value.toString(); // Fallback: If it's a generic object, we return its string representation
  }

  return value ? value.toString() : ""; // If it's not an object or array, return it as string
}

chrome.action.onClicked.addListener(async (tab) => {
  if (tab && tab.id) {
    try {
      // Inject a script into the active tab
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"], // File containing the code to execute
      });
    } catch (error) {}
  }
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.type === "metadata") {
    console.log("received metadata");
    const title = message.title || "Untitled";
    const url = message.url || "No URL";
    const mauthor = message.author || "";
    const mdate = message.date || "Unknown";

    var currentAuthor = "";
    if (mauthor != "") {
      currentAuthor = safeExtractString(mauthor);
    } else {
      currentAuthor = "";
    }
    const author = optNoInferAuthor ? "" : currentAuthor;
    const date = optNoInferDate ? "" : mdate;
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
        ),
      );
      chrome.action.setIcon({ path: { 30: "images/icon30copied.png" } }, () => {
        // Wait 3 seconds and then revert to "icon30.png"
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
});

async function addToClipboard(value) {
  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: [chrome.offscreen.Reason.CLIPBOARD],
    justification: "Write text to the clipboard.",
  });

  // Now that we have an offscreen document, we can dispatch the
  // message.
  chrome.runtime.sendMessage({
    type: "copy-data-to-clipboard",
    target: "offscreen-doc",
    data: value,
  });
}

function formatDate(d, format) {
  var month, day, date;

  month = d.getMonth();
  day = d.getDate();
  month = month + 1;

  month = month + "";

  if (month.length == 1) month = "0" + month;

  day = day + "";

  if (day.length == 1) day = "0" + day;

  date = "";
  switch (format) {
    case "M-1":
      date = month + "/" + day + "/" + d.getFullYear();
      break;
    case "M-2":
      date = month + "-" + day + "-" + d.getFullYear();
      break;
    case "M-3":
      date = month + "." + day + "." + d.getFullYear();
      break;
    case "L-1":
      date = day + "/" + month + "/" + d.getFullYear();
      break;
    case "L-2":
      date = day + "-" + month + "-" + d.getFullYear();
      break;
    case "L-3":
      date = day + "." + month + "." + d.getFullYear();
      break;
    case "B-1":
      date = d.getFullYear() + "/" + month + "/" + day;
      break;
    case "B-2":
      date = d.getFullYear() + "-" + month + "-" + day;
      break;
    case "B-3":
      date = d.getFullYear() + "." + month + "." + day;
      break;
    case "O-1":
      date = month + "/" + d.getFullYear();
      break;
    default:
      date = month + "/" + day + "/" + d.getFullYear();
  }

  return date;
}

/*
 * Escape a string to be used in Bibtex title
 */
function bescape(str) {
  var escapes, escapeRegExp, escapeRegExps, escapeKeys, pos, match, regExp;
  var regExpFound = false;

  // Escape code from https://github.com/dangmai/escape-latex Map the
  // characters to escape to their escaped values. The list is derived from
  // http://www.cespedes.org/blog/85/how-to-escape-latex-special-characters
  escapes = {
    "{": ".",
    "}": ".",
    "\\": ".",
    "#": ".",
    $: ".",
    "%": ".",
    "&": ".",
    "^": ".",
    _: ".",
    "~": ".",
  };

  // Escape a string to be used in JS regular expression.
  // Code from http://stackoverflow.com/a/6969486
  // @param str the string to be used in a RegExp
  // @return the escaped string, ready to be used for RegExp
  escapeRegExp = function (str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
  };

  escapeKeys = Object.keys(escapes); // as it is reused later on
  escapeKeyRegExps = escapeKeys.map(function (key) {
    return escapeRegExp(key);
  });
  result = str;

  // Find the character(s) to escape, then break the string up at
  // that/those character(s) and repeat the process recursively.
  // We can't just sequentially replace each character(s), because the result
  // of an earlier step might be escaped again by a later step.
  escapeKeys.forEach(function (key, index) {
    if (regExpFound) {
      // This is here to avoid breaking up strings
      // unnecessarily: In every repetition step, we only
      // need to find ONE special character(s) to break up
      // the string; after it is done, there is no need to
      // look further.
      return;
    }
    pos = str.search(escapeKeyRegExps[index]);
    match = str.match(escapeKeyRegExps[index]);
    if (pos !== -1) {
      result = lescape(str.slice(0, pos)) + escapes[escapeKeys[index]];
      result += lescape(str.slice(pos + match.length));
      regExpFound = true;
    }
  });

  // Found nothing else to escape
  return result;
}

/*
 * Escape a string to be used in LaTeX documents.
 */
function lescape(str) {
  var escapes, escapeRegExp, escapeRegExps, escapeKeys, pos, match, regExp;
  var regExpFound = false;

  // Escape code from https://github.com/dangmai/escape-latex Map the
  // characters to escape to their escaped values. The list is derived from
  // http://www.cespedes.org/blog/85/how-to-escape-latex-special-characters
  escapes = {
    "{": "\\{",
    "}": "\\}",
    "\\": "\\textbackslash{}",
    "#": "\\#",
    $: "\\$",
    "%": "\\%",
    "&": "\\&",
    "^": "\\textasciicircum{}",
    _: "\\_",
    "~": "\\textasciitilde{}",
  };

  // Escape a string to be used in JS regular expression.
  // Code from http://stackoverflow.com/a/6969486
  // @param str the string to be used in a RegExp
  // @return the escaped string, ready to be used for RegExp
  escapeRegExp = function (str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
  };

  escapeKeys = Object.keys(escapes); // as it is reused later on
  escapeKeyRegExps = escapeKeys.map(function (key) {
    return escapeRegExp(key);
  });
  result = str;

  // Find the character(s) to escape, then break the string up at
  // that/those character(s) and repeat the process recursively.
  // We can't just sequentially replace each character(s), because the result
  // of an earlier step might be escaped again by a later step.
  escapeKeys.forEach(function (key, index) {
    if (regExpFound) {
      // This is here to avoid breaking up strings
      // unnecessarily: In every repetition step, we only
      // need to find ONE special character(s) to break up
      // the string; after it is done, there is no need to
      // look further.
      return;
    }
    pos = str.search(escapeKeyRegExps[index]);
    match = str.match(escapeKeyRegExps[index]);
    if (pos !== -1) {
      result = lescape(str.slice(0, pos)) + escapes[escapeKeys[index]];
      result += lescape(str.slice(pos + match.length));
      regExpFound = true;
    }
  });

  // Found nothing else to escape
  return result;
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
) {
  var abbr, suffix, entry, result;

  abbr = tabTitle
    .replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/\s]/g, "")
    .substring(0, 8);
  suffix = Math.floor(Math.random() * 100);

  // entry name
  switch (formatting_style) {
    case "wikipedia":
      entry = "@misc{" + bescape(abbr) + suffix.toString() + ":online,\n";
      break;
    case "misc":
      entry = "@misc{" + bescape(abbr) + suffix.toString() + ":online,\n";
      break;
    case "online":
      entry = "@online{" + bescape(abbr) + suffix.toString() + ":online,\n";
      break;
  }

  if (author == "") {
    if (omit_empty != "true") {
      entry += "author = {},\n";
    }
  } else {
    entry += "author = {" + author + "},\n";
  }

  // title
  entry += "  title = {" + lescape(tabTitle) + "},\n";

  // url
  switch (formatting_style) {
    case "wikipedia":
      entry += '  url = "' + tabUrl + '",\n';
      break;
    case "misc":
      entry += "howpublished = {\\url{" + tabUrl + "}},\n";
      break;
    case "online":
      entry += "url = {" + tabUrl + "},\n";
      break;
  }

  // month and year
  if (date == "") {
    if (omit_empty != "true") {
      entry += "month = {},\n";
      entry += "year = {},\n";
    }
  } else {
    try {
      // Create a Date object from the string
      // console.log("Creating date object", date);
      const dateF = new Date(date);
      // console.log("Created date object", dateF);

      if (isNaN(dateF)) {
        if (omit_empty != "true") {
          entry += "month = {},\n";
          entry += "year = {},\n";
        }
      } else {
        // Extract year and month
        var year = dateF.getFullYear();
        var month = dateF.getMonth() + 1;
        if (year == "1970" && month == "1") {
          year = "";
          month = "";
        }
        entry += "month = {" + month + "},\n";
        entry += "year = {" + year + "},\n";
      }
    } catch (error) {
      console.error("Error parsing date", error.message);
      if (omit_empty != "true") {
        entry += "month = {},\n";
        entry += "year = {},\n";
      }
    }
  }

  // urldate
  if (include_accessed != "false") {
    switch (formatting_style) {
      case "wikipedia":
        entry += '  note = "[Online; accessed ';
        entry += formatDate(new Date(), date_format) + ']"\n';
        break;
      case "misc":
        entry += "note = {(Accessed on ";
        entry += formatDate(new Date(), date_format) + ")}\n";
        break;
      case "online":
        entry += "urldate = {";
        entry += formatDate(new Date(), date_format) + "}\n";
        break;
    }

    // done!
    entry += "}";

    return entry;
  }
}
