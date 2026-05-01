// @ts-check
import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.resolve(__dirname, "../..");

const TEST_ARTICLES = [
  {
    name: "Wired",
    url: "https://www.wired.com/story/absolute-best-cyber-monday-deals-2024/",
    expectAuthor: true,
    expectDate: true,
  },
  {
    name: "Quanta Magazine",
    url: "https://www.quantamagazine.org/fish-have-a-brain-microbiome-could-humans-have-one-too-20241202/",
    expectAuthor: true,
    expectDate: true,
  },
  {
    name: "The Verge",
    url: "https://www.theverge.com/2024/11/29/24308950/hyundai-ioniq-5-n-review-price-specs-photos",
    expectAuthor: true,
    expectDate: true,
  },
  {
    name: "PCGamer",
    url: "https://www.pcgamer.com/why-are-game-install-sizes-getting-so-big/",
    expectAuthor: true,
    expectDate: true,
  },
  {
    name: "The Verge (deals)",
    url: "https://www.theverge.com/24309106/best-black-friday-deals-2024-tech-gadgets-cyber-monday",
    expectAuthor: true,
    expectDate: true,
  },
  {
    name: "Wikipedia",
    url: "https://en.wikipedia.org/wiki/BibTeX",
    expectAuthor: false,
    expectDate: false,
  },
  {
    name: "MDN Web Docs",
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
    expectAuthor: false,
    expectDate: false,
  },
  {
    name: "Example Domain",
    url: "https://example.com",
    expectAuthor: false,
    expectDate: false,
  },
];

/**
 * @param {import("playwright").BrowserContext} context
 */
async function getServiceWorker(context) {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent("serviceworker", { timeout: 5000 });
  return sw;
}

async function launchWithExtension() {
  const userDataDir = path.join(__dirname, ".tmp-profile-" + Date.now());
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      "--no-first-run",
      "--disable-default-apps",
      "--disable-component-extensions-with-background-pages",
      "--disable-popup-blocking",
      "--disable-features=IsolateOrigins,site-per-process",
    ],
  });
  return { context, userDataDir };
}

