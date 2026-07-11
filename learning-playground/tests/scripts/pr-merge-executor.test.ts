import { describe, expect, test } from 'vitest';
// @ts-expect-error repository-owned plain JavaScript CLI.
import * as executor from '../../scripts/pr-merge-executor.mjs';

const { executeGuardedMerge, parseAuthorizationRecord, parseCliArgs } = executor;
const HEAD = '1'.repeat(40);
const MERGE = '2'.repeat(40);
const INPUT = {
  wakeSource: 'scheduled', repository: 'canfieldjuan/Kennedi_adaptive_learning_playground',
  prNumber: 75, expectedHead: HEAD, branch: 'codex/merge', worktree: '/work',
  authorizationFile: '/state/session.md',
};

describe('active-builder guarded merge executor', () => {
  test('executes one exact-head merge and verifies its receipt', async () => {
    const harness = runner();
    const receipt = await executeGuardedMerge(INPUT, authority(), {
      run: harness.run, cwd: '/work', canonicalize: (value: string) => value, scriptDir: '/scripts',
    });

    expect(receipt).toMatchObject({ merge_performed: true, merge_commit_sha: MERGE });
    const merge = harness.calls.find(({ file, args }) => file === 'gh' && args[1] === 'merge');
    expect(merge?.args).toEqual([
      'pr', 'merge', '75', '--repo', INPUT.repository,
      '--merge', '--match-head-commit', HEAD,
    ]);
    expect(merge?.args).not.toContain('--admin');
    expect(merge?.options).not.toHaveProperty('shell', true);
  });

  test.each([
    ['Status', 'waiting'], ['Repository', 'other/repo'], ['PR', '76'],
    ['Branch', 'other'], ['Worktree', '/other'], ['Expected head SHA', '3'.repeat(40)],
    ['Allowed actions', 'inspect | update'], ['Merge authorization', 'none'],
    ['Authorization source', 'none'],
  ])('rejects mismatched authority field %s', (field, value) => {
    expect(() => parseAuthorizationRecord(authority({ [field]: value }), INPUT)).toThrowError(
      expect.objectContaining({ code: 'authority_mismatch' })
    );
  });

  test('rejects duplicated authority fields', () => {
    expect(() => parseAuthorizationRecord(`${authority()}\nPR: 75`, INPUT)).toThrowError(
      expect.objectContaining({ code: 'authority_shape' })
    );
  });

  test('rejects an oversized authority record', () => {
    expect(() => parseAuthorizationRecord('x'.repeat(64 * 1024 + 1), INPUT)).toThrowError(
      expect.objectContaining({ code: 'authority_size' })
    );
  });

  test.each(['push', 'review', 'comment', 'check'])('rejects %s wake authority', (source) => {
    expect(() => parseCliArgs(cliArgs(source))).toThrowError();
  });

  test('rejects an authority flag on the command line', () => {
    expect(() => parseCliArgs([...cliArgs(), '--merge-authorized', 'true'])).toThrowError();
  });

  test.each([
    ['dirty worktree', { status: ' M file' }, 'worktree_dirty'],
    ['wrong root', { root: '/other' }, 'worktree_mismatch'],
    ['wrong branch', { branch: 'other' }, 'branch_mismatch'],
    ['wrong head', { head: '3'.repeat(40) }, 'head_mismatch'],
  ])('blocks before merge for %s', async (_name, overrides, code) => {
    const harness = runner(overrides);
    await expect(execute(harness)).rejects.toMatchObject({ code });
    expect(harness.calls.some(({ file }) => file === 'gh')).toBe(false);
  });

  test('rechecks local state immediately before merge', async () => {
    const harness = runner({ statusSequence: ['', ' M changed'] });
    await expect(execute(harness)).rejects.toMatchObject({ code: 'worktree_dirty' });
    expect(harness.calls.some(({ file, args }) => file === 'gh' && args[1] === 'merge')).toBe(false);
  });

  test.each([
    ['producer failure', { producerFails: true }, 'readiness_failed'],
    ['non-ready proof', { proof: pendingProof() }, 'readiness_failed'],
    ['malformed proof', { proofText: '{' }, 'invalid_json'],
  ])('fails closed for %s', async (_name, overrides, code) => {
    const harness = runner(overrides);
    await expect(execute(harness)).rejects.toMatchObject({ code });
    expect(harness.calls.some(({ file, args }) => file === 'gh' && args[1] === 'merge')).toBe(false);
  });

  test('does not claim success when the merge command fails', async () => {
    const harness = runner({ mergeFails: true });
    await expect(execute(harness)).rejects.toMatchObject({
      code: 'merge_outcome_unknown', mergeOutcome: 'unknown',
    });
  });

  test('rejects an invalid post-merge receipt', async () => {
    const harness = runner({ receipt: { state: 'OPEN' } });
    await expect(execute(harness)).rejects.toMatchObject({
      code: 'merge_outcome_unknown', mergeOutcome: 'unknown',
    });
  });
});

