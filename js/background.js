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


chrome.contextMenus.onClicked.addListener(function(info, tab)
{
  var bib_id, gen_div, tab_info, gen_bib, al_bib, del_div;

  if (!tab)
    return;

  // create a temporary div for the clipboard
  bib_id = "bibtex_" + Math.random().toString(36).replace(/[^a-z]+/g, '');

  gen_div = [
    'var d = document.createElement("textarea");',
    'd.setAttribute("style", "' +
    'width: 1px; '              +
    'height: 1px; '             +
    'position: fixed; '         +
    'top: -11px; '              +
    'left: -33px;");',
    'd.id = "' + bib_id + '";',
    'document.body.appendChild(d);'
    ].join("\n");

  tab_info = "var tab_info= {title:'"   +
              tab.title                 +
              "',url:'"                 +
              tab.url                   +
              "',bib_format:'"          +
              localStorage["format_bx"] +
              "',date_format:'"         +
              localStorage["date_sel"]  +
              "',omit_empty:'"          +
              localStorage["empty_bx"]  +
              "',incl_acc:'"            +
              localStorage["acc_bx"]    +
              "'};";

  gen_bib = "generateBibTeXEntry(tab_info.title," +
            "tab_info.url, tab_info.bib_format, tab_info.date_format," +
            "tab_info.omit_empty, tab_info.incl_acc)";
  copy_bib = 'copyToClipboard(' + gen_bib + ', "' + bib_id + '");';
  del_div = 'var div = document.getElementById("' + bib_id + '");\n' +
             'div.parentNode.removeChild(div)';

  chrome.tabs.executeScript(tab.id, { file: "js/bibtex.js" }, function(){
    chrome.tabs.executeScript(tab.id, { code: gen_div }, function(){
      chrome.tabs.executeScript(tab.id, { code: tab_info }, function(){
        chrome.tabs.executeScript(tab.id, { code: copy_bib }, function(){
          setTimeout(chrome.tabs.executeScript(tab.id, {code: del_div}), 1000);
        });
      });
    });
  });
});

chrome.runtime.onInstalled.addListener(function() {
  chrome.contextMenus.create(
    {
      id: "bibtex",
      title: "Copy BibTeX to clipboard",
      contexts: ["all"]
    });
});
