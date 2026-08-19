/**
 * Page-level shells. Interior pages (2-6) use pageShell: kicker + title bar,
 * a flexible body, and a page-number footer. The cover (page 1) uses
 * coverShell: no instructions, no footer chrome, just the big reveal.
 */

export function pageShell({ pageNumber, kicker = 'KENNEDI IS THE BOSS', title, body }) {
  return `
<section class="sheet" data-page="${pageNumber}">
  <header class="sheet-header">
    <p class="sheet-kicker">${kicker}</p>
    <h1 class="sheet-title">${title}</h1>
  </header>
  <div class="sheet-body">
    ${body}
  </div>
  <footer class="sheet-footer">
    <span>Kennedi Is the Boss &mdash; Book 1</span>
    <span>Page ${pageNumber}</span>
  </footer>
</section>`;
}

export function coverShell({ body }) {
  return `
<section class="sheet cover-sheet" data-page="1">
  ${body}
</section>`;
}
