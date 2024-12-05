const options = {};
const optionsForm = document.getElementById("optionsForm");

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

const dateFormatSelect = document.getElementById("dateFormat");
dateFormatSelect.addEventListener("change", (event) => {
  options.dateFormat = event.target.value;
  chrome.storage.sync.set({ options });
});

const formattingStyleSelect = document.getElementById("formattingStyle");
formattingStyleSelect.addEventListener("change", (event) => {
  options.formattingStyle = event.target.value;
  chrome.storage.sync.set({ options });
});

// Initialize the form with the user's option settings
const data = await chrome.storage.sync.get("options");
Object.assign(options, data.options);

// initialize elements
optionsForm.includeAccessDate.checked = Boolean(options.includeAccessDate);
optionsForm.omitEmptyFields.checked = Boolean(options.omitEmptyFields);
optionsForm.noInferDate.checked = Boolean(options.noInferDate);
optionsForm.noInferAuthor.checked = Boolean(options.noInferAuthor);
if (options.dateFormat && options.dateFormat != "") {
  dateFormatSelect.value = options.dateFormat;
} else {
  dateFormatSelect.value = "B-2";
}
if (options.formattingStyle && options.formattingStyle != "") {
  formattingStyleSelect.value = options.formattingStyle;
} else {
  formattingStyleSelect.value = "wikipedia";
}
