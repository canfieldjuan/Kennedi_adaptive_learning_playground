import { describe, expect, test } from 'vitest';
// @ts-expect-error The repository-owned Node CLI is intentionally plain JavaScript.
import * as confirmation from '../../scripts/pr-merge-confirmation.mjs';
// @ts-expect-error The repository-owned Node CLI is intentionally plain JavaScript.
import { parseReadinessProof } from '../../scripts/pr-attention.mjs';

const { decideConfirmation, parseCliArgs, runCli } = confirmation;
const HEAD = '1111111111111111111111111111111111111111';
const BASE = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const INPUT = {
  wakeSource: 'scheduled',
  repository: 'canfieldjuan/Kennedi_adaptive_learning_playground',
  prNumber: 71,
  expectedHead: HEAD,
};

describe('scheduled merge confirmation', () => {
  test('a complete ready proof reports guarded readiness without merge authority', () => {
    const decision = decideConfirmation(INPUT, parsed(proof()));

    expect(decision).toMatchObject({
      decision: 'ready',
      next_state: 'scheduled_confirmation',
      action: 'report_ready',
      expected_head_sha: HEAD,
      ready_for_guarded_merge: true,
      merge_authorized: false,
      reason_codes: ['fresh_readiness_proof_ready'],
    });
  });

  test('a complete non-ready proof returns to waiting', () => {
    const current = pendingProof();
    const decision = decideConfirmation(INPUT, parsed(current));

    expect(decision).toMatchObject({
      decision: 'not_ready',
      next_state: 'waiting',
      action: 'wait',
      ready_for_guarded_merge: false,
      merge_authorized: false,
      reason_codes: ['required_check_not_successful'],
    });
  });

  test('a producer error proof blocks confirmation', () => {
    expect(decideConfirmation(INPUT, parsed(errorProof()))).toMatchObject({
      decision: 'error',
      next_state: 'blocked',
      ready_for_guarded_merge: false,
      merge_authorized: false,
      reason_codes: ['proof_error'],
    });
  });

  test('stable terminal PR state stops before readiness', () => {
    expect(decideConfirmation(INPUT, parsed(terminalProof()))).toMatchObject({
      decision: 'terminal',
      action: 'stop',
      ready_for_guarded_merge: false,
      merge_authorized: false,
    });
  });

  test('proof authority fields cannot grant merge authority', () => {
    const current = { ...proof(), merge_authorized: true, authority: 'scheduled' };

    expect(decideConfirmation(INPUT, parsed(current))).toMatchObject({
      decision: 'ready',
      ready_for_guarded_merge: true,
      merge_authorized: false,
    });
  });

  test('scheduled is the only accepted wake source', () => {
    expect(parseCliArgs(cliArgs())).toEqual(INPUT);
  });

  test.each(['push', 'review', 'comment', 'check']) (
    'rejects the %s event wake source',
    (source) => {
      expect(() => parseCliArgs(cliArgs(source))).toThrowError(
        expect.objectContaining({ code: 'invalid_wake_source' })
      );
    }
  );

  test.each([
    [[]],
    [['--wake-source']],
    [['scheduled']],
    [[...cliArgs(), '--merge-authorized', 'true']],
  ])('rejects unexpected argument shape %j', (argv) => {
    expect(() => parseCliArgs(argv)).toThrowError(
      expect.objectContaining({ code: expect.stringMatching(/^invalid_/) })
    );
  });

  test.each(['repository', 'pull_request', 'expected_head_sha', 'observed_at'] as const)(
    'rejects a proof with mismatched %s ownership evidence',
    async (field) => {
      const current = proof();
      if (field === 'repository') current.repository = 'other/repository';
      else if (field === 'pull_request') current.pull_request = 999;
      else if (field === 'expected_head_sha') current.expected_head_sha = '2'.repeat(40);
      else current.observed_at = 'not-a-time';

      const { exitCode, output } = await invoke(current);
      expect(exitCode).toBe(2);
      expect(output).toMatchObject({
        decision: 'error',
        ready_for_guarded_merge: false,
        merge_authorized: false,
      });
    }
  );

  test('rejects an incomplete proof instead of reporting readiness', async () => {
    const current = proof();
    current.checks.complete = false;
    const { exitCode, output } = await invoke(current);

    expect(exitCode).toBe(2);
    expect(output).toMatchObject({
      decision: 'error',
      ready_for_guarded_merge: false,
      merge_authorized: false,
      error: { code: 'incomplete_proof' },
    });
  });

  test.each(['head', 'base', 'threads', 'merge_state'] as const)(
    'rejects a ready proof with contradictory %s evidence',
    async (boundary) => {
      const current = proof();
      if (boundary === 'head') current.pr.final.headRefOid = '2'.repeat(40);
      else if (boundary === 'base') current.pr.final.baseBranchOid = 'b'.repeat(40);
      else if (boundary === 'threads') {
        current.review_threads.total_count = 1;
        current.review_threads.unresolved_count = 1;
        current.review_threads.unresolved_ids = ['THREAD-1'];
      } else {
        current.pr.initial.mergeStateStatus = 'DIRTY';
        current.pr.final.mergeStateStatus = 'DIRTY';
      }

      const { exitCode, output } = await invoke(current);
      expect(exitCode).toBe(2);
      expect(output).toMatchObject({
        decision: 'error',
        ready_for_guarded_merge: false,
        merge_authorized: false,
      });
    }
  );

  test('rejects input larger than 2 MiB', async () => {
    const { exitCode, output } = await invokeText('x'.repeat(2 * 1024 * 1024 + 1));

    expect(exitCode).toBe(2);
    expect(output).toMatchObject({
      decision: 'error',
      merge_authorized: false,
      error: { code: 'input_too_large' },
    });
  });
});

