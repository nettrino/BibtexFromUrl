/*
<license>
Get BibTeX entry from URL - a Google Chrome extension
Copyright 2013 Petsios Theofilos.

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
(https://github.com/cbenz)
</license>
*/

function formatDate(d)
{
    var month = d.getMonth();
    var day = d.getDate();
    month = month + 1;

    month = month + "";

    if (month.length == 1) {
        month = "0" + month;
    }

    day = day + "";

    if (day.length == 1) {
        day = "0" + day;
    }

    return month + '/' + day + '/' + d.getFullYear();
}

function generateBibTeXEntry(tab) {
	//create abbreviation
	var abbr =  tab.title.substring(0,5);
	var suffix = Math.floor(Math.random() * 9);
	//create the entry
	var entry = "@misc{" + abbr + suffix.toString() + ":Online,\n";
	entry += "author = {},\n";
	entry += "title = {" + tab.title + "},\n";
	entry += "howpublished = {\\url{" + tab.url + "}},\n";
	entry += "note = {(Visited on " + formatDate(new Date())+ ")}\n";
	entry += "}";

	//copy reference to clipboard
	clipboardholder= document.getElementById("clipboardholder");
	clipboardholder.style.display = "block";
	clipboardholder.value = entry;
	clipboardholder.select();

	var result = document.execCommand("Copy");
	if (result) {
		clipboardholder.style.display = "none";
		document.getElementById("result").innerHTML = 
			'<span>copied to clipboard!</span>';
	} else{
		document.getElementById("result").innerHTML = 
			'<span class="error">error copying to clipboard</span>';
	};
	
}


chrome.tabs.query({'active': true, 'currentWindow': true}, function (tab) {
	if (tab) {
		generateBibTeXEntry(tab[0]);
	} else{
		document.getElementById("result").innerHTML =
			'<span class="error">no active tab</span>';
	};	
});


