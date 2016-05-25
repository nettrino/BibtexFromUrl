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

//FIXME replace hardcoded stuff
chrome.tabs.query({'active': true, 'currentWindow': true}, function (tab) {
  if (tab) {
    copyToClipboard(generateBibTeXEntry(tab[0].title,
                                        tab[0].url,
                                        localStorage["format_bx"],
                                        localStorage["date_sel"],
                                        localStorage["empty_bx"],
                                        localStorage["acc_bx"]
                                        ),
                    "clipboardholder");
  } else {
    document.getElementById("result").innerHTML =
      '<span class="error">no active tab</span>';
  }
});
