#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

export const PROOF_SCHEMA_VERSION = 1;
export const PROOF_TYPE = 'kennedi.pr-readiness';
export const PAGE_SIZE = 100;
export const MAX_PAGES = 100;
export const REQUIRED_BASELINE_CONTEXT = 'quality-gate';

const API_ROOT = 'https://api.github.com';
const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export class ReadinessError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ReadinessError';
    this.code = code;
  }
}

export function parseCliArgs(argv, env) {
  const values = new Map();
  const supported = new Set(['--repository', '--pr', '--expected-head']);

  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!supported.has(name) || value === undefined || value.startsWith('--')) {
      throw new ReadinessError(
        'invalid_arguments',
        'Usage: pr-readiness.mjs --repository owner/name --pr NUMBER --expected-head SHA'
      );
    }
    if (values.has(name)) {
      throw new ReadinessError('invalid_arguments', `Duplicate argument: ${name}`);
    }
    values.set(name, value);
  }

  const repository = values.get('--repository');
  const prValue = values.get('--pr');
  const expectedHead = values.get('--expected-head')?.toLowerCase();
  const token = env.GH_TOKEN || env.GITHUB_TOKEN;

  if (!repository || !REPOSITORY_PATTERN.test(repository)) {
    throw new ReadinessError('invalid_repository', 'Repository must use owner/name form');
  }
  const [owner, repo] = repository.split('/');
  if (owner === '.' || owner === '..' || repo === '.' || repo === '..') {
    throw new ReadinessError('invalid_repository', 'Repository must use owner/name form');
  }
  if (!prValue || !/^[1-9][0-9]*$/.test(prValue)) {
    throw new ReadinessError('invalid_pr_number', 'PR number must be a positive integer');
  }
  if (!expectedHead || !SHA_PATTERN.test(expectedHead)) {
    throw new ReadinessError('invalid_expected_head', 'Expected head must be a 40-character SHA');
  }
  if (!token) {
    throw new ReadinessError('missing_token', 'GH_TOKEN or GITHUB_TOKEN is required');
  }

  return {
    repository,
    owner,
    repo,
    prNumber: Number(prValue),
    expectedHead,
    token,
  };
}