describe('scheduled confirmation CLI exits', () => {
  test.each([
    [proof(), 0, 'ready'],
    [pendingProof(), 1, 'not_ready'],
    [errorProof(), 2, 'error'],
    [terminalProof(), 3, 'terminal'],
  ])('returns exit %i for a %s decision', async (current, exitCode, decision) => {
    const result = await invoke(current);

    expect(result.exitCode).toBe(exitCode);
    expect(result.output).toMatchObject({
      decision,
      merge_authorized: false,
    });
  });

  test('malformed input returns exit 2 with merge unauthorized', async () => {
    const { exitCode, output } = await invokeText('{');

    expect(exitCode).toBe(2);
    expect(output).toMatchObject({
      decision: 'error',
      ready_for_guarded_merge: false,
      merge_authorized: false,
      error: { code: 'invalid_json' },
    });
  });
});

function parsed(current: ReturnType<typeof proof> | ReturnType<typeof errorProof>) {
  return parseReadinessProof(JSON.stringify(current));
}

async function invoke(current: unknown) {
  return invokeText(JSON.stringify(current));
}

async function invokeText(inputText: string) {
  let text = '';
  const exitCode = await runCli({
    argv: cliArgs(),
    inputText,
    stdout: { write: (chunk: string) => { text += chunk; return true; } },
  });
  return { exitCode, output: JSON.parse(text) };
}

function proof() {
  return {
    schema_version: 1,
    proof_type: 'kennedi.pr-readiness',
    status: 'ready',
    ready: true,
    observed_at: '2026-07-10T20:00:00.000Z',
    repository: INPUT.repository,
    pull_request: INPUT.prNumber,
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

function cliArgs(source = 'scheduled') {
  return [
    '--wake-source', source,
    '--repository', INPUT.repository,
    '--pr', String(INPUT.prNumber),
    '--expected-head', INPUT.expectedHead,
  ];
}

function pendingProof() {
  const current = proof();
  current.status = 'not_ready';
  current.ready = false;
  current.failure_codes = ['required_check_not_successful'];
  current.checks.contexts = [check({
    status: 'IN_PROGRESS',
    conclusion: null,
    successful: false,
  })];
  current.checks.required_results = [required({ result: 'not_successful' })];
  return current;
}

function terminalProof() {
  const current = proof();
  current.status = 'not_ready';
  current.ready = false;
  current.failure_codes = ['pr_not_open'];
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

function pullRequest() {
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

function check(overrides: Partial<{
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