function execute(harness: ReturnType<typeof runner>) {
  return executeGuardedMerge(INPUT, authority(), {
    run: harness.run, cwd: '/work', canonicalize: (value: string) => value, scriptDir: '/scripts',
  });
}

function runner(overrides: Record<string, unknown> = {}) {
  const calls: Array<{ file: string; args: string[]; options: Record<string, unknown> }> = [];
  let statusReads = 0;
  const run = async (file: string, args: string[], options: Record<string, unknown>) => {
    calls.push({ file, args, options });
    if (file === 'git') {
      if (args[0] === 'status') {
        const sequence = overrides.statusSequence as string[] | undefined;
        return result(sequence?.[statusReads++] ?? String(overrides.status ?? ''));
      }
      if (args.includes('--show-toplevel')) return result(String(overrides.root ?? '/work'));
      if (args.includes('--show-current')) return result(String(overrides.branch ?? INPUT.branch));
      return result(String(overrides.head ?? HEAD));
    }
    if (args[0]?.endsWith('/pr-readiness.mjs')) {
      if (overrides.producerFails || overrides.proof && (overrides.proof as any).ready === false) {
        throw new Error('producer exit');
      }
      return result(String(overrides.proofText ?? JSON.stringify(overrides.proof ?? proof())));
    }
    if (file === 'gh' && args[1] === 'merge') {
      if (overrides.mergeFails) throw new Error('merge failed');
      return result('');
    }
    return result(JSON.stringify(overrides.receipt ?? {
      state: 'MERGED', headRefOid: HEAD, mergeCommit: { oid: MERGE },
      mergedAt: '2026-07-11T00:00:00Z', url: 'https://github.com/example/pr/75',
    }));
  };
  return { calls, run };
}

function result(stdout: string) { return { stdout, stderr: '' }; }
function cliArgs(source = 'scheduled') {
  return ['--wake-source', source, '--repository', INPUT.repository, '--pr', '75',
    '--expected-head', HEAD, '--branch', INPUT.branch, '--worktree', '/work',
    '--authorization-file', '/state/session.md'];
}
function authority(overrides: Record<string, string> = {}) {
  const fields: Record<string, string> = {
    Repository: INPUT.repository, Status: 'scheduled_confirmation', PR: '75',
    Branch: INPUT.branch, Worktree: '/work', 'Expected head SHA': HEAD,
    'Allowed actions': 'inspect | merge-pr-75-after-fresh-gate',
    'Merge authorization': `one-shot for PR #75 at ${HEAD}`,
    'Authorization source': 'operator message at 2026-07-11T00:00:00Z', ...overrides,
  };
  return Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join('\n');
}
function proof() {
  const pr = { headRefOid: HEAD, baseRefOid: 'a'.repeat(40), baseBranchOid: 'a'.repeat(40),
    baseRefName: 'main', state: 'OPEN', isDraft: false, reviewDecision: null,
    mergeable: 'MERGEABLE', mergeStateStatus: 'CLEAN' };
  const policy = { sources: { classic_protection: true, applicable_branch_rule_pages: 1,
    applicable_branch_rules: 0, required_status_check_rules: 0 },
    requiredChecks: [{ context: 'quality-gate', app_id: 1 }] };
  return { schema_version: 1, proof_type: 'kennedi.pr-readiness', status: 'ready', ready: true,
    observed_at: '2026-07-11T00:00:00Z', repository: INPUT.repository, pull_request: 75,
    expected_head_sha: HEAD, pr: { initial: pr, final: { ...pr }, metadata_stable: true },
    policy: { initial: policy, final: structuredClone(policy), stable: true },
    checks: { complete: true, pages: 1, head_sha: HEAD,
      contexts: [{ type: 'check_run', name: 'quality-gate', app_id: 1, status: 'COMPLETED', conclusion: 'SUCCESS', successful: true }],
      required_results: [{ context: 'quality-gate', app_id: 1, result: 'success', matched_rows: 1 }] },
    review_threads: { complete: true, pages: 1, total_count: 0, unresolved_count: 0,
      unresolved_ids: [], outdated_unresolved_count: 0 }, failure_codes: [] };
}
function pendingProof() { return { ...proof(), status: 'not_ready', ready: false, failure_codes: ['required_check_not_successful'] }; }
