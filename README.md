BibTeX entry from URL
=============

A simple chrome extension that creates a BibTeX entry for the URL in the current
tab. Supports @misc and @online entries.

* Tab's title and URL are automatically copied to be used in your LaTeX
  documents.

* "Accessed on" field (resp. "urldate" for @online entries) is optional

* Author, year and month info need to be filled-in manually, and can optionally
  be omitted.

For http://developer.chrome.com/extensions/packaging.html we get:

    @misc{Packa8:online,
    author = {},
    title = {Packaging - Google Chrome},
    howpublished = {\url{https://developer.chrome.com/extensions/packaging}},
    month = {},
    year = {},
    note = {(Accessed on 06/10/2014)}
    }
