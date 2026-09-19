/**
 * Dress-Up Studio route wiring — the `#dress-up` creative-play route parses and
 * navigates like Story Stage, without disturbing the other routes.
 */

import { afterEach, describe, expect, test, vi } from 'vitest';
import { navigate, parseRoute } from '../../src/app/router';

describe('#dress-up route', () => {
  afterEach(() => vi.unstubAllGlobals());

  test('parses #dress-up to the dress-up view', () => {
    vi.stubGlobal('window', { location: { hash: '#dress-up' }, addEventListener: vi.fn() });
    expect(parseRoute()).toEqual({ view: 'dress-up' });
  });

  test('navigate sets the #dress-up hash', () => {
    const win = { location: { hash: '' }, addEventListener: vi.fn() };
    vi.stubGlobal('window', win);
    navigate({ view: 'dress-up' });
    expect(win.location.hash).toBe('#dress-up');
  });

  test('other routes are unaffected', () => {
    vi.stubGlobal('window', { location: { hash: '#story-stage' }, addEventListener: vi.fn() });
    expect(parseRoute()).toEqual({ view: 'story-stage' });
    vi.stubGlobal('window', { location: { hash: '' }, addEventListener: vi.fn() });
    expect(parseRoute()).toEqual({ view: 'home' });
  });
});
