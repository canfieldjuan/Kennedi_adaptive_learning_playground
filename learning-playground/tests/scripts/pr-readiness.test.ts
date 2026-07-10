import { describe, expect, test, vi } from 'vitest';
// @ts-expect-error The repository-owned Node CLI is intentionally plain JavaScript.
import * as readiness from '../../scripts/pr-readiness.mjs';

const {
  ReadinessError,
  createGitHubClient,
  paginateConnection,
  parseCliArgs,
  produceReadinessProof,
  runCli,
} = readiness;

const HEAD = '1111111111111111111111111111111111111111';
const OTHER_HEAD = '2222222222222222222222222222222222222222';
const BASE = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const OTHER_BASE = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

describe('PR readiness proof', () => {
  test('is ready only with a stable exact head, required green check, and zero threads', async () => {
    const proof = await produce();

    expect(proof).toMatchObject({
      schema_version: 1,
      proof_type: 'kennedi.pr-readiness',
      status: 'ready',
      ready: true,
      observed_at: '2026-07-10T18:00:00.000Z',
      expected_head_sha: HEAD,
      failure_codes: [],
    });
    expect(proof.checks.required_results).toEqual([
      { context: 'quality-gate', app_id: null, result: 'success', matched_rows: 1 },
    ]);
    expect(proof.review_threads).toMatchObject({
      complete: true,
      pages: 1,
      total_count: 0,
      unresolved_count: 0,
      outdated_unresolved_count: 0,
    });
  });

  test('one unresolved thread blocks readiness', async () => {
    const proof = await produce({
      threads: connection([thread({ id: 'thread-1', isResolved: false })]),
    });

    expect(proof.ready).toBe(false);
    expect(proof.failure_codes).toContain('review_threads_unresolved');
    expect(proof.review_threads.unresolved_ids).toEqual(['thread-1']);
  });

  test('an outdated unresolved thread still blocks readiness', async () => {
    const proof = await produce({
      threads: connection([
        thread({ id: 'thread-outdated', isResolved: false, isOutdated: true }),
      ]),
    });

    expect(proof.ready).toBe(false);
    expect(proof.review_threads).toMatchObject({
      unresolved_count: 1,
      outdated_unresolved_count: 1,
    });
  });

  test('more than 100 threads are retained across advancing pages', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => (
      thread({ id: `thread-${index}`, isResolved: true })
    ));
    const secondPage = [thread({ id: 'thread-100', isResolved: false })];

    const threads = await paginateConnection(async (cursor: string | null) => (
      cursor === null
        ? page(firstPage, true, 'cursor-100')
        : page(secondPage, false, null)
    ));
    const proof = await produce({ threads });

    expect(threads).toMatchObject({ complete: true, pages: 2 });
    expect(proof.review_threads.total_count).toBe(101);
    expect(proof.review_threads.unresolved_ids).toEqual(['thread-100']);
    expect(proof.ready).toBe(false);
  });

  test('duplicate thread ids fail closed instead of lowering confidence', async () => {
    await expect(produce({
      threads: connection([
        thread({ id: 'duplicate', isResolved: true }),
        thread({ id: 'duplicate', isResolved: true }),
      ]),
    })).rejects.toMatchObject({ code: 'duplicate_thread_id' });
  });

  test.each([
    ['missing', [], 'required_check_missing'],
    ['pending', [check({ status: 'IN_PROGRESS', conclusion: null })], 'required_check_not_successful'],
    ['skipped', [check({ conclusion: 'SKIPPED' })], 'required_check_not_successful'],
    ['failed', [check({ conclusion: 'FAILURE' })], 'required_check_not_successful'],
  ])('%s required check blocks readiness', async (_label, items, expectedCode) => {
    const proof = await produce({ checks: connection(items, HEAD) });

    expect(proof.ready).toBe(false);
    expect(proof.failure_codes).toContain(expectedCode);
  });

  test('an app-bound requirement rejects the same context from another app', async () => {
    const proof = await produce({
      policy: policy([{ context: 'quality-gate', app_id: 42 }]),
      checks: connection([check({ app_id: 99 })], HEAD),
    });

    expect(proof.ready).toBe(false);
    expect(proof.failure_codes).toContain('required_check_missing');
  });

  test('empty required policy is non-ready rather than vacuously green', async () => {
    const proof = await produce({ policy: policy([]) });

    expect(proof.failure_codes).toEqual(expect.arrayContaining([
      'required_policy_empty',
      'required_policy_missing_quality_gate',
    ]));
  });

  test('a non-empty policy that omits quality-gate is non-ready', async () => {
    const proof = await produce({
      policy: policy([{ context: 'Vercel', app_id: null }]),
      checks: connection([check({ name: 'Vercel' })], HEAD),
    });

    expect(proof.failure_codes).toContain('required_policy_missing_quality_gate');
  });

  test('a policy change during collection is contradictory state', async () => {
    const github = fakeGitHub({
      policies: [
        policy([{ context: 'quality-gate', app_id: null }]),
        policy([
          { context: 'quality-gate', app_id: null },
          { context: 'security-gate', app_id: null },
        ]),
      ],
    });
    const proof = await produceReadinessProof(input(github));

    expect(proof.failure_codes).toContain('required_policy_changed');
  });

  test('a stale expected head is non-ready even when the PR is otherwise green', async () => {
    const proof = await produce({ expectedHead: OTHER_HEAD });

    expect(proof.failure_codes).toContain('expected_head_mismatch');
  });

  test('a head change during collection invalidates the snapshot', async () => {
    const proof = await produce({
      prs: [pullRequest(), pullRequest({ headRefOid: OTHER_HEAD })],
    });

    expect(proof.failure_codes).toEqual(expect.arrayContaining([
      'expected_head_mismatch',
      'head_changed',
      'pr_metadata_changed',
    ]));
  });

  test('a base change during collection invalidates the snapshot', async () => {
    const proof = await produce({
      prs: [pullRequest(), pullRequest({ baseRefOid: OTHER_BASE })],
    });

    expect(proof.failure_codes).toEqual(expect.arrayContaining([
      'base_changed',
      'base_not_current',
      'pr_metadata_changed',
    ]));
  });

  test('a PR base behind the live base branch is non-ready', async () => {
    const pr = pullRequest({ baseBranchOid: OTHER_BASE });
    const proof = await produce({ prs: [pr, pr] });

    expect(proof.failure_codes).toContain('base_not_current');
  });

  test('a live base branch change during collection invalidates the snapshot', async () => {
    const proof = await produce({
      prs: [pullRequest(), pullRequest({ baseBranchOid: OTHER_BASE })],
    });

    expect(proof.failure_codes).toEqual(expect.arrayContaining([
      'base_branch_changed',
      'base_not_current',
      'pr_metadata_changed',
    ]));
  });

  test.each([
    ['closed PR', { state: 'CLOSED' }, 'pr_not_open'],
    ['draft PR', { isDraft: true }, 'pr_is_draft'],
    ['changes requested', { reviewDecision: 'CHANGES_REQUESTED' }, 'changes_requested'],
    ['unknown mergeability', { mergeable: 'UNKNOWN' }, 'mergeability_unknown'],
    ['conflicting mergeability', { mergeable: 'CONFLICTING' }, 'merge_conflict'],
    ['unknown merge state', { mergeStateStatus: 'UNKNOWN' }, 'merge_state_unknown'],
    ['blocked merge state', { mergeStateStatus: 'BLOCKED' }, 'merge_state_not_clean'],
  ])('%s blocks readiness', async (_label, overrides, expectedCode) => {
    const pr = pullRequest(overrides);
    const proof = await produce({ prs: [pr, pr] });

    expect(proof.ready).toBe(false);
    expect(proof.failure_codes).toContain(expectedCode);
  });
});

