# Third-Party Notices

## ECDICT

The generated adult vocabulary data in `js/adult-words.js` is derived from
[ECDICT](https://github.com/skywind3000/ECDICT), a free English-to-Chinese
dictionary distributed under the MIT License.

- Source file: `ecdict.csv`
- Source SHA-256: `1a6947e04785db63613a92e14903cdae7954f7e84860b10e68e5c7cbb3f9c3cf`
- Transform: keep learnable headwords carrying the CET4, CET6 and `ky`
  (postgraduate entrance exam) tags;
  select 1,800 entries using ECDICT's contemporary frequency rank for the
  daily-life route;
  merge duplicate English headwords and shorten Chinese meanings for flashcards.

### MIT License

Copyright (c) 2025 Linwei

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## SUBTLEX-UK

The adult-vocabulary audit uses dominant part-of-speech counts from
[SUBTLEX-UK](https://psychology.nottingham.ac.uk/subtlex-uk/), described in
van Heuven, Mandera, Keuleers and Brysbaert (2014),
“SUBTLEX-UK: A new and improved word frequency database for British English”.
The original SUBTLEX-UK data file is not redistributed in this repository;
only the audit status and the small set of evidence fields used to review this
project's vocabulary entries are recorded.
