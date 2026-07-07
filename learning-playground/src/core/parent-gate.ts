import type { ParentSettings } from '../types/storage';

export const PARENT_GATE_CHALLENGE = 'PARENT';

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

export function isParentGateAnswerCorrect(answer: string): boolean {
  return normalizeParentGateAnswer(answer) === PARENT_GATE_CHALLENGE;
}

function normalizeParentGateAnswer(answer: string): string {
  return answer.trim().toUpperCase();
}
