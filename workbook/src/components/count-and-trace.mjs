import { numberGlyph } from './number-glyphs.mjs';

const escapeText = value => String(value).replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

/** One visible correct answer: guided counting/handwriting, not a quiz. */
export function traceAnswer(count) {
  const glyph = numberGlyph(count); // Reject invalid counts before composing any output.
  const width = count < 10 ? 80 : 144;
  return `<svg class="ct-answer-guide" data-answer="${count}" viewBox="0 0 160 140"
    role="img" aria-label="Trace ${count}">
    <path class="ct-top" d="M0 36 H160" fill="none" stroke="#666" stroke-width="1"/>
    <path class="ct-mid" d="M0 72 H160" fill="none" stroke="#666" stroke-width="1" stroke-dasharray="4 5"/>
    <path class="ct-base" d="M0 108 H160" fill="none" stroke="#111" stroke-width="1.5"/>
    <g class="ct-trace" transform="translate(${(160 - width) / 2} 18)" fill="none"
      stroke="#111" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"
      stroke-dasharray="0.01 5.1">${glyph}</g>
  </svg>`;
}

/** The same validated count controls both picture repetitions and the answer. */
export function countAndTrace({ count, animal, plural, svg, choices }) {
  const answer = traceAnswer(count);
  const multipleChoice = choices !== undefined;
  if (multipleChoice && (!Array.isArray(choices) || choices.length !== 3
    || new Set(choices).size !== 3 || !choices.includes(count))) {
    throw new TypeError('Choices must be three distinct numbers with the correct count exactly once.');
  }
  const choiceAnswers = multipleChoice ? Array.from(choices, traceAnswer) : [];
  if (![animal, plural, svg].every(value => typeof value === 'string' && value.trim())) {
    throw new TypeError('A counting group needs an animal name, plural name and SVG.');
  }
  const label = count === 1 ? animal : plural;
  return `<section class="ct-group" data-count="${count}" data-animal="${escapeText(animal)}">
    <h2>Count the ${escapeText(label)}.</h2>
    <div class="ct-group-body">
      <div class="ct-pictures" style="--columns:${Math.min(count, multipleChoice ? 5 : 7)}" role="group" aria-label="${escapeText(label)} to count">
        ${Array.from({ length: count }, () => `<div class="ct-picture">${svg}</div>`).join('')}
      </div>
      ${multipleChoice ? `<div class="ct-answer ct-answer-choices"><p>Circle and trace.</p>
        <div class="ct-choices" role="group" aria-label="Three number choices">
          ${choiceAnswers.map(mark => `<div class="ct-choice">${mark}</div>`).join('')}
        </div></div>` : `<div class="ct-answer"><p>Trace how many.</p>${answer}</div>`}
    </div>
  </section>`;
}
