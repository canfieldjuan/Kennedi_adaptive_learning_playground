import { describe, expect, test } from 'vitest';
// @ts-expect-error The repository-owned Node CLI is intentionally plain JavaScript.
import * as attention from '../../scripts/pr-attention.mjs';

const { decideAttention, parseReadinessProof, parseWakeSource, runCli } = attention;
const HEAD = '1111111111111111111111111111111111111111';
const BASE = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const STALE_BASE = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

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
    const parsed = parseReadinessProof(JSON.stringify(pendingProof()));
    const decision = decideAttention('check', parsed);

    expect(decision).toMatchObject({
      decision: 'waiting',
      action: 'wait',
      ready_for_scheduled_confirmation: false,
      merge_authorized: false,
    });
  });

  test('a pending commit status with coherent state evidence waits', () => {
    const current = pendingProof();
    current.policy.initial.requiredChecks[0].app_id = null;
    current.policy.final.requiredChecks[0].app_id = null;
    current.checks.contexts = [statusContext()];
    current.checks.required_results = [required({ app_id: null, result: 'not_successful' })];
    const parsed = parseReadinessProof(JSON.stringify(current));

    expect(decideAttention('check', parsed)).toMatchObject({
      decision: 'waiting',
      merge_authorized: false,
    });
  });

  test.each(['initial', 'final', 'checks'] as const)(
    'a pending proof with a stale %s head requires attention',
    (sample) => {
      const current = pendingProof();
      const staleHead = '2222222222222222222222222222222222222222';
      if (sample === 'initial') current.pr.initial.headRefOid = staleHead;
      else if (sample === 'final') current.pr.final.headRefOid = staleHead;
      else current.checks.head_sha = staleHead;

      const parsed = parseReadinessProof(JSON.stringify(current));
      expect(decideAttention('check', parsed)).toMatchObject({
        decision: 'attention',
        merge_authorized: false,
      });
    }
  );

  test.each(['metadata', 'policy', 'threads'] as const)(
    'a pending proof with contradictory %s evidence requires attention',
    (evidence) => {
      const current = pendingProof();
      if (evidence === 'metadata') current.pr.metadata_stable = false;
      else if (evidence === 'policy') current.policy.stable = false;
      else {
        current.review_threads.total_count = 1;
        current.review_threads.unresolved_count = 1;
        current.review_threads.unresolved_ids = ['THREAD-1'];
      }

      const parsed = parseReadinessProof(JSON.stringify(current));
      expect(decideAttention('check', parsed)).toMatchObject({
        decision: 'attention',
        merge_authorized: false,
      });
    }
  );

  test.each(['merge_state', 'mergeability', 'review', 'base'] as const)(
    'a pending proof with blocking %s evidence requires attention',
    (evidence) => {
      const current = pendingProof();
      if (evidence === 'merge_state') {
        current.pr.initial.mergeStateStatus = 'DIRTY';
        current.pr.final.mergeStateStatus = 'DIRTY';
      } else if (evidence === 'mergeability') {
        current.pr.initial.mergeable = 'CONFLICTING';
        current.pr.final.mergeable = 'CONFLICTING';
      } else if (evidence === 'review') {
        current.pr.initial.reviewDecision = 'CHANGES_REQUESTED';
        current.pr.final.reviewDecision = 'CHANGES_REQUESTED';
      } else {
        current.pr.initial.baseBranchOid = STALE_BASE;
        current.pr.final.baseBranchOid = STALE_BASE;
      }

      const parsed = parseReadinessProof(JSON.stringify(current));
      expect(decideAttention('check', parsed)).toMatchObject({
        decision: 'attention',
        merge_authorized: false,
      });
    }
  );

  test('a draft-only summary cannot hide a completed failed required check', () => {
    const current = notReadyProof('pr_is_draft');
    current.pr.initial.isDraft = true;
    current.pr.final.isDraft = true;
    current.checks.contexts = [check({ conclusion: 'FAILURE', successful: false })];
    current.checks.required_results = [required({ result: 'not_successful' })];

    const parsed = parseReadinessProof(JSON.stringify(current));
    expect(decideAttention('check', parsed)).toMatchObject({
      decision: 'attention',
      reason_codes: expect.arrayContaining(['required_check_not_successful']),
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

      const parsed = parseReadinessProof(JSON.stringify(current));
      expect(decideAttention('check', parsed)).toMatchObject({
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
    const parsed = parseReadinessProof(JSON.stringify(proof()));
    const decision = decideAttention('check', parsed);

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
      const parsed = parseReadinessProof(JSON.stringify(current));

      expect(decideAttention('review', parsed)).toMatchObject({
        decision: 'terminal',
        action: 'stop',
        merge_authorized: false,
      });
    }
  );

  test('draft state without other failure waits on a check wake', () => {
    const current = notReadyProof('pr_is_draft');
    current.pr.initial.isDraft = true;
    current.pr.final.isDraft = true;
    const parsed = parseReadinessProof(JSON.stringify(current));

    expect(decideAttention('check', parsed)).toMatchObject({
      decision: 'waiting',
      merge_authorized: false,
    });
  });

  test('a draft summary without draft evidence requires attention', () => {
    const parsed = parseReadinessProof(JSON.stringify(notReadyProof('pr_is_draft')));

    expect(decideAttention('check', parsed)).toMatchObject({
      decision: 'attention',
      merge_authorized: false,
    });
  });

  test('an empty required policy is attention rather than a schema error', () => {
    const current = notReadyProof('required_policy_empty');
    current.policy.initial.requiredChecks = [];
    current.policy.final.requiredChecks = [];
    current.checks.contexts = [];
    current.checks.required_results = [];
    const parsed = parseReadinessProof(JSON.stringify(current));

    expect(decideAttention('check', parsed)).toMatchObject({
      decision: 'attention',
      reason_codes: expect.arrayContaining([
        'required_policy_empty',
        'required_policy_missing_quality_gate',
      ]),
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

  test.each(['draft', 'review', 'mergeability', 'merge_state', 'base'] as const)(
    'rejects a ready proof with blocking %s evidence',
    (evidence) => {
      const current = proof();
      if (evidence === 'draft') {
        current.pr.initial.isDraft = true;
        current.pr.final.isDraft = true;
      } else if (evidence === 'review') {
        current.pr.initial.reviewDecision = 'CHANGES_REQUESTED';
        current.pr.final.reviewDecision = 'CHANGES_REQUESTED';
      } else if (evidence === 'mergeability') {
        current.pr.initial.mergeable = 'CONFLICTING';
        current.pr.final.mergeable = 'CONFLICTING';
      } else if (evidence === 'merge_state') {
        current.pr.initial.mergeStateStatus = 'DIRTY';
        current.pr.final.mergeStateStatus = 'DIRTY';
      } else {
        current.pr.initial.baseBranchOid = STALE_BASE;
        current.pr.final.baseBranchOid = STALE_BASE;
      }

      expect(() => parseReadinessProof(JSON.stringify(current))).toThrowError(
        expect.objectContaining({ code: 'contradictory_proof' })
      );
    }
  );

  test('rejects a ready proof whose policy omits quality-gate', () => {
    const current = proof();
    current.policy.initial.requiredChecks = [{ context: 'other-check', app_id: null }];
    current.policy.final.requiredChecks = [{ context: 'other-check', app_id: null }];
    current.checks.contexts = [check({ name: 'other-check', app_id: null })];
    current.checks.required_results = [required({ context: 'other-check', app_id: null })];

    expect(() => parseReadinessProof(JSON.stringify(current))).toThrowError(
      expect.objectContaining({ code: 'contradictory_proof' })
    );
  });

  test.each([
    'classic_protection',
    'applicable_branch_rule_pages',
    'applicable_branch_rules',
    'required_status_check_rules',
  ] as const)('rejects policy sources missing %s', (field) => {
    const current = proof();
    delete (current.policy.initial.sources as Record<string, unknown>)[field];
    delete (current.policy.final.sources as Record<string, unknown>)[field];

    expect(() => parseReadinessProof(JSON.stringify(current))).toThrowError(
      expect.objectContaining({ code: 'invalid_proof' })
    );
  });

  test.each([
    ['page_cap', { applicable_branch_rule_pages: 101 }],
    ['page_fill', { applicable_branch_rule_pages: 1, applicable_branch_rules: 100 }],
    ['rule_floor', { applicable_branch_rule_pages: 2, applicable_branch_rules: 99 }],
    ['required_count', { applicable_branch_rules: 0, required_status_check_rules: 1 }],
  ])('rejects contradictory policy source %s evidence', (_label, overrides) => {
    const current = proof();
    Object.assign(current.policy.initial.sources, overrides);
    Object.assign(current.policy.final.sources, overrides);

    expect(() => parseReadinessProof(JSON.stringify(current))).toThrowError(
      expect.objectContaining({ code: 'contradictory_proof' })
    );
  });

  test('accepts policy source evidence at the producer page/count maxima', () => {
    const current = proof();
    const sources = {
      classic_protection: true,
      applicable_branch_rule_pages: 100,
      applicable_branch_rules: 9_999,
      required_status_check_rules: 9_999,
    };
    current.policy.initial.sources = { ...sources };
    current.policy.final.sources = { ...sources };

    expect(parseReadinessProof(JSON.stringify(current))).toMatchObject({ ready: true });
  });

  test('rejects required-result coverage that omits a policy requirement', () => {
    const current = proof();
    current.policy.initial.requiredChecks.push({ context: 'other-check', app_id: null });
    current.policy.final.requiredChecks.push({ context: 'other-check', app_id: null });

    expect(() => parseReadinessProof(JSON.stringify(current))).toThrowError(
      expect.objectContaining({ code: 'contradictory_proof' })
    );
  });

  test.each(['state', 'reviewDecision', 'mergeable', 'mergeStateStatus'] as const)(
    'rejects an unknown PR %s enum value',
    (field) => {
      const current = proof();
      current.pr.initial[field] = 'BANANA';
      current.pr.final[field] = 'BANANA';

      expect(() => parseReadinessProof(JSON.stringify(current))).toThrowError(
        expect.objectContaining({ code: 'invalid_proof' })
      );
    }
  );

  test.each([null, 'APPROVED', 'REVIEW_REQUIRED'])(
    'accepts legal non-blocking review decision %s',
    (reviewDecision) => {
      const current = proof();
      current.pr.initial.reviewDecision = reviewDecision;
      current.pr.final.reviewDecision = reviewDecision;

      expect(parseReadinessProof(JSON.stringify(current))).toMatchObject({ ready: true });
    }
  );

  test.each([
    ['mergeable', 'CONFLICTING'],
    ['mergeable', 'UNKNOWN'],
    ['mergeStateStatus', 'DIRTY'],
    ['mergeStateStatus', 'UNKNOWN'],
    ['mergeStateStatus', 'BLOCKED'],
    ['mergeStateStatus', 'BEHIND'],
    ['mergeStateStatus', 'UNSTABLE'],
    ['mergeStateStatus', 'HAS_HOOKS'],
  ] as const)('accepts legal blocking PR %s value %s', (field, value) => {
    const current = pendingProof();
    current.pr.initial[field] = value;
    current.pr.final[field] = value;
    const parsed = parseReadinessProof(JSON.stringify(current));

    expect(decideAttention('check', parsed)).toMatchObject({
      decision: 'attention',
      merge_authorized: false,
    });
  });

  test('rejects a ready proof with unresolved threads', () => {
    const current = proof();
    current.review_threads.total_count = 1;
    current.review_threads.unresolved_count = 1;
    current.review_threads.unresolved_ids = ['THREAD-1'];

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

  test.each(['checks', 'review_threads'] as const)(
    'rejects a non-ready proof with incomplete %s evidence',
    (surface) => {
      const current = pendingProof();
      current[surface].complete = false;

      expect(() => parseReadinessProof(JSON.stringify(current))).toThrowError(
        expect.objectContaining({ code: 'incomplete_proof' })
      );
    }
  );

  test.each(['checks', 'review_threads'] as const)(
    'rejects %s page counts beyond the producer cap',
    (surface) => {
      const current = proof();
      current[surface].pages = 101;

      expect(() => parseReadinessProof(JSON.stringify(current))).toThrowError(
        expect.objectContaining({ code: 'invalid_proof' })
      );
    }
  );

  test('accepts the producer page cap and a full final thread page', () => {
    const current = proof();
    current.checks.pages = 100;
    current.review_threads.pages = 100;
    current.review_threads.total_count = 10_000;

    expect(parseReadinessProof(JSON.stringify(current))).toMatchObject({ ready: true });
  });

  test('rejects more check contexts than the reported pages can contain', () => {
    const current = proof();
    current.checks.contexts.push(...Array.from({ length: 100 }, (_, index) => (
      check({ name: `extra-${index}`, app_id: null })
    )));

    expect(() => parseReadinessProof(JSON.stringify(current))).toThrowError(
      expect.objectContaining({ code: 'contradictory_proof' })
    );
  });

  test('accepts check contexts equal to the reported page capacity', () => {
    const current = proof();
    current.checks.contexts.push(...Array.from({ length: 99 }, (_, index) => (
      check({ name: `extra-${index}`, app_id: null })
    )));

    expect(parseReadinessProof(JSON.stringify(current))).toMatchObject({ ready: true });
  });

  test('rejects a successful required result without a matching context', () => {
    const current = proof();
    current.checks.contexts = [];

    expect(() => parseReadinessProof(JSON.stringify(current))).toThrowError(
      expect.objectContaining({ code: 'contradictory_proof' })
    );
  });

  test('rejects a required result whose matched-row count is false', () => {
    const current = proof();
    current.checks.required_results[0].matched_rows = 2;

    expect(() => parseReadinessProof(JSON.stringify(current))).toThrowError(
      expect.objectContaining({ code: 'contradictory_proof' })
    );
  });

  test('rejects a successful required result backed by a pending context', () => {
    const current = proof();
    current.checks.contexts[0] = check({
      status: 'IN_PROGRESS',
      conclusion: null,
      successful: false,
    });

    expect(() => parseReadinessProof(JSON.stringify(current))).toThrowError(
      expect.objectContaining({ code: 'contradictory_proof' })
    );
  });

  test('rejects a pending check-run status paired with a terminal conclusion', () => {
    const current = pendingProof();
    current.checks.contexts[0].conclusion = 'FAILURE';

    expect(() => parseReadinessProof(JSON.stringify(current))).toThrowError(
      expect.objectContaining({ code: 'contradictory_proof' })
    );
  });

  test('rejects a commit status whose conclusion differs from its state', () => {
    const current = pendingProof();
    current.policy.initial.requiredChecks[0].app_id = null;
    current.policy.final.requiredChecks[0].app_id = null;
    current.checks.contexts = [statusContext({ conclusion: 'FAILURE' })];
    current.checks.required_results = [required({ app_id: null, result: 'not_successful' })];

    expect(() => parseReadinessProof(JSON.stringify(current))).toThrowError(
      expect.objectContaining({ code: 'contradictory_proof' })
    );
  });

  test('rejects an app-bound result backed by a same-name different app', () => {
    const current = proof();
    current.checks.contexts[0].app_id = 99999;

    expect(() => parseReadinessProof(JSON.stringify(current))).toThrowError(
      expect.objectContaining({ code: 'contradictory_proof' })
    );
  });

  test('a wildcard required result reconciles every same-name context', () => {
    const current = proof();
    current.checks.contexts.push(check({
      app_id: 99999,
      status: 'IN_PROGRESS',
      conclusion: null,
      successful: false,
    }));
    current.checks.required_results[0].app_id = null;
    current.checks.required_results[0].matched_rows = 2;
    current.policy.initial.requiredChecks[0].app_id = null;
    current.policy.final.requiredChecks[0].app_id = null;

    expect(() => parseReadinessProof(JSON.stringify(current))).toThrowError(
      expect.objectContaining({ code: 'contradictory_proof' })
    );
  });

  test.each(['ids', 'outdated_count', 'total_count'] as const)(
    'rejects contradictory review-thread %s evidence',
    (evidence) => {
      const current = proof();
      if (evidence === 'ids') current.review_threads.unresolved_ids = ['THREAD-1'];
      else if (evidence === 'outdated_count') current.review_threads.outdated_unresolved_count = 1;
      else current.review_threads.total_count = -1;

      expect(() => parseReadinessProof(JSON.stringify(current))).toThrowError(
        expect.objectContaining({ code: 'contradictory_proof' })
      );
    }
  );

  test('rejects a thread total larger than the reported pages can contain', () => {
    const current = proof();
    current.review_threads.pages = 1;
    current.review_threads.total_count = 101;

    expect(() => parseReadinessProof(JSON.stringify(current))).toThrowError(
      expect.objectContaining({ code: 'contradictory_proof' })
    );
  });

  test('accepts a thread total equal to the reported page capacity', () => {
    const current = proof();
    current.review_threads.pages = 1;
    current.review_threads.total_count = 100;

    expect(parseReadinessProof(JSON.stringify(current))).toMatchObject({ ready: true });
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

  test('incomplete pending evidence returns exit 2 with merge unauthorized', async () => {
    const current = pendingProof();
    current.checks.complete = false;
    let output = '';
    const result = await runCli({
      argv: ['--wake-source', 'check'],
      inputText: JSON.stringify(current),
      stdout: { write: (chunk: string) => { output += chunk; return true; } },
    });

    expect(result).toBe(2);
    expect(JSON.parse(output)).toMatchObject({
      decision: 'error',
      merge_authorized: false,
      error: { code: 'incomplete_proof' },
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
      initial: pullRequest(),
      final: pullRequest(),
      metadata_stable: true,
    },
    policy: {
      initial: requiredPolicy(),
      final: requiredPolicy(),
      stable: true,
    },
    checks: {
      complete: true,
      pages: 1,
      head_sha: HEAD,
      contexts: [check()],
      required_results: [required()],
    },
    review_threads: {
      complete: true,
      pages: 1,
      total_count: 0,
      unresolved_count: 0,
      unresolved_ids: [] as string[],
      outdated_unresolved_count: 0,
    },
    failure_codes: [] as string[],
  };
}

function pullRequest(overrides: Partial<{
  headRefOid: string;
  baseRefOid: string;
  baseBranchOid: string;
  baseRefName: string;
  state: string;
  isDraft: boolean;
  reviewDecision: string | null;
  mergeable: string;
  mergeStateStatus: string;
}> = {}) {
  return {
    headRefOid: HEAD,
    baseRefOid: BASE,
    baseBranchOid: BASE,
    baseRefName: 'main',
    state: 'OPEN',
    isDraft: false,
    reviewDecision: null as string | null,
    mergeable: 'MERGEABLE',
    mergeStateStatus: 'CLEAN',
    ...overrides,
  };
}

function requiredPolicy() {
  return {
    sources: {
      classic_protection: true,
      applicable_branch_rule_pages: 1,
      applicable_branch_rules: 0,
      required_status_check_rules: 0,
    },
    requiredChecks: [{ context: 'quality-gate', app_id: 15368 as number | null }],
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

function statusContext(overrides: Partial<{
  name: string;
  status: string;
  conclusion: string;
  successful: boolean;
}> = {}) {
  return {
    type: 'status_context',
    name: 'quality-gate',
    app_id: null,
    status: 'PENDING',
    conclusion: 'PENDING',
    successful: false,
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
