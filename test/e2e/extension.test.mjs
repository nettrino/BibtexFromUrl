// @ts-check
import { test, expect } from "@playwright/test";
import path from "path";
import { chromium } from "playwright";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.resolve(__dirname, "../..");

/** @param {import("playwright").BrowserContext} context */
async function getServiceWorker(context) {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent("serviceworker", { timeout: 5000 });
  return sw;
}

/** @param {import("playwright").BrowserContext} context */
async function getExtensionId(context) {
  const sw = await getServiceWorker(context);
  const url = sw.url();
  const match = url.match(/chrome-extension:\/\/([^/]+)/);
  if (!match) throw new Error("Could not extract extension ID from " + url);
  return match[1];
}

/**
 * Launch a fresh browser context with the extension loaded.
 * Playwright needs a persistent context + headed mode for MV3 extensions.
 */
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
    ],
  });
  return { context, userDataDir };
}

test.describe("BibTeX from URL extension", () => {
  /** @type {import("playwright").BrowserContext} */
  let context;
  /** @type {string} */
  let userDataDir;
  /** @type {string} */
  let extensionId;

  test.beforeAll(async () => {
    ({ context, userDataDir } = await launchWithExtension());
    extensionId = await getExtensionId(context);
  });

  test.afterAll(async () => {
    await context.close();
    const { rm } = await import("fs/promises");
    await rm(userDataDir, { recursive: true, force: true });
  });

  test("service worker loads without errors", async () => {
    const sw = await getServiceWorker(context);
    expect(sw.url()).toContain("background.js");
  });

  test("options page renders", async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await expect(page.locator("body")).not.toBeEmpty();
    await page.close();
  });

  test("metadata extraction works on a real page", async () => {
    const page = await context.newPage();
    await page.goto("https://example.com");
    await page.waitForLoadState("domcontentloaded");

    // Load core.js in the page and run extractHeuristicMetadata directly
    await page.addScriptTag({ path: path.join(extensionPath, "core.js") });

    const meta = await page.evaluate(() => {
      // @ts-ignore — injected by core.js
      return BibtexCore.extractHeuristicMetadata(document, window.location.href);
    });

    expect(meta.title).toBe("Example Domain");
    expect(meta.url).toContain("example.com");

    // Verify BibTeX generation with extracted metadata
    const bibtex = await page.evaluate((m) => {
      // @ts-ignore
      return BibtexCore.generateBibTeXEntry(
        m.title, m.url, m.author || "", m.date || "",
        "wikipedia", "B-2", false, true, {},
      );
    }, meta);

    expect(bibtex).toContain("@misc{");
    expect(bibtex).toContain("Example Domain");
    expect(bibtex).toContain("example.com");

    await page.close();
  });

  test("rapid clicks do not cause duplicate offscreen document error", async () => {
    const page = await context.newPage();
    await page.goto("https://example.com");
    await page.waitForLoadState("domcontentloaded");

    const errors = /** @type {string[]} */ ([]);
    const sw = await getServiceWorker(context);

    // Listen for console errors on the page
    page.on("pageerror", (err) => errors.push(err.message));

    // Simulate 3 rapid extension clicks
    for (let i = 0; i < 3; i++) {
      const rid = `rapid-${i}-${Date.now()}`;
      await page.evaluate((r) => {
        /** @type {any} */ (globalThis).__bibtexRequestId = r;
      }, rid);
      // Don't await between — fire them rapidly
      page.addScriptTag({ path: path.join(extensionPath, "core.js") }).catch(() => {});
      page.addScriptTag({ path: path.join(extensionPath, "ai.js") }).catch(() => {});
      page.addScriptTag({ path: path.join(extensionPath, "content.js") }).catch(() => {});
    }

    await page.waitForTimeout(3000);

    const offscreenErrors = errors.filter((e) =>
      e.includes("offscreen document"),
    );
    expect(offscreenErrors).toHaveLength(0);

    await page.close();
  });
});
