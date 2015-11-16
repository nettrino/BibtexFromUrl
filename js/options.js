var defaultFormat = "US-1";
function loadOpt() {
    var dateFormat = localStorage["date.format"];

    //http://en.wikipedia.org/wiki/Date_format_by_country
    if (!dateFormat ||
            (dateFormat != "L-1" && dateFormat != "L-2" &&
             dateFormat != "M-1" && dateFormat != "M-2" &&
             dateFormat != "B-1" && dateFormat != "B-2" &&
             dateFormat != "L-3" && dateFormat != "M-3" &&
             dateFormat != "B-3" && dateFormat != "O-1" )) {
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
    localStorage["date.format"] = format;
}

function restoreOpt() {
    localStorage.removeItem("date.Format");
    location.reload();
}

document.addEventListener('DOMContentLoaded', loadOpt);
document.getElementById("saveButton").addEventListener("click", saveOpt);
document.getElementById("restoreButton").addEventListener("click", restoreOpt);
