const optionsForm = document.getElementById("optionsForm");
const enableAICheckbox = document.getElementById("enableAI");
const aiWarning = document.getElementById("aiWarning");
const aiStatus = document.getElementById("aiStatus");
const dateFormatSelect = document.getElementById("dateFormat");
const formattingStyleSelect = document.getElementById("formattingStyle");

// Load stored options FIRST, before registering event listeners
const data = await chrome.storage.sync.get("options");
const options = Object.assign({}, data.options);

// Initialize form elements from stored state
optionsForm.includeAccessDate.checked = Boolean(options.includeAccessDate);
optionsForm.omitEmptyFields.checked = Boolean(options.omitEmptyFields);
optionsForm.noInferDate.checked = Boolean(options.noInferDate);
optionsForm.noInferAuthor.checked = Boolean(options.noInferAuthor);
enableAICheckbox.checked = Boolean(options.enableAI);
aiWarning.style.display = options.enableAI ? "block" : "none";
dateFormatSelect.value = (options.dateFormat && options.dateFormat !== "") ? options.dateFormat : "B-2";
formattingStyleSelect.value = (options.formattingStyle && options.formattingStyle !== "") ? options.formattingStyle : "wikipedia";

// Register event listeners AFTER options are loaded — prevents partial-write race
optionsForm.includeAccessDate.addEventListener("change", (event) => {
  options.includeAccessDate = event.target.checked;
  chrome.storage.sync.set({ options });
});
optionsForm.omitEmptyFields.addEventListener("change", (event) => {
  options.omitEmptyFields = event.target.checked;
  chrome.storage.sync.set({ options });
});
optionsForm.noInferDate.addEventListener("change", (event) => {
  options.noInferDate = event.target.checked;
  chrome.storage.sync.set({ options });
});
optionsForm.noInferAuthor.addEventListener("change", (event) => {
  options.noInferAuthor = event.target.checked;
  chrome.storage.sync.set({ options });
});
enableAICheckbox.addEventListener("change", (event) => {
  options.enableAI = event.target.checked;
  chrome.storage.sync.set({ options });
  aiWarning.style.display = event.target.checked ? "block" : "none";
});
dateFormatSelect.addEventListener("change", (event) => {
  options.dateFormat = event.target.value;
  chrome.storage.sync.set({ options });
});
formattingStyleSelect.addEventListener("change", (event) => {
  options.formattingStyle = event.target.value;
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
