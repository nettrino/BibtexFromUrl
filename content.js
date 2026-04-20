// @ts-check
/// <reference path="./types.js" />
/// <reference path="./chrome.d.ts" />

(() => {
  try {
    /** @type {string | null} */
    let author = null;
    /** @type {string | null} */
    let date = null;

    // 1. Try <script type="application/ld+json"> (JSON-LD)
    const jsonLD = document.querySelector('script[type="application/ld+json"]');
    if (jsonLD) {
      try {
        const jsonData = JSON.parse(jsonLD.textContent || "");
        if (jsonData.author) {
          author = jsonData.author.name
            ? jsonData.author.name
            : jsonData.author;
        }
        if (jsonData.datePublished) {
          date = jsonData.datePublished;
        }
      } catch (error) {
        console.error("Error parsing JSON-LD:", error);
      }
    }

    // 2. Try meta tags for author and date
    if (!author || !date) {
      const metaAuthor = document
        .querySelector('meta[name="author"]')
        ?.getAttribute("content");
      const metaDate = document
        .querySelector('meta[property="article:published_time"]')
        ?.getAttribute("content");
      if (metaAuthor) author = metaAuthor;
      if (metaDate) date = metaDate;
    }

    // 3. Try Open Graph tags (og:author and article:published_time)
    if (!author || !date) {
      const ogAuthor = document
        .querySelector('meta[property="og:author"]')
        ?.getAttribute("content");
      const ogDate = document
        .querySelector('meta[property="article:published_time"]')
        ?.getAttribute("content");
      if (ogAuthor) author = ogAuthor;
      if (ogDate) date = ogDate;
    }

    // 4. Try HTML elements (visible in the body)
    if (!author || !date) {
      const authorFromElement =
        document.querySelector(".author")?.textContent ||
        document.querySelector('[itemprop="author"]')?.textContent;
      const dateFromElement =
        document.querySelector("time")?.getAttribute("datetime") ||
        document
          .querySelector('[itemprop="datePublished"]')
          ?.getAttribute("datetime");
      if (authorFromElement) author = authorFromElement;
      if (dateFromElement) date = dateFromElement;
    }

    // 5. Try structured data (Microdata or RDFa)
    if (!author || !date) {
      const microdataAuthor = document.querySelector(
        '[itemprop="author"]',
      )?.textContent;
      const microdataDate = document
        .querySelector('[itemprop="datePublished"]')
        ?.getAttribute("datetime");
      if (microdataAuthor) author = microdataAuthor;
      if (microdataDate) date = microdataDate;
    }

    // 6. Try custom data attributes
    if (!author || !date) {
      const authorFromDataAttr = document
        .querySelector("[data-author]")
        ?.getAttribute("data-author");
      const dateFromDataAttr = document
        .querySelector("[data-date]")
        ?.getAttribute("data-date");
      if (authorFromDataAttr) author = authorFromDataAttr;
      if (dateFromDataAttr) date = dateFromDataAttr;
    }

    const title = document.title;
    const url = window.location.href;

    // Phase 1: send heuristic metadata immediately
    chrome.runtime.sendMessage(
      /** @type {MetadataMessage} */ ({
        type: "metadata",
        title,
        url,
        author,
        date,
      }),
    );

    // Phase 2: AI enhancement (async, non-blocking)
    (async () => {
      try {
        const data = await chrome.storage.sync.get("options");
        const enableAI = data.options?.enableAI === true;
        if (!enableAI) return;

        const available = await checkAIAvailability();
        if (!available) return;

        // textContent avoids layout reflow unlike innerText
        const pageText = (document.body.textContent || "").substring(0, 2000);
        /** @type {AIResult | null} */
        const aiResult = await extractWithAI(pageText, { title, author, date });
        if (!aiResult) return;

        /** @type {MetadataAIMessage} */
        const enriched = {
          type: "metadata-ai",
          title,
          url,
          author: author || aiResult.author || "",
          date: date || aiResult.date || "",
          publicationType: aiResult.publicationType || null,
          abstract: aiResult.abstract || null,
          citationKey: aiResult.citationKey || null,
        };

        chrome.runtime.sendMessage(enriched);
      } catch (e) {
        console.error("AI enhancement failed:", e);
      }
    })();
  } catch (error) {
    console.error("Error extracting metadata:", error);
    chrome.runtime.sendMessage(
      /** @type {MetadataMessage} */ ({
        type: "metadata",
        title: document.title,
        url: window.location.href,
        author: "Unknown",
        date: "Unknown",
      }),
    );
  }
})();
