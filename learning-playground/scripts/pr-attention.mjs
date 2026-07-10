#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

export const ATTENTION_SCHEMA_VERSION = 1;
export const ATTENTION_DECISION_TYPE = 'kennedi.pr-attention';
export const MAX_INPUT_BYTES = 2 * 1024 * 1024;
export const PAGE_SIZE = 100;
export const MAX_PAGES = 100;

const EVENT_SOURCES = new Set(['push', 'review', 'comment', 'check']);
const DIRECT_ATTENTION_SOURCES = new Set(['push', 'review', 'comment']);
const PENDING_CHECK_STATES = new Set([
  'QUEUED',
  'IN_PROGRESS',
  'PENDING',
  'EXPECTED',
  'WAITING',
  'REQUESTED',
]);
const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const PR_STATES = new Set(['OPEN', 'CLOSED', 'MERGED']);
const REVIEW_DECISIONS = new Set(['CHANGES_REQUESTED', 'APPROVED', 'REVIEW_REQUIRED']);
const MERGEABLE_STATES = new Set(['MERGEABLE', 'CONFLICTING', 'UNKNOWN']);
const MERGE_STATE_STATUSES = new Set([
  'DIRTY',
  'UNKNOWN',
  'BLOCKED',
  'BEHIND',
  'UNSTABLE',
  'HAS_HOOKS',
  'CLEAN',
]);
const POLICY_SOURCE_FIELDS = [
  'classic_protection',
  'applicable_branch_rule_pages',
  'applicable_branch_rules',
  'required_status_check_rules',
];

export class AttentionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AttentionError';
    this.code = code;
  }
}

export function parseWakeSource(argv) {
  if (argv.length !== 2 || argv[0] !== '--wake-source' || !EVENT_SOURCES.has(argv[1])) {
    throw new AttentionError(
      'invalid_wake_source',
      'Usage: pr-attention.mjs --wake-source push|review|comment|check'
    );
  }
  return argv[1];
}

export function parseReadinessProof(raw) {
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new AttentionError('empty_input', 'Readiness proof input is empty');
  }
  if (Buffer.byteLength(raw, 'utf8') > MAX_INPUT_BYTES) {
    throw new AttentionError('input_too_large', 'Readiness proof exceeds 2 MiB');
  }

  let proof;
  try {
    proof = JSON.parse(raw);
  } catch {
    throw new AttentionError('invalid_json', 'Readiness proof is not valid JSON');
  }
  if (!isRecord(proof)) throw new AttentionError('invalid_proof', 'Proof must be an object');
  if (proof.schema_version !== 1 || proof.proof_type !== 'kennedi.pr-readiness') {
    throw new AttentionError('unsupported_proof', 'Unsupported readiness proof schema');
  }
  if (!['ready', 'not_ready', 'error'].includes(proof.status)) {
    throw new AttentionError('invalid_proof', 'Readiness proof status is invalid');
  }
  if (typeof proof.ready !== 'boolean' || !Array.isArray(proof.failure_codes)) {
    throw new AttentionError('invalid_proof', 'Readiness proof fields are invalid');
  }
  if (proof.failure_codes.some((code) => typeof code !== 'string' || code.length === 0)) {
    throw new AttentionError('invalid_proof', 'Readiness proof failure codes are invalid');
  }
  if (new Set(proof.failure_codes).size !== proof.failure_codes.length) {
    throw new AttentionError('invalid_proof', 'Readiness proof failure codes repeat');
  }
  if (
    (proof.status === 'ready' && (!proof.ready || proof.failure_codes.length !== 0))
    || (proof.status === 'not_ready' && (proof.ready || proof.failure_codes.length === 0))
    || (proof.status === 'error' && proof.ready)
  ) {
    throw new AttentionError('contradictory_proof', 'Readiness proof status contradicts fields');
  }

  if (proof.status !== 'error') {
    if (!SHA_PATTERN.test(proof.expected_head_sha ?? '')) {
      throw new AttentionError('invalid_proof', 'Readiness proof expected head is invalid');
    }
    const initial = readRecord(proof, 'pr', 'initial');
    const final = readRecord(proof, 'pr', 'final');
    validatePullRequestSnapshot(initial);
    validatePullRequestSnapshot(final);
    if (typeof proof.pr.metadata_stable !== 'boolean') {
      throw new AttentionError('invalid_proof', 'Readiness proof PR state is invalid');
    }
    const policy = readRecord(proof, 'policy');
    const initialPolicy = readRecord(proof, 'policy', 'initial');
    const finalPolicy = readRecord(proof, 'policy', 'final');
    if (typeof policy.stable !== 'boolean') {
      throw new AttentionError('invalid_proof', 'Readiness proof policy state is invalid');
    }
    validateRequiredPolicy(initialPolicy);
    validateRequiredPolicy(finalPolicy);
    const checks = readRecord(proof, 'checks');
    if (
      typeof checks.complete !== 'boolean'
      || !Number.isInteger(checks.pages)
      || checks.pages < 1
      || checks.pages > MAX_PAGES
      || !SHA_PATTERN.test(checks.head_sha ?? '')
      || !Array.isArray(checks.contexts)
      || !Array.isArray(checks.required_results)
    ) {
      throw new AttentionError('invalid_proof', 'Readiness proof check evidence is invalid');
    }
    if (!checks.complete) {
      throw new AttentionError('incomplete_proof', 'Readiness proof check evidence is incomplete');
    }
    if (checks.contexts.length > checks.pages * PAGE_SIZE) {
      throw new AttentionError('contradictory_proof', 'Check context count exceeds page capacity');
    }
    for (const context of checks.contexts) validateCheckContext(context);
    for (const result of checks.required_results) validateRequiredResult(result);
    validateRequiredResultsAgainstContexts(checks);
    validateRequiredResultsAgainstPolicy(checks.required_results, initialPolicy.requiredChecks);
    const threads = readRecord(proof, 'review_threads');
    if (
      typeof threads.complete !== 'boolean'
      || !Number.isInteger(threads.pages)
      || threads.pages < 1
      || threads.pages > MAX_PAGES
      || !Number.isInteger(threads.total_count)
      || !Number.isInteger(threads.unresolved_count)
      || !Array.isArray(threads.unresolved_ids)
      || !Number.isInteger(threads.outdated_unresolved_count)
    ) {
      throw new AttentionError('invalid_proof', 'Readiness proof thread evidence is invalid');
    }
    if (!threads.complete) {
      throw new AttentionError('incomplete_proof', 'Readiness proof thread evidence is incomplete');
    }
    validateReviewThreadSummary(threads);
    if (proof.ready && deriveEvidenceReasons(proof).length > 0) {
      throw new AttentionError('contradictory_proof', 'Ready proof is incomplete or stale');
    }
  }
  return proof;
}

