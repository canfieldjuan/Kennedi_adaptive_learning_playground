import { describe, expect, test } from 'vitest';
// @ts-expect-error The repository-owned Node CLI is intentionally plain JavaScript.
import * as attention from '../../scripts/pr-attention.mjs';

const { decideAttention, parseReadinessProof, parseWakeSource, runCli } = attention;
const HEAD = '1111111111111111111111111111111111111111';

describe('one-shot PR attention decision', () => {
  test.each(['push', 'review', 'comment'])(
    '%s event requires attention even when the proof is ready',
    (wakeSource) => {
      const decision = decideAttention(wakeSource, proof());

      expect(decision).toMatchObject({
        decision: 'attention',
        next_state: 'attention',
        action: 'inspect',
        ready_for_scheduled_confirmation: false,
        merge_authorized: false,
      });
      expect(decision.reason_codes).toContain(`event_${wakeSource}`);
    }
  );

  test('review activity outranks pending checks', () => {
    const decision = decideAttention('review', pendingProof());

    expect(decision.decision).toBe('attention');
    expect(decision.reason_codes).toEqual(expect.arrayContaining([
      'event_review',
      'required_check_not_successful',
    ]));
  });

  test('a check wake with only pending required checks waits', () => {
    const decision = decideAttention('check', pendingProof());

    expect(decision).toMatchObject({
      decision: 'waiting',
      action: 'wait',
      ready_for_scheduled_confirmation: false,
      merge_authorized: false,
    });
  });

  test.each(['FAILURE', 'CANCELLED', 'TIMED_OUT', 'SKIPPED', 'NEUTRAL'])(
    'a check wake with %s requires attention',
    (conclusion) => {
      const current = pendingProof();
      current.checks.contexts[0] = check({
        status: 'COMPLETED',
        conclusion,
        successful: false,
      });

      expect(decideAttention('check', current)).toMatchObject({
        decision: 'attention',
        merge_authorized: false,
      });
    }
  );

  test('a missing required check requires attention', () => {
    const current = notReadyProof('required_check_missing');
    current.checks.contexts = [];
    current.checks.required_results = [required({ result: 'missing', matched_rows: 0 })];

    expect(decideAttention('check', current).decision).toBe('attention');
  });

  test.each([
    'expected_head_mismatch',
    'head_changed',
    'base_not_current',
    'required_policy_changed',
    'review_threads_unresolved',
    'changes_requested',
    'merge_conflict',
    'merge_state_unknown',
  ])('%s contradiction requires attention', (failureCode) => {
    expect(decideAttention('check', notReadyProof(failureCode))).toMatchObject({
      decision: 'attention',
      merge_authorized: false,
    });
  });

  test('an error proof requires attention but never merge authority', () => {
    const decision = decideAttention('check', errorProof());

    expect(decision).toMatchObject({
      decision: 'attention',
      reason_codes: ['proof_error'],
      merge_authorized: false,
    });
  });

  test('a ready check wake reports readiness and waits for scheduled confirmation', () => {
    const decision = decideAttention('check', proof());

    expect(decision).toMatchObject({
      decision: 'waiting',
      next_state: 'waiting',
      action: 'report_ready',
      ready_for_scheduled_confirmation: true,
      merge_authorized: false,
    });
  });

  test.each(['CLOSED', 'MERGED'])(
    '%s PR state is terminal before event attention',
    (state) => {
      const current = notReadyProof('pr_not_open');
      current.pr.initial.state = state;
      current.pr.final.state = state;

      expect(decideAttention('review', current)).toMatchObject({
        decision: 'terminal',
        action: 'stop',
        merge_authorized: false,
      });
    }
  );

  test('draft state without other failure waits on a check wake', () => {
    expect(decideAttention('check', notReadyProof('pr_is_draft'))).toMatchObject({
      decision: 'waiting',
      merge_authorized: false,
    });
  });

  test('unknown failure codes fail closed to attention', () => {
    expect(decideAttention('check', notReadyProof('future_unknown_state'))).toMatchObject({
      decision: 'attention',
      merge_authorized: false,
    });
  });
});

