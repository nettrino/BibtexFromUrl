var defaultFormat = "US-1";
function loadOpt() {
    var dateFormat = localStorage["dateFormat"];

    // valid colors are red, blue, green and yellow
    if (dateFormat == undefined ||
            (dateFormat != "US-1" && dateFormat != "US-2" &&
             dateFormat != "EU-1" && dateFormat != "EU-2")) {
        dateFormat = defaultFormat;
    }

    var select = document.getElementById("dateFormat");
    for (var i = 0; i < select.children.length; i++) {
        var child = select.children[i];
        if (child.value == dateFormat) {
            child.selected = "true";
            break;
        }
    }
}

function saveOpt() {
    var select = document.getElementById("dateFormat");
    var format = select.children[select.selectedIndex].value;
    alert("Saved!");
    localStorage["dateFormat"] = format;
}

function restoreOpt() {
    localStorage.removeItem("dateFormat");
    location.reload();
}

document.addEventListener('DOMContentLoaded', loadOpt);
document.getElementById("saveButton").addEventListener("click", saveOpt);
document.getElementById("restoreButton").addEventListener("click", restoreOpt);