export function decideAttention(wakeSource, proof) {
  if (!EVENT_SOURCES.has(wakeSource)) {
    throw new AttentionError('invalid_wake_source', 'Wake source is invalid');
  }
  const base = {
    schema_version: ATTENTION_SCHEMA_VERSION,
    decision_type: ATTENTION_DECISION_TYPE,
    wake_source: wakeSource,
    expected_head_sha: proof.expected_head_sha ?? null,
    merge_authorized: false,
  };
  const evidenceReasons = proof.status === 'error' ? [] : deriveEvidenceReasons(proof);
  const proofReasons = proof.status === 'error'
    ? ['proof_error']
    : [...new Set([...proof.failure_codes, ...evidenceReasons])].sort();

  if (
    proof.status !== 'error'
    && proof.pr.initial.state !== 'OPEN'
    && proof.pr.final.state === proof.pr.initial.state
  ) {
    return {
      ...base,
      decision: 'terminal',
      next_state: 'terminal',
      action: 'stop',
      ready_for_scheduled_confirmation: false,
      reason_codes: ['pr_terminal'],
    };
  }

  if (DIRECT_ATTENTION_SOURCES.has(wakeSource)) {
    return attention(base, [`event_${wakeSource}`, ...proofReasons]);
  }

  if (proof.status === 'error') return attention(base, ['proof_error']);
  if (proof.ready) {
    return {
      ...base,
      decision: 'waiting',
      next_state: 'waiting',
      action: 'report_ready',
      ready_for_scheduled_confirmation: true,
      reason_codes: ['ready_for_scheduled_confirmation'],
    };
  }

  if (isOnlyWaitableState(proof, proofReasons)) {
    return {
      ...base,
      decision: 'waiting',
      next_state: 'waiting',
      action: 'wait',
      ready_for_scheduled_confirmation: false,
      reason_codes: proofReasons,
    };
  }
  return attention(base, proofReasons);
}