describe('attention input contract', () => {
  test('scheduled is not an accepted event source', () => {
    expect(() => parseWakeSource(['--wake-source', 'scheduled'])).toThrowError(
      expect.objectContaining({ code: 'invalid_wake_source' })
    );
  });

  test('rejects contradictory ready/status fields', () => {
    const current = proof();
    current.status = 'not_ready';

    expect(() => parseReadinessProof(JSON.stringify(current))).toThrowError(
      expect.objectContaining({ code: 'contradictory_proof' })
    );
  });

  test('rejects duplicate failure codes', () => {
    const current = notReadyProof('head_changed');
    current.failure_codes.push('head_changed');

    expect(() => parseReadinessProof(JSON.stringify(current))).toThrowError(
      expect.objectContaining({ code: 'invalid_proof' })
    );
  });

  test('rejects an incomplete ready proof', () => {
    const current = proof();
    delete (current.pr as { final?: unknown }).final;

    expect(() => parseReadinessProof(JSON.stringify(current))).toThrowError(
      expect.objectContaining({ code: 'invalid_proof' })
    );
  });

  test('rejects a ready proof whose sampled head is stale', () => {
    const current = proof();
    current.pr.final.headRefOid = '2222222222222222222222222222222222222222';

    expect(() => parseReadinessProof(JSON.stringify(current))).toThrowError(
      expect.objectContaining({ code: 'contradictory_proof' })
    );
  });

  test('rejects a ready proof with unresolved threads', () => {
    const current = proof();
    current.review_threads.unresolved_count = 1;

    expect(() => parseReadinessProof(JSON.stringify(current))).toThrowError(
      expect.objectContaining({ code: 'contradictory_proof' })
    );
  });

  test('rejects a ready proof without required check results', () => {
    const current = proof();
    current.checks.required_results = [];

    expect(() => parseReadinessProof(JSON.stringify(current))).toThrowError(
      expect.objectContaining({ code: 'contradictory_proof' })
    );
  });

  test('rejects a check context whose success contradicts its state', () => {
    const current = pendingProof();
    current.checks.contexts[0].successful = true;

    expect(() => parseReadinessProof(JSON.stringify(current))).toThrowError(
      expect.objectContaining({ code: 'contradictory_proof' })
    );
  });

  test('rejects input larger than 2 MiB', () => {
    expect(() => parseReadinessProof('x'.repeat(2 * 1024 * 1024 + 1))).toThrowError(
      expect.objectContaining({ code: 'input_too_large' })
    );
  });
});

describe('attention CLI exits', () => {
  test.each([
    ['review', proof(), 0, 'attention'],
    ['check', proof(), 1, 'waiting'],
    ['check', terminalProof(), 3, 'terminal'],
  ])('%s decision returns exit %i', async (wakeSource, current, exitCode, decision) => {
    let output = '';
    const result = await runCli({
      argv: ['--wake-source', wakeSource],
      inputText: JSON.stringify(current),
      stdout: { write: (chunk: string) => { output += chunk; return true; } },
    });

    expect(result).toBe(exitCode);
    expect(JSON.parse(output)).toMatchObject({
      decision,
      merge_authorized: false,
    });
  });

  test('malformed input returns exit 2 with merge unauthorized', async () => {
    let output = '';
    const result = await runCli({
      argv: ['--wake-source', 'check'],
      inputText: '{',
      stdout: { write: (chunk: string) => { output += chunk; return true; } },
    });

    expect(result).toBe(2);
    expect(JSON.parse(output)).toMatchObject({
      decision: 'error',
      merge_authorized: false,
    });
  });
});

function proof() {
  return {
    schema_version: 1,
    proof_type: 'kennedi.pr-readiness',
    status: 'ready',
    ready: true,
    expected_head_sha: HEAD,
    pr: {
      initial: { state: 'OPEN', headRefOid: HEAD },
      final: { state: 'OPEN', headRefOid: HEAD },
      metadata_stable: true,
    },
    policy: { stable: true },
    checks: {
      complete: true,
      head_sha: HEAD,
      contexts: [check()],
      required_results: [required()],
    },
    review_threads: {
      complete: true,
      unresolved_count: 0,
    },
    failure_codes: [] as string[],
  };
}

function notReadyProof(failureCode: string) {
  return {
    ...proof(),
    status: 'not_ready',
    ready: false,
    failure_codes: [failureCode],
  };
}

function pendingProof() {
  const current = notReadyProof('required_check_not_successful');
  current.checks.contexts = [check({
    status: 'IN_PROGRESS',
    conclusion: null,
    successful: false,
  })];
  current.checks.required_results = [required({ result: 'not_successful' })];
  return current;
}

function terminalProof() {
  const current = notReadyProof('pr_not_open');
  current.pr.initial.state = 'MERGED';
  current.pr.final.state = 'MERGED';
  return current;
}

function errorProof() {
  return {
    schema_version: 1,
    proof_type: 'kennedi.pr-readiness',
    status: 'error',
    ready: false,
    failure_codes: ['producer_error'],
  };
}

function check(overrides: Partial<{
  type: string;
  name: string;
  app_id: number | null;
  status: string;
  conclusion: string | null;
  successful: boolean;
}> = {}) {
  return {
    type: 'check_run',
    name: 'quality-gate',
    app_id: 15368,
    status: 'COMPLETED',
    conclusion: 'SUCCESS' as string | null,
    successful: true,
    ...overrides,
  };
}

function required(overrides: Partial<{
  context: string;
  app_id: number | null;
  result: string;
  matched_rows: number;
}> = {}) {
  return {
    context: 'quality-gate',
    app_id: 15368,
    result: 'success',
    matched_rows: 1,
    ...overrides,
  };
}
