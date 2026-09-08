// The mark, and the name.
//
// A camera mode dial with the indicator turned away from the green square and
// onto M, which is the one thing this app asks of anybody and the thing it is
// named after. It is drawn rather than photographed so it holds at 24 px in a
// header and at 512 px on a home screen, and it takes its colour from the text
// around it so it works on either theme without a second file.

export const NAME = 'Off Auto';

/** The dial. Inherits colour from its parent, apart from the indicator. */
export const MARK = `<svg viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">
  <path d="M48.58 22.82 A20 20 0 1 1 33.40 14.05" stroke="currentColor" stroke-width="3.6"
        stroke-linecap="round"/>
  <circle cx="42" cy="16.68" r="5" fill="var(--amber, #E8A33D)"/>
  <path d="M22.5 42.5 V26.8 L32 36.2 L41.5 26.8 V42.5" stroke="currentColor" stroke-width="3.6"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

/**
 * Mark and wordmark together. Two lines, because the name is two words that
 * mean opposite things and stacking them is what makes that read.
 *
 * `hero` puts the mark in the rounded tile it wears on a home screen, at the
 * size the first launch wants. The same markup either way, so the small one in
 * the header and the large one on the opening card cannot drift.
 */
export const lockup = (hero = false) => `<div class="brand${hero ? ' brand--hero' : ''}">
  <span class="brand__mark">${MARK}</span>
  <span class="brand__word"><span>OFF</span><span class="brand__auto">AUTO</span></span>
</div>`;

export const LOCKUP = lockup();