describe('bounded pagination', () => {
  test('rejects a missing next cursor', async () => {
    await expect(paginateConnection(async () => page([], true, null))).rejects.toMatchObject({
      code: 'pagination_cursor_missing',
    });
  });

  test('rejects a repeated cursor', async () => {
    await expect(paginateConnection(async () => page([], true, 'same'))).rejects.toMatchObject({
      code: 'pagination_cursor_not_advancing',
    });
  });

  test('rejects a connection that exceeds its page cap', async () => {
    let pageNumber = 0;
    await expect(paginateConnection(async () => {
      pageNumber += 1;
      return page([], true, `cursor-${pageNumber}`);
    }, 2)).rejects.toMatchObject({ code: 'pagination_limit' });
  });
});

describe('GraphQL thread collection', () => {
  test('requires collected nodes to equal a stable declared total count', async () => {
    const fetchImpl = responseQueue([
      graphqlResponse(threadConnectionResponse({
        totalCount: 2,
        nodes: [thread({ id: 'thread-1' })],
        hasNextPage: true,
        endCursor: 'cursor-1',
      })),
      graphqlResponse(threadConnectionResponse({
        totalCount: 2,
        nodes: [thread({ id: 'thread-2' })],
        hasNextPage: false,
        endCursor: null,
      })),
    ]);
    const github = createGitHubClient({ token: 'secret', fetchImpl });

    const result = await github.getReviewThreads('owner', 'repo', 65);

    expect(result).toMatchObject({ complete: true, pages: 2, totalCount: 2 });
    expect(result.items.map(({ id }: { id: string }) => id)).toEqual(['thread-1', 'thread-2']);
  });

  test('rejects a complete-looking page whose declared count is larger', async () => {
    const fetchImpl = responseQueue([
      graphqlResponse(threadConnectionResponse({
        totalCount: 2,
        nodes: [thread({ id: 'thread-1' })],
        hasNextPage: false,
        endCursor: null,
      })),
    ]);
    const github = createGitHubClient({ token: 'secret', fetchImpl });

    await expect(github.getReviewThreads('owner', 'repo', 65)).rejects.toMatchObject({
      code: 'thread_count_mismatch',
    });
  });
});