export async function readBoundedInput(stream, maxBytes = MAX_INPUT_BYTES) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > maxBytes) {
      throw new AttentionError('input_too_large', 'Readiness proof exceeds 2 MiB');
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export async function runCli({
  argv = process.argv.slice(2),
  stdin = process.stdin,
  inputText,
  stdout = process.stdout,
} = {}) {
  try {
    const wakeSource = parseWakeSource(argv);
    const raw = inputText ?? await readBoundedInput(stdin);
    const proof = parseReadinessProof(raw);
    const decision = decideAttention(wakeSource, proof);
    stdout.write(`${JSON.stringify(decision, null, 2)}\n`);
    return exitCodeFor(decision.decision);
  } catch (error) {
    const normalized = error instanceof AttentionError
      ? { code: error.code, message: error.message }
      : {
          code: 'unexpected_error',
          message: error instanceof Error ? error.message : 'Unknown attention failure',
        };
    stdout.write(`${JSON.stringify({
      schema_version: ATTENTION_SCHEMA_VERSION,
      decision_type: ATTENTION_DECISION_TYPE,
      decision: 'error',
      next_state: 'blocked',
      action: 'stop',
      ready_for_scheduled_confirmation: false,
      merge_authorized: false,
      reason_codes: ['attention_error'],
      error: normalized,
    }, null, 2)}\n`);
    return 2;
  }
}

function isOnlyWaitableState(proof, reasons) {
  const waitableCodes = new Set(['pr_is_draft', 'required_check_not_successful']);
  if (reasons.some((code) => !waitableCodes.has(code))) return false;
  if (
    reasons.includes('pr_is_draft')
    && !proof.pr.initial.isDraft
    && !proof.pr.final.isDraft
  ) {
    return false;
  }

  const incomplete = proof.checks.required_results.filter((result) => result.result !== 'success');
  if (incomplete.length === 0) return !reasons.includes('required_check_not_successful');
  const contextIndex = indexCheckContexts(proof.checks.contexts);
  return incomplete.every((required) => {
    if (required.result !== 'not_successful') return false;
    const matches = matchingContexts(contextIndex, required);
    return matches.length > 0 && matches.every(isPendingContext);
  });
}

function deriveEvidenceReasons(proof) {
  const reasons = [];
  const { initial, final } = proof.pr;
  if (initial.state !== 'OPEN' || final.state !== 'OPEN') reasons.push('pr_not_open');
  if (initial.isDraft || final.isDraft) reasons.push('pr_is_draft');
  if (
    initial.headRefOid !== proof.expected_head_sha
    || final.headRefOid !== proof.expected_head_sha
    || proof.checks.head_sha !== proof.expected_head_sha
  ) {
    reasons.push('expected_head_mismatch');
  }
  if (initial.headRefOid !== final.headRefOid) reasons.push('head_changed');
  if (initial.baseRefOid !== final.baseRefOid) reasons.push('base_changed');
  if (initial.baseBranchOid !== final.baseBranchOid) reasons.push('base_branch_changed');
  if (
    initial.baseRefOid !== initial.baseBranchOid
    || final.baseRefOid !== final.baseBranchOid
  ) {
    reasons.push('base_not_current');
  }
  if (!proof.pr.metadata_stable || JSON.stringify(initial) !== JSON.stringify(final)) {
    reasons.push('pr_metadata_changed');
  }

  const initialRequirements = proof.policy.initial.requiredChecks;
  if (!proof.policy.stable || JSON.stringify(proof.policy.initial) !== JSON.stringify(proof.policy.final)) {
    reasons.push('required_policy_changed');
  }
  if (initialRequirements.length === 0) reasons.push('required_policy_empty');
  if (!initialRequirements.some(({ context }) => context === 'quality-gate')) {
    reasons.push('required_policy_missing_quality_gate');
  }
  if (proof.checks.required_results.some(({ result }) => result === 'missing')) {
    reasons.push('required_check_missing');
  }
  if (proof.checks.required_results.some(({ result }) => result === 'not_successful')) {
    reasons.push('required_check_not_successful');
  }
  if (proof.review_threads.unresolved_count > 0) reasons.push('review_threads_unresolved');
  if (
    initial.reviewDecision === 'CHANGES_REQUESTED'
    || final.reviewDecision === 'CHANGES_REQUESTED'
  ) {
    reasons.push('changes_requested');
  }
  if (initial.mergeable === 'UNKNOWN' || final.mergeable === 'UNKNOWN') {
    reasons.push('mergeability_unknown');
  } else if (initial.mergeable !== 'MERGEABLE' || final.mergeable !== 'MERGEABLE') {
    reasons.push('merge_conflict');
  }
  if (initial.mergeStateStatus === 'UNKNOWN' || final.mergeStateStatus === 'UNKNOWN') {
    reasons.push('merge_state_unknown');
  } else if (initial.mergeStateStatus !== 'CLEAN' || final.mergeStateStatus !== 'CLEAN') {
    reasons.push('merge_state_not_clean');
  }
  return reasons;
}

function isPendingContext(context) {
  if (!PENDING_CHECK_STATES.has(context.status)) return false;
  if (context.type === 'check_run') return context.conclusion === null;
  return context.conclusion === context.status;
}

function indexCheckContexts(contexts) {
  const byName = new Map();
  const byNameAndApp = new Map();
  for (const context of contexts) {
    const named = byName.get(context.name) ?? [];
    named.push(context);
    byName.set(context.name, named);

    const key = requirementKey({ context: context.name, app_id: context.app_id });
    const bound = byNameAndApp.get(key) ?? [];
    bound.push(context);
    byNameAndApp.set(key, bound);
  }
  return { byName, byNameAndApp };
}

function matchingContexts(index, requirement) {
  if (requirement.app_id === null) return index.byName.get(requirement.context) ?? [];
  return index.byNameAndApp.get(requirementKey(requirement)) ?? [];
}

function attention(base, reasons) {
  return {
    ...base,
    decision: 'attention',
    next_state: 'attention',
    action: 'inspect',
    ready_for_scheduled_confirmation: false,
    reason_codes: [...new Set(reasons)].sort(),
  };
}

function exitCodeFor(decision) {
  if (decision === 'attention') return 0;
  if (decision === 'waiting') return 1;
  if (decision === 'terminal') return 3;
  return 2;
}

function validatePullRequestSnapshot(snapshot) {
  if (
    !isRecord(snapshot)
    || !SHA_PATTERN.test(snapshot.headRefOid ?? '')
    || !SHA_PATTERN.test(snapshot.baseRefOid ?? '')
    || !SHA_PATTERN.test(snapshot.baseBranchOid ?? '')
    || typeof snapshot.baseRefName !== 'string'
    || snapshot.baseRefName.length === 0
    || !PR_STATES.has(snapshot.state)
    || typeof snapshot.isDraft !== 'boolean'
    || (snapshot.reviewDecision !== null && (
      !REVIEW_DECISIONS.has(snapshot.reviewDecision)
    ))
    || !MERGEABLE_STATES.has(snapshot.mergeable)
    || !MERGE_STATE_STATUSES.has(snapshot.mergeStateStatus)
  ) {
    throw new AttentionError('invalid_proof', 'Readiness proof PR state is invalid');
  }
}

function validateRequiredPolicy(policy) {
  if (!isRecord(policy) || !isRecord(policy.sources) || !Array.isArray(policy.requiredChecks)) {
    throw new AttentionError('invalid_proof', 'Readiness proof policy state is invalid');
  }
  validatePolicySources(policy.sources);
  const keys = new Set();
  for (const requirement of policy.requiredChecks) {
    validateRequirement(requirement);
    const key = requirementKey(requirement);
    if (keys.has(key)) {
      throw new AttentionError('contradictory_proof', 'Required policy repeats a requirement');
    }
    keys.add(key);
  }
}

function validatePolicySources(sources) {
  const keys = Object.keys(sources).sort();
  const expectedKeys = [...POLICY_SOURCE_FIELDS].sort();
  if (
    keys.length !== expectedKeys.length
    || keys.some((key, index) => key !== expectedKeys[index])
    || typeof sources.classic_protection !== 'boolean'
    || !Number.isInteger(sources.applicable_branch_rule_pages)
    || !Number.isInteger(sources.applicable_branch_rules)
    || !Number.isInteger(sources.required_status_check_rules)
  ) {
    throw new AttentionError('invalid_proof', 'Readiness proof policy sources are invalid');
  }

  const pages = sources.applicable_branch_rule_pages;
  const rules = sources.applicable_branch_rules;
  const requiredRules = sources.required_status_check_rules;
  if (
    pages < 1
    || pages > MAX_PAGES
    || rules < (pages - 1) * PAGE_SIZE
    || rules >= pages * PAGE_SIZE
    || requiredRules < 0
    || requiredRules > rules
  ) {
    throw new AttentionError('contradictory_proof', 'Policy source counts are contradictory');
  }
}

function validateRequirement(requirement) {
  if (
    !isRecord(requirement)
    || typeof requirement.context !== 'string'
    || requirement.context.length === 0
    || (requirement.app_id !== null && (
      !Number.isInteger(requirement.app_id) || requirement.app_id <= 0
    ))
  ) {
    throw new AttentionError('invalid_proof', 'Required policy requirement is invalid');
  }
}

function validateCheckContext(context) {
  if (
    !isRecord(context)
    || !['check_run', 'status_context'].includes(context.type)
    || typeof context.name !== 'string'
    || context.name.length === 0
    || typeof context.status !== 'string'
    || context.status.length === 0
    || typeof context.successful !== 'boolean'
    || (context.conclusion !== null && (
      typeof context.conclusion !== 'string' || context.conclusion.length === 0
    ))
    || (context.app_id !== null && (!Number.isInteger(context.app_id) || context.app_id <= 0))
  ) {
    throw new AttentionError('invalid_proof', 'Readiness proof check context is invalid');
  }
  if (
    (context.type === 'check_run' && context.status !== 'COMPLETED' && context.conclusion !== null)
    || (context.type === 'status_context' && (
      context.app_id !== null || context.conclusion !== context.status
    ))
  ) {
    throw new AttentionError('contradictory_proof', 'Check context status contradicts conclusion');
  }
  const expectedSuccess = context.type === 'check_run'
    ? context.status === 'COMPLETED' && context.conclusion === 'SUCCESS'
    : context.status === 'SUCCESS' && context.conclusion === 'SUCCESS';
  if (context.successful !== expectedSuccess) {
    throw new AttentionError('contradictory_proof', 'Check context success contradicts its state');
  }
}

function validateRequiredResult(result) {
  if (
    !isRecord(result)
    || typeof result.context !== 'string'
    || result.context.length === 0
    || !['success', 'missing', 'not_successful'].includes(result.result)
    || !Number.isInteger(result.matched_rows)
    || result.matched_rows < 0
    || (result.app_id !== null && (!Number.isInteger(result.app_id) || result.app_id <= 0))
  ) {
    throw new AttentionError('invalid_proof', 'Readiness proof required result is invalid');
  }
  if (
    (result.result === 'missing' && result.matched_rows !== 0)
    || (result.result !== 'missing' && result.matched_rows === 0)
  ) {
    throw new AttentionError('contradictory_proof', 'Required result contradicts matched rows');
  }
}

function validateRequiredResultsAgainstPolicy(results, requirements) {
  const resultKeys = results.map(requirementKey);
  const requirementKeys = requirements.map(requirementKey);
  const requirementKeySet = new Set(requirementKeys);
  if (
    new Set(resultKeys).size !== resultKeys.length
    || resultKeys.length !== requirementKeys.length
    || resultKeys.some((key) => !requirementKeySet.has(key))
  ) {
    throw new AttentionError(
      'contradictory_proof',
      'Required check results do not cover the required policy'
    );
  }
}

function validateReviewThreadSummary(threads) {
  const ids = threads.unresolved_ids;
  if (ids.some((id) => typeof id !== 'string' || id.length === 0)) {
    throw new AttentionError('invalid_proof', 'Readiness proof thread ids are invalid');
  }
  if (
    threads.total_count < 0
    || threads.unresolved_count < 0
    || threads.outdated_unresolved_count < 0
    || new Set(ids).size !== ids.length
    || threads.unresolved_count !== ids.length
    || threads.unresolved_count > threads.total_count
    || threads.outdated_unresolved_count > threads.unresolved_count
    || threads.total_count > threads.pages * PAGE_SIZE
  ) {
    throw new AttentionError('contradictory_proof', 'Review thread summary is contradictory');
  }
}

function requirementKey(requirement) {
  return `${requirement.context}\u0000${requirement.app_id ?? '*'}`;
}

function validateRequiredResultsAgainstContexts(checks) {
  const contextIndex = indexCheckContexts(checks.contexts);
  for (const required of checks.required_results) {
    const matches = matchingContexts(contextIndex, required);
    let actualResult = 'success';
    if (matches.length === 0) actualResult = 'missing';
    else if (matches.some((context) => !context.successful)) actualResult = 'not_successful';

    if (required.matched_rows !== matches.length || required.result !== actualResult) {
      throw new AttentionError(
        'contradictory_proof',
        'Required check result contradicts matching check contexts'
      );
    }
  }
}

function readRecord(value, ...path) {
  let current = value;
  for (const key of path) {
    if (!isRecord(current) || !isRecord(current[key])) {
      throw new AttentionError('invalid_proof', `Readiness proof is missing ${path.join('.')}`);
    }
    current = current[key];
  }
  return current;
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runCli();
}