export function createGitHubClient({ token, fetchImpl = globalThis.fetch }) {
  if (typeof fetchImpl !== 'function') {
    throw new ReadinessError('missing_fetch', 'A fetch implementation is required');
  }

  async function requestJson(url, init = {}, allowedStatuses = []) {
    let response;
    try {
      response = await fetchImpl(url, {
        ...init,
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2026-03-10',
          ...init.headers,
        },
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown transport failure';
      throw new ReadinessError('github_transport_error', `GitHub request failed: ${message}`);
    }

    if (allowedStatuses.includes(response.status)) {
      return { status: response.status, data: null };
    }
    if (!response.ok) {
      throw new ReadinessError(
        'github_http_error',
        `GitHub request failed with HTTP ${response.status}`
      );
    }

    try {
      return { status: response.status, data: await response.json() };
    } catch {
      throw new ReadinessError('github_json_error', 'GitHub returned malformed JSON');
    }
  }

  async function graphql(query, variables) {
    const { data } = await requestJson(`${API_ROOT}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    if (!isRecord(data)) {
      throw new ReadinessError('github_graphql_shape', 'GraphQL response is not an object');
    }
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      throw new ReadinessError('github_graphql_error', 'GitHub GraphQL returned errors');
    }
    if (!isRecord(data.data)) {
      throw new ReadinessError('github_graphql_shape', 'GraphQL response is missing data');
    }
    return data.data;
  }

  return {
    async getPullRequest(owner, repo, prNumber) {
      const data = await graphql(PR_QUERY, { owner, repo, number: prNumber });
      const pr = readPath(data, ['repository', 'pullRequest'], 'pull request');
      return normalizePullRequest(pr);
    },

    async getRequiredCheckPolicy(owner, repo, baseBranch) {
      const encodedOwner = encodeURIComponent(owner);
      const encodedRepo = encodeURIComponent(repo);
      const encodedBranch = encodeURIComponent(baseBranch);
      const classic = await requestJson(
        `${API_ROOT}/repos/${encodedOwner}/${encodedRepo}/branches/${encodedBranch}/protection/required_status_checks`,
        {},
        [404]
      );
      const branchRules = [];
      let branchRulePages = 0;
      for (let page = 1; page <= MAX_PAGES; page += 1) {
        const response = await requestJson(
          `${API_ROOT}/repos/${encodedOwner}/${encodedRepo}/rules/branches/${encodedBranch}?per_page=${PAGE_SIZE}&page=${page}`
        );
        if (!Array.isArray(response.data)) {
          throw new ReadinessError(
            'required_policy_shape',
            'Applicable branch rules are malformed'
          );
        }
        branchRulePages = page;
        branchRules.push(...response.data);
        if (response.data.length < PAGE_SIZE) break;
        if (page === MAX_PAGES) {
          throw new ReadinessError(
            'required_policy_pagination_limit',
            `Applicable branch rules exceeded ${MAX_PAGES} pages`
          );
        }
      }
      return normalizeRequiredPolicy(classic, branchRules, branchRulePages);
    },

    async getCheckContexts(owner, repo, headSha) {
      let observedOid = null;
      const connection = await paginateConnection(async (cursor) => {
        const data = await graphql(CHECKS_QUERY, { owner, repo, oid: headSha, cursor });
        const commit = readPath(data, ['repository', 'object'], 'commit');
        const oid = requireSha(commit.oid, 'commit oid');
        if (oid !== headSha) {
          throw new ReadinessError('check_head_mismatch', 'Check rollup commit does not match head');
        }
        observedOid = oid;
        if (commit.statusCheckRollup === null) {
          return emptyPage();
        }
        const contexts = readPath(
          commit,
          ['statusCheckRollup', 'contexts'],
          'check contexts'
        );
        return normalizeConnectionPage(contexts, normalizeCheckContext, 'check contexts');
      });
      return { headSha: observedOid ?? headSha, ...connection };
    },

    async getReviewThreads(owner, repo, prNumber) {
      let declaredTotalCount = null;
      const connection = await paginateConnection(async (cursor) => {
        const data = await graphql(THREADS_QUERY, { owner, repo, number: prNumber, cursor });
        const threads = readPath(
          data,
          ['repository', 'pullRequest', 'reviewThreads'],
          'review threads'
        );
        const pageTotalCount = requireInteger(threads.totalCount, 'review-thread total count');
        if (pageTotalCount < 0) {
          throw new ReadinessError('thread_shape', 'Review-thread total count is malformed');
        }
        if (declaredTotalCount !== null && declaredTotalCount !== pageTotalCount) {
          throw new ReadinessError(
            'thread_count_changed',
            'Review-thread total count changed during pagination'
          );
        }
        declaredTotalCount = pageTotalCount;
        return normalizeConnectionPage(threads, normalizeThread, 'review threads');
      });
      if (connection.items.length !== declaredTotalCount) {
        throw new ReadinessError(
          'thread_count_mismatch',
          'Collected review-thread count does not match GraphQL totalCount'
        );
      }
      assertUniqueThreadIds(connection.items);
      return { ...connection, totalCount: declaredTotalCount };
    },
  };
}

export async function paginateConnection(fetchPage, maxPages = MAX_PAGES) {
  const items = [];
  const seenCursors = new Set();
  let cursor = null;

  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
    const page = await fetchPage(cursor);
    if (!isRecord(page) || !Array.isArray(page.nodes) || !isRecord(page.pageInfo)) {
      throw new ReadinessError('pagination_shape', 'Connection page is malformed');
    }
    const { hasNextPage, endCursor } = page.pageInfo;
    if (typeof hasNextPage !== 'boolean') {
      throw new ReadinessError('pagination_shape', 'Connection pageInfo is malformed');
    }
    items.push(...page.nodes);

    if (!hasNextPage) {
      return { complete: true, pages: pageNumber, items };
    }
    if (typeof endCursor !== 'string' || endCursor.length === 0) {
      throw new ReadinessError('pagination_cursor_missing', 'Next page cursor is missing');
    }
    if (endCursor === cursor || seenCursors.has(endCursor)) {
      throw new ReadinessError(
        'pagination_cursor_not_advancing',
        'Next page cursor did not advance'
      );
    }
    seenCursors.add(endCursor);
    cursor = endCursor;
  }

  throw new ReadinessError('pagination_limit', `Connection exceeded ${maxPages} pages`);
}

export async function produceReadinessProof({
  github,
  repository,
  owner,
  repo,
  prNumber,
  expectedHead,
  now = () => new Date().toISOString(),
}) {
  const initial = await github.getPullRequest(owner, repo, prNumber);
  const initialPolicy = await github.getRequiredCheckPolicy(owner, repo, initial.baseRefName);
  const checks = await github.getCheckContexts(owner, repo, initial.headRefOid);
  const threads = await github.getReviewThreads(owner, repo, prNumber);
  const final = await github.getPullRequest(owner, repo, prNumber);
  const finalPolicy = await github.getRequiredCheckPolicy(owner, repo, final.baseRefName);

  const failureCodes = new Set();
  const metadataStable = pullRequestFingerprint(initial) === pullRequestFingerprint(final);
  const policyStable = policyFingerprint(initialPolicy) === policyFingerprint(finalPolicy);

  if (initial.headRefOid !== expectedHead || final.headRefOid !== expectedHead) {
    failureCodes.add('expected_head_mismatch');
  }
  if (initial.headRefOid !== final.headRefOid) failureCodes.add('head_changed');
  if (initial.baseRefOid !== final.baseRefOid) failureCodes.add('base_changed');
  if (initial.baseBranchOid !== final.baseBranchOid) failureCodes.add('base_branch_changed');
  if (
    initial.baseRefOid !== initial.baseBranchOid
    || final.baseRefOid !== final.baseBranchOid
  ) {
    failureCodes.add('base_not_current');
  }
  if (!metadataStable) failureCodes.add('pr_metadata_changed');
  if (initial.state !== 'OPEN') failureCodes.add('pr_not_open');
  if (initial.isDraft) failureCodes.add('pr_is_draft');
  if (!policyStable) failureCodes.add('required_policy_changed');
  if (initialPolicy.requiredChecks.length === 0) failureCodes.add('required_policy_empty');
  if (!initialPolicy.requiredChecks.some(({ context }) => context === REQUIRED_BASELINE_CONTEXT)) {
    failureCodes.add('required_policy_missing_quality_gate');
  }

  const requiredResults = evaluateRequiredChecks(initialPolicy.requiredChecks, checks.items);
  if (requiredResults.some(({ result }) => result === 'missing')) {
    failureCodes.add('required_check_missing');
  }
  if (requiredResults.some(({ result }) => result === 'not_successful')) {
    failureCodes.add('required_check_not_successful');
  }

  assertUniqueThreadIds(threads.items);
  const unresolved = threads.items.filter(({ isResolved }) => !isResolved);
  if (unresolved.length > 0) failureCodes.add('review_threads_unresolved');
  if (initial.reviewDecision === 'CHANGES_REQUESTED') {
    failureCodes.add('changes_requested');
  }
  if (initial.mergeable === 'UNKNOWN') failureCodes.add('mergeability_unknown');
  else if (initial.mergeable !== 'MERGEABLE') failureCodes.add('merge_conflict');
  if (initial.mergeStateStatus === 'UNKNOWN') failureCodes.add('merge_state_unknown');
  else if (initial.mergeStateStatus !== 'CLEAN') failureCodes.add('merge_state_not_clean');

  const failures = [...failureCodes].sort();
  const ready = failures.length === 0;
  return {
    schema_version: PROOF_SCHEMA_VERSION,
    proof_type: PROOF_TYPE,
    status: ready ? 'ready' : 'not_ready',
    ready,
    observed_at: now(),
    repository,
    pull_request: prNumber,
    expected_head_sha: expectedHead,
    pr: {
      initial,
      final,
      metadata_stable: metadataStable,
    },
    policy: {
      initial: initialPolicy,
      final: finalPolicy,
      stable: policyStable,
    },
    checks: {
      complete: checks.complete,
      pages: checks.pages,
      head_sha: checks.headSha,
      contexts: checks.items,
      required_results: requiredResults,
    },
    review_threads: {
      complete: threads.complete,
      pages: threads.pages,
      total_count: threads.totalCount ?? threads.items.length,
      unresolved_count: unresolved.length,
      unresolved_ids: unresolved.map(({ id }) => id),
      outdated_unresolved_count: unresolved.filter(({ isOutdated }) => isOutdated).length,
    },
    failure_codes: failures,
  };
}

export async function runCli({
  argv = process.argv.slice(2),
  env = process.env,
  fetchImpl = globalThis.fetch,
  createClient = createGitHubClient,
  stdout = process.stdout,
  now = () => new Date().toISOString(),
} = {}) {
  try {
    const input = parseCliArgs(argv, env);
    const github = createClient({ token: input.token, fetchImpl });
    const proof = await produceReadinessProof({ github, ...input, now });
    stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
    return proof.ready ? 0 : 1;
  } catch (error) {
    const normalized = normalizeError(error, [env.GH_TOKEN, env.GITHUB_TOKEN]);
    const proof = {
      schema_version: PROOF_SCHEMA_VERSION,
      proof_type: PROOF_TYPE,
      status: 'error',
      ready: false,
      observed_at: now(),
      failure_codes: ['producer_error'],
      error: normalized,
    };
    stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
    return 2;
  }
}

function normalizeRequiredPolicy(classicResponse, branchRules, branchRulePages) {
  const requirements = [];
  const classicPresent = classicResponse.status !== 404;

  if (classicPresent) {
    if (!isRecord(classicResponse.data)) {
      throw new ReadinessError('required_policy_shape', 'Classic required checks are malformed');
    }
    const contexts = classicResponse.data.contexts ?? [];
    const checks = classicResponse.data.checks ?? [];
    if (!Array.isArray(contexts) || !Array.isArray(checks)) {
      throw new ReadinessError('required_policy_shape', 'Classic required checks are malformed');
    }
    for (const context of contexts) requirements.push(normalizeRequirement(context, null));
    for (const check of checks) {
      if (!isRecord(check)) {
        throw new ReadinessError('required_policy_shape', 'Classic required check is malformed');
      }
      requirements.push(normalizeRequirement(check.context, check.app_id ?? null));
    }
  }

  let requiredRuleCount = 0;
  for (const rule of branchRules) {
    if (!isRecord(rule) || typeof rule.type !== 'string') {
      throw new ReadinessError('required_policy_shape', 'Applicable branch rule is malformed');
    }
    if (rule.type !== 'required_status_checks') continue;
    requiredRuleCount += 1;
    if (!isRecord(rule.parameters) || !Array.isArray(rule.parameters.required_status_checks)) {
      throw new ReadinessError('required_policy_shape', 'Required-status-check rule is malformed');
    }
    for (const check of rule.parameters.required_status_checks) {
      if (!isRecord(check)) {
        throw new ReadinessError('required_policy_shape', 'Ruleset required check is malformed');
      }
      requirements.push(normalizeRequirement(check.context, check.integration_id ?? null));
    }
  }

  const unique = new Map();
  for (const requirement of requirements) {
    unique.set(`${requirement.context}\u0000${requirement.app_id ?? '*'}`, requirement);
  }
  return {
    sources: {
      classic_protection: classicPresent,
      applicable_branch_rule_pages: branchRulePages,
      applicable_branch_rules: branchRules.length,
      required_status_check_rules: requiredRuleCount,
    },
    requiredChecks: [...unique.values()].sort(compareRequirements),
  };
}

function normalizeRequirement(context, appId) {
  if (typeof context !== 'string' || context.length === 0) {
    throw new ReadinessError('required_policy_shape', 'Required check context is malformed');
  }
  if (appId !== null && (!Number.isInteger(appId) || appId <= 0)) {
    throw new ReadinessError('required_policy_shape', 'Required check app id is malformed');
  }
  return { context, app_id: appId };
}

function normalizePullRequest(pr) {
  if (!isRecord(pr)) {
    throw new ReadinessError('pr_shape', 'Pull request response is malformed');
  }
  return {
    headRefOid: requireSha(pr.headRefOid, 'head SHA'),
    baseRefOid: requireSha(pr.baseRefOid, 'base SHA'),
    baseBranchOid: requireSha(
      readPath(pr, ['baseRef', 'target'], 'base branch target').oid,
      'base branch SHA'
    ),
    baseRefName: requireString(pr.baseRefName, 'base ref'),
    state: requireString(pr.state, 'PR state'),
    isDraft: requireBoolean(pr.isDraft, 'draft state'),
    reviewDecision: pr.reviewDecision === null
      ? null
      : requireString(pr.reviewDecision, 'review decision'),
    mergeable: requireString(pr.mergeable, 'mergeability'),
    mergeStateStatus: requireString(pr.mergeStateStatus, 'merge-state status'),
  };
}

function normalizeCheckContext(node) {
  if (!isRecord(node) || typeof node.__typename !== 'string') {
    throw new ReadinessError('check_shape', 'Check context is malformed');
  }
  if (node.__typename === 'CheckRun') {
    const app = isRecord(node.checkSuite) && isRecord(node.checkSuite.app)
      ? node.checkSuite.app
      : null;
    const appId = app?.databaseId ?? null;
    if (appId !== null && (!Number.isInteger(appId) || appId <= 0)) {
      throw new ReadinessError('check_shape', 'Check-run app id is malformed');
    }
    const status = requireString(node.status, 'check-run status');
    const conclusion = node.conclusion === null
      ? null
      : requireString(node.conclusion, 'check-run conclusion');
    return {
      type: 'check_run',
      name: requireString(node.name, 'check-run name'),
      app_id: appId,
      app_slug: app === null || app.slug === null ? null : requireString(app.slug, 'app slug'),
      status,
      conclusion,
      successful: status === 'COMPLETED' && conclusion === 'SUCCESS',
    };
  }
  if (node.__typename === 'StatusContext') {
    const state = requireString(node.state, 'status-context state');
    return {
      type: 'status_context',
      name: requireString(node.context, 'status-context name'),
      app_id: null,
      app_slug: null,
      status: state,
      conclusion: state,
      successful: state === 'SUCCESS',
    };
  }
  throw new ReadinessError('check_shape', `Unsupported check context type: ${node.__typename}`);
}

function normalizeThread(node) {
  if (!isRecord(node)) {
    throw new ReadinessError('thread_shape', 'Review thread is malformed');
  }
  return {
    id: requireString(node.id, 'review-thread id'),
    isResolved: requireBoolean(node.isResolved, 'review-thread resolved state'),
    isOutdated: requireBoolean(node.isOutdated, 'review-thread outdated state'),
    path: node.path === null ? null : requireString(node.path, 'review-thread path'),
    line: node.line === null ? null : requireInteger(node.line, 'review-thread line'),
  };
}

function normalizeConnectionPage(connection, normalizeNode, label) {
  if (!isRecord(connection) || !Array.isArray(connection.nodes) || !isRecord(connection.pageInfo)) {
    throw new ReadinessError('pagination_shape', `${label} connection is malformed`);
  }
  return {
    nodes: connection.nodes.map(normalizeNode),
    pageInfo: {
      hasNextPage: requireBoolean(connection.pageInfo.hasNextPage, `${label} hasNextPage`),
      endCursor: connection.pageInfo.endCursor,
    },
  };
}

function evaluateRequiredChecks(requirements, contexts) {
  return requirements.map((requirement) => {
    const matches = contexts.filter((context) => (
      context.name === requirement.context
      && (requirement.app_id === null || context.app_id === requirement.app_id)
    ));
    let result = 'success';
    if (matches.length === 0) result = 'missing';
    else if (matches.some(({ successful }) => !successful)) result = 'not_successful';
    return {
      ...requirement,
      result,
      matched_rows: matches.length,
    };
  });
}

function assertUniqueThreadIds(threads) {
  const ids = new Set();
  for (const thread of threads) {
    if (ids.has(thread.id)) {
      throw new ReadinessError('duplicate_thread_id', 'Review-thread pagination repeated an id');
    }
    ids.add(thread.id);
  }
}

function pullRequestFingerprint(pr) {
  return JSON.stringify(pr);
}

function policyFingerprint(policy) {
  return JSON.stringify(policy);
}

function compareRequirements(left, right) {
  return left.context.localeCompare(right.context)
    || (left.app_id ?? -1) - (right.app_id ?? -1);
}

function normalizeError(error, secrets = []) {
  const redact = (message) => secrets
    .filter((secret) => typeof secret === 'string' && secret.length > 0)
    .reduce((result, secret) => result.split(secret).join('[REDACTED]'), message);
  if (error instanceof ReadinessError) {
    return { code: error.code, message: redact(error.message) };
  }
  return {
    code: 'unexpected_error',
    message: redact(error instanceof Error ? error.message : 'Unknown producer failure'),
  };
}

function requireSha(value, label) {
  const sha = requireString(value, label).toLowerCase();
  if (!SHA_PATTERN.test(sha)) {
    throw new ReadinessError('github_response_shape', `${label} is malformed`);
  }
  return sha;
}

function requireString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new ReadinessError('github_response_shape', `${label} is malformed`);
  }
  return value;
}

function requireBoolean(value, label) {
  if (typeof value !== 'boolean') {
    throw new ReadinessError('github_response_shape', `${label} is malformed`);
  }
  return value;
}

function requireInteger(value, label) {
  if (!Number.isInteger(value)) {
    throw new ReadinessError('github_response_shape', `${label} is malformed`);
  }
  return value;
}

function readPath(value, path, label) {
  let current = value;
  for (const key of path) {
    if (!isRecord(current) || !(key in current) || current[key] === null) {
      throw new ReadinessError('github_response_shape', `${label} is missing`);
    }
    current = current[key];
  }
  if (!isRecord(current)) {
    throw new ReadinessError('github_response_shape', `${label} is malformed`);
  }
  return current;
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function emptyPage() {
  return { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } };
}

const PR_QUERY = `
  query PullRequestReadiness($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        headRefOid
        baseRefOid
        baseRef { target { oid } }
        baseRefName
        state
        isDraft
        reviewDecision
        mergeable
        mergeStateStatus
      }
    }
  }
`;

const CHECKS_QUERY = `
  query PullRequestChecks(
    $owner: String!
    $repo: String!
    $oid: GitObjectID!
    $cursor: String
  ) {
    repository(owner: $owner, name: $repo) {
      object(oid: $oid) {
        ... on Commit {
          oid
          statusCheckRollup {
            contexts(first: 100, after: $cursor) {
              pageInfo { hasNextPage endCursor }
              nodes {
                __typename
                ... on CheckRun {
                  name
                  status
                  conclusion
                  checkSuite { app { databaseId slug } }
                }
                ... on StatusContext { context state }
              }
            }
          }
        }
      }
    }
  }
`;

const THREADS_QUERY = `
  query PullRequestThreads(
    $owner: String!
    $repo: String!
    $number: Int!
    $cursor: String
  ) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        reviewThreads(first: 100, after: $cursor) {
          totalCount
          pageInfo { hasNextPage endCursor }
          nodes { id isResolved isOutdated path line }
        }
      }
    }
  }
`;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runCli();
}