describe('required policy discovery', () => {
  test('unions and de-duplicates classic and applicable ruleset requirements', async () => {
    const fetchImpl = responseQueue([
      jsonResponse({
        contexts: ['quality-gate'],
        checks: [{ context: 'security-gate', app_id: 42 }],
      }),
      jsonResponse([
        {
          type: 'required_status_checks',
          parameters: {
            required_status_checks: [
              { context: 'quality-gate', integration_id: null },
              { context: 'lint-gate', integration_id: 99 },
            ],
          },
        },
      ]),
    ]);
    const github = createGitHubClient({ token: 'secret', fetchImpl });

    const result = await github.getRequiredCheckPolicy('owner', 'repo', 'main');

    expect(result).toEqual({
      sources: {
        classic_protection: true,
        applicable_branch_rule_pages: 1,
        applicable_branch_rules: 1,
        required_status_check_rules: 1,
      },
      requiredChecks: [
        { context: 'lint-gate', app_id: 99 },
        { context: 'quality-gate', app_id: null },
        { context: 'security-gate', app_id: 42 },
      ],
    });
  });

  test('represents absent classic protection and no rules as an empty policy', async () => {
    const fetchImpl = responseQueue([
      jsonResponse({ message: 'Branch not protected' }, 404),
      jsonResponse([]),
    ]);
    const github = createGitHubClient({ token: 'secret', fetchImpl });

    const result = await github.getRequiredCheckPolicy('owner', 'repo', 'main');

    expect(result.sources.classic_protection).toBe(false);
    expect(result.requiredChecks).toEqual([]);
  });

  test('discovers required checks beyond the first 100 applicable branch rules', async () => {
    const firstRules = Array.from({ length: 100 }, (_, index) => ({
      type: 'commit_message_pattern',
      parameters: { name: `rule-${index}` },
    }));
    const fetchImpl = responseQueue([
      jsonResponse({ contexts: [], checks: [] }),
      jsonResponse(firstRules),
      jsonResponse([{
        type: 'required_status_checks',
        parameters: {
          required_status_checks: [{ context: 'quality-gate', integration_id: null }],
        },
      }]),
    ]);
    const github = createGitHubClient({ token: 'secret', fetchImpl });

    const result = await github.getRequiredCheckPolicy('owner', 'repo', 'main');

    expect(result.sources).toMatchObject({
      applicable_branch_rule_pages: 2,
      applicable_branch_rules: 101,
    });
    expect(result.requiredChecks).toEqual([{ context: 'quality-gate', app_id: null }]);
  });

  test('fails closed on a malformed required-status-check rule', async () => {
    const fetchImpl = responseQueue([
      jsonResponse({ contexts: [], checks: [] }),
      jsonResponse([{ type: 'required_status_checks', parameters: {} }]),
    ]);
    const github = createGitHubClient({ token: 'secret', fetchImpl });

    await expect(github.getRequiredCheckPolicy('owner', 'repo', 'main')).rejects.toMatchObject({
      code: 'required_policy_shape',
    });
  });
});