test.describe("Article metadata extraction comparison", () => {
  /** @type {import("playwright").BrowserContext} */
  let context;
  /** @type {string} */
  let userDataDir;
  /** @type {boolean} */
  let aiAvailable = false;

  // Read scripts once to inject via evaluate (bypasses CSP)
  const coreScript = fs.readFileSync(path.join(extensionPath, "core.js"), "utf8");
  const aiScript = fs.readFileSync(path.join(extensionPath, "ai.js"), "utf8");

  /** @type {Array<{name: string, url: string, heuristic: any, ai: any | null, bibtexHeuristic: string, bibtexAI: string | null}>} */
  const results = [];

  test.beforeAll(async () => {
    ({ context, userDataDir } = await launchWithExtension());
    await getServiceWorker(context);
  });

  test.afterAll(async () => {
    // Print comparison report
    console.log("\n" + "=".repeat(80));
    console.log("BIBTEX EXTRACTION COMPARISON: HEURISTIC vs AI");
    console.log("=".repeat(80));

    for (const r of results) {
      console.log(`\n${"─".repeat(80)}`);
      console.log(`SOURCE: ${r.name}`);
      console.log(`URL: ${r.url}`);
      console.log(`\n  HEURISTIC metadata:`);
      console.log(`    author: ${r.heuristic.author || "(none)"}`);
      console.log(`    date:   ${r.heuristic.date || "(none)"}`);
      console.log(`    title:  ${r.heuristic.title}`);
      console.log(`\n  HEURISTIC BibTeX:\n`);
      for (const line of r.bibtexHeuristic.split("\n")) {
        console.log(`    ${line}`);
      }

      if (r.ai) {
        console.log(`\n  AI metadata:`);
        console.log(`    author:          ${r.ai.author || "(none)"}`);
        console.log(`    date:            ${r.ai.date || "(none)"}`);
        console.log(`    publicationType: ${r.ai.publicationType || "(none)"}`);
        console.log(`    abstract:        ${r.ai.abstract || "(none)"}`);
        console.log(`    citationKey:     ${r.ai.citationKey || "(none)"}`);
        console.log(`\n  AI-ENHANCED BibTeX:\n`);
        for (const line of (r.bibtexAI || "").split("\n")) {
          console.log(`    ${line}`);
        }
      } else {
        console.log(`\n  AI: not available`);
      }
    }

    console.log(`\n${"=".repeat(80)}`);
    console.log(`AI available: ${aiAvailable}`);
    console.log(`Articles tested: ${results.length}`);
    const heuristicAuthors = results.filter((r) => r.heuristic.author).length;
    const heuristicDates = results.filter((r) => r.heuristic.date).length;
    const aiAuthors = results.filter((r) => r.ai?.author).length;
    const aiDates = results.filter((r) => r.ai?.date).length;
    console.log(`Heuristic found author: ${heuristicAuthors}/${results.length}`);
    console.log(`Heuristic found date:   ${heuristicDates}/${results.length}`);
    if (aiAvailable) {
      console.log(`AI found author:        ${aiAuthors}/${results.length}`);
      console.log(`AI found date:          ${aiDates}/${results.length}`);
    }
    console.log("=".repeat(80) + "\n");

    await context.close();
    const { rm } = await import("fs/promises");
    await rm(userDataDir, { recursive: true, force: true });
  });

  for (const article of TEST_ARTICLES) {
    test(`extract metadata from ${article.name}: ${article.url}`, async () => {
      const page = await context.newPage();
      try {
        await page.goto(article.url, { waitUntil: "domcontentloaded", timeout: 15000 });
        // Extra wait for JS-rendered metadata
        await page.waitForTimeout(1000);

        // Inject scripts via evaluate to bypass CSP restrictions
        await page.evaluate(coreScript);
        await page.evaluate(aiScript);

        // Extract heuristic metadata
        const heuristic = await page.evaluate(() => {
          // @ts-ignore
          return BibtexCore.extractHeuristicMetadata(document, window.location.href);
        });

        expect(heuristic.title).toBeTruthy();
        expect(heuristic.url).toBeTruthy();

        // Generate heuristic BibTeX
        const bibtexHeuristic = await page.evaluate((m) => {
          // @ts-ignore
          return BibtexCore.generateBibTeXEntry(
            m.title, m.url, m.author || "", m.date || "",
            "wikipedia", "B-2", false, true, {},
          );
        }, heuristic);

        // Attempt AI extraction
        const aiResult = await page.evaluate(async () => {
          try {
            // @ts-ignore
            const available = await checkAIAvailability();
            if (!available) return { _available: false };

            const pageText = (document.body.textContent || "").substring(0, 2000);
            // @ts-ignore
            const meta = BibtexCore.extractHeuristicMetadata(document, window.location.href);
            // @ts-ignore
            const result = await extractWithAI(pageText, meta);
            return { _available: true, ...result };
          } catch (e) {
            return { _available: false, _error: String(e) };
          }
        });

        if (aiResult._available) {
          aiAvailable = true;
        }

        const ai = aiResult._available ? aiResult : null;

        // Generate AI-enhanced BibTeX if AI was available
        let bibtexAI = null;
        if (ai) {
          bibtexAI = await page.evaluate((args) => {
            const [m, aiFields] = args;
            // @ts-ignore
            return BibtexCore.generateBibTeXEntry(
              m.title, m.url,
              m.author || aiFields.author || "",
              m.date || aiFields.date || "",
              "wikipedia", "B-2", false, true,
              {
                publicationType: aiFields.publicationType || null,
                abstract: aiFields.abstract || null,
                citationKey: aiFields.citationKey || null,
              },
            );
          }, [heuristic, ai]);
        }

        results.push({
          name: article.name,
          url: article.url,
          heuristic,
          ai,
          bibtexHeuristic,
          bibtexAI,
        });

        // Assertions after push so report always prints
        if (article.expectAuthor) {
          expect(heuristic.author, `${article.name}: expected author from heuristics`).toBeTruthy();
        }
        if (article.expectDate) {
          expect(heuristic.date, `${article.name}: expected date from heuristics`).toBeTruthy();
        }
        expect(bibtexHeuristic).toContain("@misc{");
        expect(bibtexHeuristic).toMatch(/title\s*=/);
      } finally {
        await page.close();
      }
    });
  }
});
