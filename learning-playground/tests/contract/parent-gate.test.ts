/**
 * Contract tests: local parent gate behavior.
 */

import { describe, expect, test } from 'vitest';
import {
  DEFAULT_PARENT_GATE_PHRASE,
  createParentGateState,
  getParentGatePhrase,
  isParentGateAnswerCorrect,
  shouldRequireParentGate,
  unlockParentGate,
} from '../../src/core/parent-gate';

describe('parent gate contract', () => {
  test('requires the local challenge before rendering the parent route', () => {
    const state = createParentGateState();

    expect(shouldRequireParentGate({
      routeView: 'parent',
      settings: { parent_gate_enabled: true },
      state,
    })).toBe(true);
  });

  test('does not gate child routes or disabled parent gates', () => {
    const state = createParentGateState();

    expect(shouldRequireParentGate({
      routeView: 'home',
      settings: { parent_gate_enabled: true },
      state,
    })).toBe(false);
    expect(shouldRequireParentGate({
      routeView: 'activity',
      settings: { parent_gate_enabled: true },
      state,
    })).toBe(false);
    expect(shouldRequireParentGate({
      routeView: 'parent',
      settings: { parent_gate_enabled: false },
      state,
    })).toBe(false);
  });

  test('accepts the local parent challenge without remote state', () => {
    expect(isParentGateAnswerCorrect('parent')).toBe(true);
    expect(isParentGateAnswerCorrect(' PARENT ')).toBe(true);
    expect(isParentGateAnswerCorrect('child')).toBe(false);
  });

  test('applies a configured local parent gate phrase', () => {
    expect(getParentGatePhrase({
      parent_gate_phrase: 'Moon 7',
    })).toBe('Moon 7');
    expect(isParentGateAnswerCorrect(' moon 7 ', 'Moon 7')).toBe(true);
    expect(isParentGateAnswerCorrect('parent', 'Moon 7')).toBe(false);
  });

  test('falls back to the default phrase when the saved phrase is blank', () => {
    expect(getParentGatePhrase({
      parent_gate_phrase: '   ',
    })).toBe(DEFAULT_PARENT_GATE_PHRASE);
    expect(isParentGateAnswerCorrect('parent', '   ')).toBe(true);
  });

  test('unlock is transient session state only', () => {
    const state = createParentGateState();
    unlockParentGate(state);

    expect(shouldRequireParentGate({
      routeView: 'parent',
      settings: { parent_gate_enabled: true },
      state,
    })).toBe(false);
    expect(shouldRequireParentGate({
      routeView: 'parent',
      settings: { parent_gate_enabled: true },
      state: createParentGateState(),
    })).toBe(true);
  });
});