describe('CLI boundary', () => {
  test('requires explicit safe identifiers and a token from the environment', () => {
    expect(parseCliArgs([
      '--repository', 'owner/repo',
      '--pr', '65',
      '--expected-head', HEAD,
    ], { GH_TOKEN: 'secret' })).toMatchObject({
      repository: 'owner/repo',
      prNumber: 65,
      expectedHead: HEAD,
      token: 'secret',
    });

    expect(() => parseCliArgs([
      '--repository', 'owner/repo',
      '--pr', '0',
      '--expected-head', HEAD,
    ], { GH_TOKEN: 'secret' })).toThrow(ReadinessError);
    expect(() => parseCliArgs([
      '--repository', 'owner/repo',
      '--pr', '65',
      '--expected-head', HEAD,
      '--token', 'leak',
    ], { GH_TOKEN: 'secret' })).toThrow(ReadinessError);
  });

  test('returns an error proof and redacts token text from transport failures', async () => {
    let output = '';
    const exitCode = await runCli({
      argv: [
        '--repository', 'owner/repo',
        '--pr', '65',
        '--expected-head', HEAD,
      ],
      env: { GH_TOKEN: 'super-secret-token' },
      fetchImpl: async () => {
        throw new Error('transport included super-secret-token');
      },
      stdout: { write: (chunk: string) => { output += chunk; return true; } },
      now: () => '2026-07-10T18:00:00.000Z',
    });

    expect(exitCode).toBe(2);
    expect(output).not.toContain('super-secret-token');
    expect(JSON.parse(output)).toMatchObject({
      schema_version: 1,
      status: 'error',
      ready: false,
      failure_codes: ['producer_error'],
    });
  });

  test('returns zero only for a complete ready proof', async () => {
    let output = '';
    const exitCode = await runCli({
      argv: cliArgs(),
      env: { GH_TOKEN: 'secret' },
      createClient: () => fakeGitHub(),
      stdout: { write: (chunk: string) => { output += chunk; return true; } },
      now: () => '2026-07-10T18:00:00.000Z',
    });

    expect(exitCode).toBe(0);
    expect(JSON.parse(output)).toMatchObject({ status: 'ready', ready: true });
  });

  test('returns one for a complete proof of non-readiness', async () => {
    let output = '';
    const exitCode = await runCli({
      argv: cliArgs(),
      env: { GH_TOKEN: 'secret' },
      createClient: () => fakeGitHub({ policy: policy([]) }),
      stdout: { write: (chunk: string) => { output += chunk; return true; } },
      now: () => '2026-07-10T18:00:00.000Z',
    });

    expect(exitCode).toBe(1);
    expect(JSON.parse(output)).toMatchObject({ status: 'not_ready', ready: false });
  });
});

function produce(overrides: {
  prs?: ReturnType<typeof pullRequest>[];
  policy?: ReturnType<typeof policy>;
  policies?: ReturnType<typeof policy>[];
  checks?: ReturnType<typeof connection>;
  threads?: ReturnType<typeof connection>;
  expectedHead?: string;
} = {}) {
  const github = fakeGitHub(overrides);
  return produceReadinessProof(input(github, overrides.expectedHead));
}

