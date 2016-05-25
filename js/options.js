var defaultFormat = "US-1";
function loadOpt() {
    var dateFormat = localStorage["date_sel"];

    //http://en.wikipedia.org/wiki/date_sel_by_country
    if (!dateFormat ||
            (dateFormat != "L-1" && dateFormat != "L-2" &&
             dateFormat != "M-1" && dateFormat != "M-2" &&
             dateFormat != "B-1" && dateFormat != "B-2" &&
             dateFormat != "L-3" && dateFormat != "M-3" &&
             dateFormat != "B-3" && dateFormat != "O-1" )) {
        dateFormat = defaultFormat;
    }

    var select = document.getElementById("date_sel");
    for (var i = 0; i < select.children.length; i++) {
        var child = select.children[i];
        if (child.value == dateFormat) {
            child.selected = "true";
            break;
        }
    }

    var omitEmpty = localStorage["empty_bx"]
    if (!omitEmpty || (omitEmpty != "true" && omitEmpty != "false")) {
        omitEmpty = "false";
        localStorage.setItem("empty_bx", "false");
    }

    var online = localStorage["format_bx"]
    if (!online || (online != "true" && online != "false")) {
        online = "false";
        localStorage.setItem("format_bx", "false");
    }

    var incl_acc = localStorage["acc_bx"]
    if (!incl_acc || (incl_acc != "true" && incl_acc != "false")) {
        incl_acc = "true";
        localStorage.setItem("acc_bx", "true");
    }

    document
        .getElementById("empty_bx")
        .checked = (localStorage.getItem("empty_bx") == "true");

    document
        .getElementById("format_bx")
        .checked = (localStorage.getItem("format_bx") == "true");

    document
        .getElementById("acc_bx")
        .checked = (localStorage.getItem("acc_bx") == "true");
}

function saveEmpty() {
    if (document.getElementById("empty_bx").checked)
        localStorage.setItem("empty_bx", "true");
    else
        localStorage.setItem("empty_bx", "false");
}

function saveFormat() {
    if (document.getElementById("format_bx").checked)
        localStorage.setItem("format_bx", "true");
    else
        localStorage.setItem("format_bx", "false");
}

function saveAcc() {
    if (document.getElementById("acc_bx").checked)
        localStorage.setItem("acc_bx", "true");
    else
        localStorage.setItem("acc_bx", "false");
}

function saveDate() {
    var select = document.getElementById("date_sel");
    var format = select.children[select.selectedIndex].value;
    localStorage["date_sel"] = format;
}


document.addEventListener('DOMContentLoaded', loadOpt);
document.getElementById("date_sel").addEventListener("change", saveDate);
document.getElementById("empty_bx").addEventListener("change", saveEmpty);
document.getElementById("format_bx").addEventListener("change", saveFormat);
document.getElementById("acc_bx").addEventListener("change", saveAcc);
