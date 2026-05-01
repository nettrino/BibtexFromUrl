const test = require("node:test");
const assert = require("node:assert/strict");

const {
  defaultOptions,
  normalizeOptions,
  parseLegacyOptions,
  sanitizeCitationKey,
  extractHeuristicMetadata,
  generateBibTeXEntry,
} = require("../../core.js");

function createStorage(values) {
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null;
    },
  };
}

function createNode({ textContent = "", attrs = {} } = {}) {
  return {
    textContent,
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null;
    },
  };
}

function createDocument({ title, selectors }) {
  return {
    title,
    querySelector(selector) {
      return Object.prototype.hasOwnProperty.call(selectors, selector)
        ? selectors[selector]
        : null;
    },
  };
}

test("normalizeOptions fills defaults and rejects invalid enum values", () => {
  const normalized = normalizeOptions({
    dateFormat: "bad-format",
    formattingStyle: "bad-style",
    omitEmptyFields: true,
  });

  assert.deepEqual(normalized, {
    ...defaultOptions,
    omitEmptyFields: true,
  });
});

test("parseLegacyOptions migrates existing MV2 localStorage values", () => {
  const parsed = parseLegacyOptions(createStorage({
    date_sel: "L-2",
    format_bx: "online",
    empty_bx: "true",
    acc_bx: "false",
  }));

  assert.deepEqual(parsed, {
    dateFormat: "L-2",
    formattingStyle: "online",
    omitEmptyFields: true,
    includeAccessDate: false,
    noInferAuthor: false,
    noInferDate: false,
    enableAI: false,
  });
});

test("parseLegacyOptions returns null when no legacy keys exist", () => {
  assert.equal(parseLegacyOptions(createStorage({})), null);
});

test("sanitizeCitationKey removes unsupported characters", () => {
  assert.equal(
    sanitizeCitationKey("smith_2024:weird/key?yes"),
    "smith2024weirdkeyyes",
  );
});

test("extractHeuristicMetadata reads author/date from JSON-LD arrays", () => {
  const doc = createDocument({
    title: "Example Title",
    selectors: {
      'script[type="application/ld+json"]': createNode({
        textContent: JSON.stringify([
          {
            author: [{ name: "Ada Lovelace" }, { name: "Grace Hopper" }],
            datePublished: "2024-02-29",
          },
        ]),
      }),
    },
  });

  assert.deepEqual(
    extractHeuristicMetadata(doc, "https://example.com/article"),
    {
      title: "Example Title",
      url: "https://example.com/article",
      author: "Ada Lovelace, Grace Hopper",
      date: "2024-02-29",
    },
  );
});

test("extractHeuristicMetadata falls back to meta tags", () => {
  const doc = createDocument({
    title: "Meta Example",
    selectors: {
      'meta[name="author"]': createNode({ attrs: { content: "Meta Author" } }),
      'meta[property="article:published_time"]': createNode({
        attrs: { content: "2025-01-15" },
      }),
    },
  });

  assert.deepEqual(
    extractHeuristicMetadata(doc, "https://example.com/meta"),
    {
      title: "Meta Example",
      url: "https://example.com/meta",
      author: "Meta Author",
      date: "2025-01-15",
    },
  );
});

test("generateBibTeXEntry escapes author/title and uses AI fields", () => {
  const originalRandom = Math.random;
  const OriginalDate = Date;

  Math.random = () => 0.42;
  global.Date = class extends OriginalDate {
    constructor(value) {
      super(value || "2026-04-21T00:00:00Z");
    }

    static now() {
      return new OriginalDate("2026-04-21T00:00:00Z").getTime();
    }
  };

  try {
    const entry = generateBibTeXEntry(
      "AT&T launch {notes}",
      "https://example.com/a?b={c}",
      "AT&T_Research",
      "2024-03-10",
      "wikipedia",
      "B-2",
      false,
      true,
      {
        publicationType: "article",
        abstract: "A&B summary",
        citationKey: "smith_2024:paper",
      },
    );

    assert.match(entry, /^@article\{smith2024paper:online,/);
    assert.match(entry, /author = \{AT\\&T\\_Research\}/);
    assert.match(entry, /title = \{AT\\&T launch \\{notes\\}\}/);
    assert.match(entry, /url = "https:\/\/example\.com\/a\?b=%7Bc%7D"/);
    assert.match(entry, /month = \{3\}/);
    assert.match(entry, /year = \{2024\}/);
    assert.match(entry, /abstract = \{A\\&B summary\}/);
    assert.match(entry, /note = "\[Online; accessed 2026-04-21\]"/);
  } finally {
    Math.random = originalRandom;
    global.Date = OriginalDate;
  }
});
