(() => {
  try {
    // FIXME save this per tab url because otherwise
    // just by visiting another tab we might have
    // state from another URL
    let author = null;
    let date = null;

    // 1. Try <script type="application/ld+json"> (JSON-LD)
    const jsonLD = document.querySelector('script[type="application/ld+json"]');
    if (jsonLD) {
      try {
        const jsonData = JSON.parse(jsonLD.textContent);
        if (jsonData.author) {
          // Handle cases where the author is an object, e.g., { name: "John Doe", url: "..." }
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

    // 6. Try JavaScript embedded variables (window.pageData or similar)
    if (!author || !date) {
      if (window.pageData) {
        author = window.pageData.author;
        date = window.pageData.publishedDate;
      }
    }

    // 7. Try custom data attributes
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

    // Send metadata to the background script
    chrome.runtime.sendMessage({
      type: "metadata",
      title: document.title,
      url: window.location.href,
      author,
      date,
    });
  } catch (error) {
    console.error("Error extracting metadata:", error);
    chrome.runtime.sendMessage({
      type: "metadata",
      title: document.title,
      url: window.location.href,
      author: "Unknown",
      date: "Unknown",
    });
  }
})();
