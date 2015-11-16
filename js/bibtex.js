/*
<license>
Get BibTeX entry from URL - a Google Chrome extension
Copyright 2013 - 2015 Petsios Theofilos.

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>

Credits to cbenz for his Get-opened-tabs-URLs-Chrome-extension
(https://github.com/cbenz) and to Dang Mai for his LaTeX escaping script
https://github.com/dangmai/escape-latex
</license>
*/

function formatDate(d, format)
{
  var month, day, date;

  month = d.getMonth();
  day   = d.getDate();
  month = month + 1;

  month = month + "";

  if (month.length == 1)
    month = "0" + month;

  day = day + "";

  if (day.length == 1)
    day = "0" + day;

  date   = "";
  switch (format)
  {
  case "M-1":
    date = month + '/' + day + '/' + d.getFullYear();
    break;
  case "M-2":
    date = month + '-' + day + '-' + d.getFullYear();
    break;
  case "M-3":
    date = month + '.' + day + '.' + d.getFullYear();
    break;
  case "L-1":
    date = day + '/' + month + '/' + d.getFullYear();
    break;
  case "L-2":
    date = day + '-' + month + '-' + d.getFullYear();
    break;
  case "L-3":
    date = day + '.' + month + '.' + d.getFullYear();
    break;
  case "B-1":
    date = d.getFullYear() + '/' + month + '/' + day;
    break;
  case "B-2":
    date = d.getFullYear() + '-' + month + '-' + day;
    break;
  case "B-3":
    date = d.getFullYear() + '.' + month + '.' + day;
    break;
  case "O-1":
    date = month + '/' + d.getFullYear();
    break;
  default:
    date = month + '/' + day + '/' + d.getFullYear();
  }

  return date;
}


/*
 * Escape a string to be used in LaTeX documents.
 */
function lescape(str)
{
  var escapes, escapeRegExp, escapeRegExps, escapeKeys, pos, match, regExp;
  var regExpFound = false;

  // Escape code from https://github.com/dangmai/escape-latex Map the
  // characters to escape to their escaped values. The list is derived from
  // http://www.cespedes.org/blog/85/how-to-escape-latex-special-characters
  escapes = {
    '{': '\\{',
    '}': '\\}',
    '\\': '\\textbackslash{}',
    '#': '\\#',
    '$': '\\$',
    '%': '\\%',
    '&': '\\&',
    '^': '\\textasciicircum{}',
    '_': '\\_',
    '~': '\\textasciitilde{}'
  };

  // Escape a string to be used in JS regular expression.
  // Code from http://stackoverflow.com/a/6969486
  // @param str the string to be used in a RegExp
  // @return the escaped string, ready to be used for RegExp
  escapeRegExp = function(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
  };

  escapeKeys = Object.keys(escapes); // as it is reused later on
  escapeKeyRegExps = escapeKeys.map(function(key){
    return escapeRegExp(key);
  });
  result = str;

  // Find the character(s) to escape, then break the string up at
  // that/those character(s) and repeat the process recursively.
  // We can't just sequentially replace each character(s), because the result
  // of an earlier step might be escaped again by a later step.
  escapeKeys.forEach(function(key, index)
                     {
                       if (regExpFound)
                       {
                         // This is here to avoid breaking up strings
                         // unnecessarily: In every repetition step, we only
                         // need to find ONE special character(s) to break up
                         // the string; after it is done, there is no need to
                         // look further.
                         return;
                       }
                       pos = str.search(escapeKeyRegExps[index]);
                       match = str.match(escapeKeyRegExps[index]);
                       if (pos !== -1)
                       {
                         result = lescape(str.slice(0, pos)) +
                           escapes[escapeKeys[index]];
                         result += lescape(str.slice(pos + match.length));
                         regExpFound = true;
                       }
                     });

  // Found nothing else to escape
  return result;
}

function generateBibTeXEntry(tabTitle, tabUrl, format)
{
  var abbr, suffix, entry, result;

  abbr = tabTitle.substring(0, 5);
  suffix = Math.floor(Math.random() * 100);
  //create the entry
  entry = "@misc{" + lescape(abbr) + suffix.toString() + ":online,\n";
  entry += "author = {},\n";
  entry += "title = {" + lescape(tabTitle) + "},\n";
  entry += "howpublished = {\\url{" + tabUrl + "}},\n";
  entry += "month = {},\n";
  entry += "year = {},\n";
  entry += "note = {(Visited on ";
  entry += formatDate(new Date(), format) + ")}\n";
  entry += "}";

  return entry;
}

//copy reference to clipboard
function copyToClipboard(entry, clipboard_id) {
  var clipboardholder, result, result_dom;

  clipboardholder = document.getElementById(clipboard_id);
  if (!clipboardholder) {
    console.log("clipboard holder not found");
    return;
  }

  clipboardholder.style.display = "block";
  clipboardholder.value = entry;
  clipboardholder.select();

  result = document.execCommand("Copy");
  result_dom = document.getElementById("result");
  if (result) {
    clipboardholder.style.display = "none";
    if (result_dom)
      result_dom.innerHTML = '<span>copied to clipboard!</span>';
  }
}
