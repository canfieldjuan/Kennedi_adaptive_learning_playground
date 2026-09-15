import * as page01 from './pages/book-2/page-01.mjs';
import * as page02 from './pages/book-2/page-02.mjs';
import * as page03 from './pages/book-2/page-03.mjs';
import * as page04 from './pages/book-2/page-04.mjs';
import * as page05 from './pages/book-2/page-05.mjs';
import * as page06 from './pages/book-2/page-06.mjs';
import * as page07 from './pages/book-2/page-07.mjs';
import * as page08 from './pages/book-2/page-08.mjs';
import * as page09 from './pages/book-2/page-09.mjs';

// Full 26-letter alphabet, 3 letters per page (2 on the final page --
// 26 doesn't divide evenly by 3), in true A-Z order. Matches the
// owner-approved layout mockup ("that looks good"): title "Kennedi's
// Workbook", footer "Alphabet Page N". X and Z were originally built and
// signed off as a standalone validation page (proving the harder letter
// shapes -- crossing diagonals, zigzag -- traced correctly); that
// validation page has since been retired and its two letters re-homed
// into their real alphabetical positions (page-08 with V/W, page-09 with
// Y) now that the full alphabet is built out.
export const pages = [page01, page02, page03, page04, page05, page06, page07, page08, page09];
