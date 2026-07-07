import type { ParentSettings } from '../types/storage';

export const DEFAULT_PARENT_GATE_PHRASE = 'PARENT';
export const PARENT_GATE_CHALLENGE = DEFAULT_PARENT_GATE_PHRASE;

export interface ParentGateState {
  unlocked: boolean;
}

export function createParentGateState(): ParentGateState {
  return {
    unlocked: false,
  };
}

export function unlockParentGate(state: ParentGateState): ParentGateState {
  state.unlocked = true;
  return state;
}

export function shouldRequireParentGate(params: {
  routeView: string;
  settings: Pick<ParentSettings, 'parent_gate_enabled'>;
  state: ParentGateState;
}): boolean {
  return (
    params.routeView === 'parent' &&
    params.settings.parent_gate_enabled &&
    !params.state.unlocked
  );
}

export function getParentGatePhrase(
  settings: Pick<ParentSettings, 'parent_gate_phrase'>
): string {
  return resolveParentGatePhrase(settings.parent_gate_phrase);
}

export function isParentGateAnswerCorrect(
  answer: string,
  phrase = DEFAULT_PARENT_GATE_PHRASE
): boolean {
  return (
    normalizeParentGateAnswer(answer) ===
    normalizeParentGateAnswer(resolveParentGatePhrase(phrase))
  );
}

function resolveParentGatePhrase(phrase: string): string {
  const trimmedPhrase = phrase.trim();
  return trimmedPhrase.length > 0
    ? trimmedPhrase
    : DEFAULT_PARENT_GATE_PHRASE;
}

function normalizeParentGateAnswer(answer: string): string {
  return answer.trim().toUpperCase();
}
