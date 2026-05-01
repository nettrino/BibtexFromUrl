// @ts-check
/// <reference path="./types.js" />
/// <reference path="./chrome.d.ts" />

(() => {
  try {
    /** @type {BibtexCoreAPI} */
    const contentCore = BibtexCore;
    const pageGlobal = /** @type {Record<string, unknown>} */ (globalThis);
    const requestId =
      typeof pageGlobal.__bibtexRequestId === "string"
        ? pageGlobal.__bibtexRequestId
        : "missing-request-id";
    const heuristicMeta = contentCore.extractHeuristicMetadata(document, window.location.href);
    const { title, url, author, date } = heuristicMeta;
    void (async () => {
      try {
        const data = await chrome.storage.sync.get("options");
        const enableAI = data.options?.enableAI === true;

        if (!enableAI) {
          chrome.runtime.sendMessage(
            /** @type {MetadataMessage} */ ({
              type: "metadata",
              requestId,
              title,
              url,
              author,
              date,
            }),
          );
          return;
        }

        const available = await checkAIAvailability();
        if (!available) {
          chrome.runtime.sendMessage(
            /** @type {MetadataMessage} */ ({
              type: "metadata",
              requestId,
              title,
              url,
              author,
              date,
            }),
          );
          return;
        }

        const pageText = (document.body.textContent || "").substring(0, 2000);
        /** @type {AIResult | null} */
        const aiResult = await extractWithAI(pageText, { title, author, date });
        if (!aiResult) {
          chrome.runtime.sendMessage(
            /** @type {MetadataMessage} */ ({
              type: "metadata",
              requestId,
              title,
              url,
              author,
              date,
            }),
          );
          return;
        }

        chrome.runtime.sendMessage(
          /** @type {MetadataAIMessage} */ ({
            type: "metadata-ai",
            requestId,
            title,
            url,
            author: author || aiResult.author || "",
            date: date || aiResult.date || "",
            publicationType: aiResult.publicationType || null,
            abstract: aiResult.abstract || null,
            citationKey: aiResult.citationKey || null,
          }),
        );
      } catch (e) {
        console.error("AI enhancement failed:", e);
        chrome.runtime.sendMessage(
          /** @type {MetadataMessage} */ ({
            type: "metadata",
            requestId,
            title,
            url,
            author,
            date,
          }),
        );
      } finally {
        delete pageGlobal.__bibtexRequestId;
      }
    })();
  } catch (error) {
    const pageGlobal = /** @type {Record<string, unknown>} */ (globalThis);
    console.error("Error extracting metadata:", error);
    chrome.runtime.sendMessage(
      /** @type {MetadataMessage} */ ({
        type: "metadata",
        requestId: typeof pageGlobal.__bibtexRequestId === "string" ? pageGlobal.__bibtexRequestId : "missing-request-id",
        title: document.title,
        url: window.location.href,
        author: "Unknown",
        date: "Unknown",
      }),
    );
  }
})();
