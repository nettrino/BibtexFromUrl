(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module && "exports" in module) {
    module.exports = api;
  }

  /** @type {Record<string, unknown>} */ (root).BibtexCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /** @type {DateFormatCode} */
  const defaultDateFormat = "B-2";
  /** @type {FormattingStyle} */
  const defaultFormattingStyle = "wikipedia";
  /** @type {Options} */
  const defaultOptions = {
    dateFormat: defaultDateFormat,
    formattingStyle: defaultFormattingStyle,
    omitEmptyFields: false,
    includeAccessDate: true,
    noInferAuthor: false,
    noInferDate: false,
    enableAI: false,
  };
  /** @type {DateFormatCode[]} */
  const validDateFormats = ["M-1", "M-2", "M-3", "L-1", "L-2", "L-3", "B-1", "B-2", "B-3", "O-1"];
  /** @type {FormattingStyle[]} */
  const validFormattingStyles = ["wikipedia", "misc", "online"];

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
   * @param {Partial<Options> | undefined} rawOptions
   * @returns {Options}
   */
  function normalizeOptions(rawOptions) {
    const normalizedDateFormat =
      rawOptions?.dateFormat && validDateFormats.includes(/** @type {DateFormatCode} */ (rawOptions.dateFormat))
        ? /** @type {DateFormatCode} */ (rawOptions.dateFormat)
        : defaultOptions.dateFormat;
    const normalizedFormattingStyle =
      rawOptions?.formattingStyle &&
      validFormattingStyles.includes(/** @type {FormattingStyle} */ (rawOptions.formattingStyle))
        ? /** @type {FormattingStyle} */ (rawOptions.formattingStyle)
        : defaultOptions.formattingStyle;

    return {
      dateFormat: normalizedDateFormat,
      formattingStyle: normalizedFormattingStyle,
      omitEmptyFields:
        typeof rawOptions?.omitEmptyFields === "boolean"
          ? rawOptions.omitEmptyFields
          : defaultOptions.omitEmptyFields,
      includeAccessDate:
        typeof rawOptions?.includeAccessDate === "boolean"
          ? rawOptions.includeAccessDate
          : defaultOptions.includeAccessDate,
      noInferAuthor:
        typeof rawOptions?.noInferAuthor === "boolean"
          ? rawOptions.noInferAuthor
          : defaultOptions.noInferAuthor,
      noInferDate:
        typeof rawOptions?.noInferDate === "boolean"
          ? rawOptions.noInferDate
          : defaultOptions.noInferDate,
      enableAI:
        typeof rawOptions?.enableAI === "boolean"
          ? rawOptions.enableAI
          : defaultOptions.enableAI,
    };
  }

  /**
   * @param {StorageLike} storage
   * @returns {Options | null}
   */
  function parseLegacyOptions(storage) {
    const dateFormat = storage.getItem("date_sel");
    const formattingStyle = storage.getItem("format_bx");
    const omitEmpty = storage.getItem("empty_bx");
    const includeAccessDate = storage.getItem("acc_bx");

    const hasLegacyValue =
      dateFormat !== null ||
      formattingStyle !== null ||
      omitEmpty !== null ||
      includeAccessDate !== null;

    if (!hasLegacyValue) return null;

    return normalizeOptions({
      dateFormat:
        dateFormat && validDateFormats.includes(/** @type {DateFormatCode} */ (dateFormat))
          ? /** @type {DateFormatCode} */ (dateFormat)
          : defaultOptions.dateFormat,
      formattingStyle:
        formattingStyle === "misc" || formattingStyle === "online" || formattingStyle === "wikipedia"
          ? formattingStyle
          : defaultOptions.formattingStyle,
      omitEmptyFields: omitEmpty === "true",
      includeAccessDate: includeAccessDate !== "false",
      noInferAuthor: false,
      noInferDate: false,
      enableAI: false,
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
      default: return month + "/" + day + "/" + d.getFullYear();
    }
  }

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

  /**
   * @param {string} str
   * @returns {string}
   */
  function bescape(str) {
    return escapeWithMap(str, BIBTEX_KEY_ESCAPES);
  }

  /**
   * @param {string} str
   * @returns {string}
   */
  function lescape(str) {
    return escapeWithMap(str, LATEX_ESCAPES);
  }

  /**
   * @param {string} url
   * @returns {string}
   */
  function escapeUrl(url) {
    return url.replace(/["{}\\]/g, encodeURIComponent);
  }

  /**
   * @param {string} key
   * @returns {string}
   */
  function sanitizeCitationKey(key) {
    return key.replace(/[^a-zA-Z0-9\-]/g, "").substring(0, 40);
  }

  /**
   * @param {unknown} value
   * @returns {string | null}
   */
  function extractAuthorValue(value) {
    if (typeof value === "string") return value;

    if (Array.isArray(value)) {
      const authors = value
        .map((item) => extractAuthorValue(item))
        .filter((item) => typeof item === "string" && item.length > 0);
      return authors.length > 0 ? authors.join(", ") : null;
    }

    if (value && typeof value === "object") {
      const authorObject = /** @type {Record<string, unknown>} */ (value);
      if (typeof authorObject.name === "string") return authorObject.name;
    }

    return null;
  }

  /**
   * @param {unknown} value
   * @returns {{author: string | null, date: string | null}}
   */
  function extractJsonLdMetadata(value) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const result = extractJsonLdMetadata(item);
        if (result.author || result.date) return result;
      }
      return { author: null, date: null };
    }

    if (!value || typeof value !== "object") {
      return { author: null, date: null };
    }

    const record = /** @type {Record<string, unknown>} */ (value);
    let author = extractAuthorValue(record.author);
    let date = typeof record.datePublished === "string" ? record.datePublished : null;

    if ((!author || !date) && record["@graph"]) {
      const nested = extractJsonLdMetadata(record["@graph"]);
      author = author || nested.author;
      date = date || nested.date;
    }

    return { author, date };
  }

  /**
   * @param {Pick<Document, "title" | "querySelector">} doc
   * @param {string} pageUrl
   * @returns {HeuristicMeta & { url: string }}
   */
  function extractHeuristicMetadata(doc, pageUrl) {
    /** @type {string | null} */
    let author = null;
    /** @type {string | null} */
    let date = null;

    const jsonLD = doc.querySelector('script[type="application/ld+json"]');
    if (jsonLD) {
      try {
        const jsonData = JSON.parse(jsonLD.textContent || "");
        const jsonMeta = extractJsonLdMetadata(jsonData);
        author = jsonMeta.author;
        date = jsonMeta.date;
      } catch (error) {
        console.error("Error parsing JSON-LD:", error);
      }
    }

    if (!author || !date) {
      const metaAuthor = doc
        .querySelector('meta[name="author"]')
        ?.getAttribute("content");
      const metaDate = doc
        .querySelector('meta[property="article:published_time"]')
        ?.getAttribute("content");
      if (metaAuthor) author = metaAuthor;
      if (metaDate) date = metaDate;
    }

    if (!author || !date) {
      const ogAuthor = doc
        .querySelector('meta[property="og:author"]')
        ?.getAttribute("content");
      const ogDate = doc
        .querySelector('meta[property="article:published_time"]')
        ?.getAttribute("content");
      if (ogAuthor) author = ogAuthor;
      if (ogDate) date = ogDate;
    }

    if (!author || !date) {
      const authorFromElement =
        doc.querySelector(".author")?.textContent ||
        doc.querySelector('[itemprop="author"]')?.textContent;
      const dateFromElement =
        doc.querySelector("time")?.getAttribute("datetime") ||
        doc
          .querySelector('[itemprop="datePublished"]')
          ?.getAttribute("datetime");
      if (authorFromElement) author = authorFromElement;
      if (dateFromElement) date = dateFromElement;
    }

    if (!author || !date) {
      const authorFromDataAttr = doc
        .querySelector("[data-author]")
        ?.getAttribute("data-author");
      const dateFromDataAttr = doc
        .querySelector("[data-date]")
        ?.getAttribute("data-date");
      if (authorFromDataAttr) author = authorFromDataAttr;
      if (dateFromDataAttr) date = dateFromDataAttr;
    }

    return {
      title: doc.title,
      url: pageUrl,
      author,
      date,
    };
  }

  /**
   * @param {string} tabTitle
   * @param {string} tabUrl
   * @param {string} author
   * @param {string} date
   * @param {FormattingStyle} formattingStyle
   * @param {DateFormatCode} dateFormat
   * @param {boolean} omitEmpty
   * @param {boolean} includeAccessed
   * @param {AIFields} [aiFields]
   * @returns {string}
   */
  function generateBibTeXEntry(
    tabTitle,
    tabUrl,
    author,
    date,
    formattingStyle,
    dateFormat,
    omitEmpty,
    includeAccessed,
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
      switch (formattingStyle) {
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
      if (!omitEmpty) {
        entry += "  author = {},\n";
      }
    } else {
      entry += "  author = {" + lescape(author) + "},\n";
    }

    entry += "  title = {" + lescape(tabTitle) + "},\n";

    switch (formattingStyle) {
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
      if (!omitEmpty) {
        entry += "  month = {},\n";
        entry += "  year = {},\n";
      }
    } else {
      const dateF = new Date(date);

      if (isNaN(dateF.getTime())) {
        if (!omitEmpty) {
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
    }

    if (extraTypeField) {
      entry += "  type = {" + extraTypeField + "},\n";
    }
    if (ai.abstract) {
      entry += "  abstract = {" + lescape(ai.abstract) + "},\n";
    }

    if (includeAccessed) {
      switch (formattingStyle) {
        case "wikipedia":
          entry += '  note = "[Online; accessed ';
          entry += formatDate(new Date(), dateFormat) + ']"\n';
          break;
        case "misc":
          entry += "  note = {(Accessed on ";
          entry += formatDate(new Date(), dateFormat) + ")}\n";
          break;
        case "online":
          entry += "  urldate = {";
          entry += formatDate(new Date(), dateFormat) + "}\n";
          break;
      }
    }

    entry += "}";
    return entry;
  }

  return {
    defaultOptions,
    validDateFormats,
    validFormattingStyles,
    normalizeOptions,
    parseLegacyOptions,
    formatDate,
    bescape,
    lescape,
    sanitizeCitationKey,
    extractHeuristicMetadata,
    generateBibTeXEntry,
  };
});
