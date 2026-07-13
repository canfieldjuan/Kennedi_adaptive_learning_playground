import { describe, expect, test } from 'vitest';
import ownershipContract from '../../docs/contracts/ownership-completion.contract.md?raw';
import productContract from '../../docs/contracts/product.contract.md?raw';
import rewardContract from '../../docs/contracts/reward.contract.md?raw';
import maturityContract from '../../docs/contracts/game-maturity.contract.md?raw';
import intakeContract from '../../docs/contracts/game-intake.contract.md?raw';

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

describe('ownership completion contract', () => {
  test('makes transformative agency and ownership completion permanent product law', () => {
    expect(ownershipContract).toContain(
      'The child should change the world, not merely answer questions about it.'
    );
    expect(ownershipContract).toContain(
      'Completion should create ownership, not payment.'
    );
    expect(ownershipContract).toContain(
      'The child should finish\nwith something she made, changed, personalized, or placed into the world.'
    );
    expect(productContract).toContain(
      'The child should change the world, not merely answer questions about it.'
    );
    expect(productContract).toContain(
      '`docs/contracts/ownership-completion.contract.md`'
    );
  });

  test('defines a testable completion object with exact-choice continuity', () => {
    expect(ownershipContract).toContain('## Completion Object');
    expect(ownershipContract).toContain('## Exact-Choice Continuity');
    expect(collapseWhitespace(ownershipContract)).toContain(
      'the same completion object produced by play'
    );
    expect(ownershipContract).toContain(
      'An approximate reconstruction is non-compliant'
    );
    expect(ownershipContract).toContain(
      'Can the child revisit it without earning access again?'
    );
  });

  test('keeps every customization rule and the bounded flow', () => {
    for (const rule of [
      'chosen, not randomized',
      'expressive, not scored',
      'available without streaks or currency',
      'connected to what the child created',
      'preserved long enough to admire or revisit',
    ]) {
      expect(ownershipContract).toContain(rule);
    }

    expect(ownershipContract).toContain(
      'one core learning action -> one or two ownership actions -> one payoff'
    );
  });

  test('removes payment mechanics as a substitute for ownership', () => {
    expect(rewardContract).not.toContain(
      'Unlocking a creative sticker after session completion'
    );
    expect(rewardContract).toContain('Ownership Is Not A Reward');
    expect(rewardContract).toContain('Randomized customization access');
    expect(rewardContract).toContain(
      'Currency-gated colors, stickers, or decorations'
    );
    expect(rewardContract).toContain(
      '`docs/contracts/ownership-completion.contract.md`'
    );
  });

  test('gates game maturity and intake without changing evidence truth', () => {
    expect(maturityContract).toContain('## Ownership Completion Standard');
    expect(maturityContract).toContain(
      'a structured completion object containing the exact visible choices'
    );
    expect(collapseWhitespace(maturityContract)).toContain(
      'The existing `ActivityAttemptEvent` remains the evidence source'
    );
    expect(intakeContract).toContain(
      'compatibility with the ownership completion contract'
    );
    expect(intakeContract).toContain(
      '`docs/contracts/ownership-completion.contract.md`'
    );
  });
});
