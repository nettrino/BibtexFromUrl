// @ts-check
/// <reference path="./types.js" />
/// <reference path="./chrome.d.ts" />

/** @type {BibtexCoreAPI} */
const optionsCore = BibtexCore;

/** @type {HTMLFormElement} */
const optionsForm = /** @type {HTMLFormElement} */ (document.getElementById("optionsForm"));
/** @type {HTMLInputElement} */
const enableAICheckbox = /** @type {HTMLInputElement} */ (document.getElementById("enableAI"));
/** @type {HTMLElement} */
const aiWarning = /** @type {HTMLElement} */ (document.getElementById("aiWarning"));
/** @type {HTMLElement} */
const aiStatus = /** @type {HTMLElement} */ (document.getElementById("aiStatus"));
/** @type {HTMLSelectElement} */
const dateFormatSelect = /** @type {HTMLSelectElement} */ (document.getElementById("dateFormat"));
/** @type {HTMLSelectElement} */
const formattingStyleSelect = /** @type {HTMLSelectElement} */ (document.getElementById("formattingStyle"));

// Load stored options FIRST, before registering event listeners
const data = await chrome.storage.sync.get("options");
/** @type {Options} */
const options = optionsCore.normalizeOptions(data.options);

// Initialize form elements from stored state
/** @type {HTMLInputElement} */ (optionsForm.elements.namedItem("includeAccessDate")).checked = Boolean(options.includeAccessDate);
/** @type {HTMLInputElement} */ (optionsForm.elements.namedItem("omitEmptyFields")).checked = Boolean(options.omitEmptyFields);
/** @type {HTMLInputElement} */ (optionsForm.elements.namedItem("noInferDate")).checked = Boolean(options.noInferDate);
/** @type {HTMLInputElement} */ (optionsForm.elements.namedItem("noInferAuthor")).checked = Boolean(options.noInferAuthor);
enableAICheckbox.checked = Boolean(options.enableAI);
aiWarning.style.display = options.enableAI ? "block" : "none";
dateFormatSelect.value = options.dateFormat || "B-2";
formattingStyleSelect.value = options.formattingStyle || "wikipedia";

// Register event listeners AFTER options are loaded — prevents partial-write race
/** @type {HTMLInputElement} */ (optionsForm.elements.namedItem("includeAccessDate")).addEventListener("change", (event) => {
  options.includeAccessDate = /** @type {HTMLInputElement} */ (event.target).checked;
  chrome.storage.sync.set({ options });
});
/** @type {HTMLInputElement} */ (optionsForm.elements.namedItem("omitEmptyFields")).addEventListener("change", (event) => {
  options.omitEmptyFields = /** @type {HTMLInputElement} */ (event.target).checked;
  chrome.storage.sync.set({ options });
});
/** @type {HTMLInputElement} */ (optionsForm.elements.namedItem("noInferDate")).addEventListener("change", (event) => {
  options.noInferDate = /** @type {HTMLInputElement} */ (event.target).checked;
  chrome.storage.sync.set({ options });
});
/** @type {HTMLInputElement} */ (optionsForm.elements.namedItem("noInferAuthor")).addEventListener("change", (event) => {
  options.noInferAuthor = /** @type {HTMLInputElement} */ (event.target).checked;
  chrome.storage.sync.set({ options });
});
enableAICheckbox.addEventListener("change", (event) => {
  options.enableAI = /** @type {HTMLInputElement} */ (event.target).checked;
  chrome.storage.sync.set({ options });
  aiWarning.style.display = /** @type {HTMLInputElement} */ (event.target).checked ? "block" : "none";
});
dateFormatSelect.addEventListener("change", (event) => {
  options.dateFormat = /** @type {DateFormatCode} */ (/** @type {HTMLSelectElement} */ (event.target).value);
  chrome.storage.sync.set({ options });
});
formattingStyleSelect.addEventListener("change", (event) => {
  options.formattingStyle = /** @type {FormattingStyle} */ (/** @type {HTMLSelectElement} */ (event.target).value);
  chrome.storage.sync.set({ options });
});

// Check AI availability
(async () => {
  try {
    if (typeof LanguageModel !== "undefined") {
      const availability = await LanguageModel.availability();
      if (availability === "available") {
        aiStatus.textContent = "AI status: Available (Gemini Nano ready)";
        aiStatus.style.color = "#2e7d32";
      } else if (availability === "downloadable") {
        aiStatus.textContent = "AI status: Model needs download (~22GB)";
        aiStatus.style.color = "#e65100";
      } else {
        aiStatus.textContent = "AI status: Not available on this browser";
        aiStatus.style.color = "#c62828";
      }
    } else {
      aiStatus.textContent = "AI status: Not supported (requires Chrome 138+)";
      aiStatus.style.color = "#c62828";
    }
  } catch (e) {
    aiStatus.textContent = "AI status: Detection failed";
    aiStatus.style.color = "#c62828";
  }
})();

export {};