function input(github: ReturnType<typeof fakeGitHub>, expectedHead = HEAD) {
  return {
    github,
    repository: 'owner/repo',
    owner: 'owner',
    repo: 'repo',
    prNumber: 65,
    expectedHead,
    now: () => '2026-07-10T18:00:00.000Z',
  };
}

function fakeGitHub(overrides: {
  prs?: ReturnType<typeof pullRequest>[];
  policy?: ReturnType<typeof policy>;
  policies?: ReturnType<typeof policy>[];
  checks?: ReturnType<typeof connection>;
  threads?: ReturnType<typeof connection>;
} = {}) {
  const prs = overrides.prs ?? [pullRequest(), pullRequest()];
  const policies = overrides.policies ?? [
    overrides.policy ?? policy(),
    overrides.policy ?? policy(),
  ];
  let prRead = 0;
  let policyRead = 0;
  return {
    getPullRequest: vi.fn(async () => prs[Math.min(prRead++, prs.length - 1)]),
    getRequiredCheckPolicy: vi.fn(async () => (
      policies[Math.min(policyRead++, policies.length - 1)]
    )),
    getCheckContexts: vi.fn(async () => overrides.checks ?? connection([check()], HEAD)),
    getReviewThreads: vi.fn(async () => overrides.threads ?? connection([])),
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
    reviewDecision: null,
    mergeable: 'MERGEABLE',
    mergeStateStatus: 'CLEAN',
    ...overrides,
  };
}

function policy(
  requiredChecks: Array<{ context: string; app_id: number | null }> = [
    { context: 'quality-gate', app_id: null },
  ]
) {
  return {
    sources: {
      classic_protection: true,
      applicable_branch_rule_pages: 1,
      applicable_branch_rules: 0,
      required_status_check_rules: 0,
    },
    requiredChecks,
  };
}

function check(overrides: Partial<{
  type: string;
  name: string;
  app_id: number | null;
  app_slug: string | null;
  status: string;
  conclusion: string | null;
  successful: boolean;
}> = {}) {
  const value = {
    type: 'check_run',
    name: 'quality-gate',
    app_id: null,
    app_slug: 'github-actions',
    status: 'COMPLETED',
    conclusion: 'SUCCESS' as string | null,
    successful: true,
    ...overrides,
  };
  value.successful = value.status === 'COMPLETED' && value.conclusion === 'SUCCESS';
  return value;
}

function thread(overrides: Partial<{
  id: string;
  isResolved: boolean;
  isOutdated: boolean;
  path: string | null;
  line: number | null;
}> = {}) {
  return {
    id: 'thread',
    isResolved: true,
    isOutdated: false,
    path: 'file.ts',
    line: 1,
    ...overrides,
  };
}

function connection<T>(items: T[], headSha?: string) {
  return {
    complete: true,
    pages: 1,
    items,
    ...(headSha ? { headSha } : {}),
  };
}

function page<T>(nodes: T[], hasNextPage: boolean, endCursor: string | null) {
  return { nodes, pageInfo: { hasNextPage, endCursor } };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function graphqlResponse(data: unknown) {
  return jsonResponse({ data });
}

function threadConnectionResponse({
  totalCount,
  nodes,
  hasNextPage,
  endCursor,
}: {
  totalCount: number;
  nodes: ReturnType<typeof thread>[];
  hasNextPage: boolean;
  endCursor: string | null;
}) {
  return {
    repository: {
      pullRequest: {
        reviewThreads: {
          totalCount,
          nodes,
          pageInfo: { hasNextPage, endCursor },
        },
      },
    },
  };
}

function responseQueue(responses: Response[]) {
  return vi.fn(async () => {
    const response = responses.shift();
    if (!response) throw new Error('Unexpected request');
    return response;
  });
}

function cliArgs() {
  return [
    '--repository', 'owner/repo',
    '--pr', '65',
    '--expected-head', HEAD,
  ];
}
