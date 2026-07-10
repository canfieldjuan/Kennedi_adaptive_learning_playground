#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

export const ATTENTION_SCHEMA_VERSION = 1;
export const ATTENTION_DECISION_TYPE = 'kennedi.pr-attention';
export const MAX_INPUT_BYTES = 2 * 1024 * 1024;

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
    if (
      typeof initial.state !== 'string'
      || initial.state.length === 0
      || typeof final.state !== 'string'
      || final.state.length === 0
      || !SHA_PATTERN.test(initial.headRefOid ?? '')
      || !SHA_PATTERN.test(final.headRefOid ?? '')
      || typeof proof.pr.metadata_stable !== 'boolean'
    ) {
      throw new AttentionError('invalid_proof', 'Readiness proof PR state is invalid');
    }
    const policy = readRecord(proof, 'policy');
    if (typeof policy.stable !== 'boolean') {
      throw new AttentionError('invalid_proof', 'Readiness proof policy state is invalid');
    }
    const checks = readRecord(proof, 'checks');
    if (
      typeof checks.complete !== 'boolean'
      || !SHA_PATTERN.test(checks.head_sha ?? '')
      || !Array.isArray(checks.contexts)
      || !Array.isArray(checks.required_results)
    ) {
      throw new AttentionError('invalid_proof', 'Readiness proof check evidence is invalid');
    }
    for (const context of checks.contexts) validateCheckContext(context);
    for (const result of checks.required_results) validateRequiredResult(result);
    const threads = readRecord(proof, 'review_threads');
    if (
      typeof threads.complete !== 'boolean'
      || !Number.isInteger(threads.unresolved_count)
      || threads.unresolved_count < 0
    ) {
      throw new AttentionError('invalid_proof', 'Readiness proof thread evidence is invalid');
    }
    if (proof.ready && (
      initial.state !== 'OPEN'
      || final.state !== 'OPEN'
      || initial.headRefOid !== proof.expected_head_sha
      || final.headRefOid !== proof.expected_head_sha
      || !proof.pr.metadata_stable
      || !policy.stable
      || !checks.complete
      || checks.head_sha !== proof.expected_head_sha
      || checks.required_results.length === 0
      || checks.required_results.some((result) => result.result !== 'success')
      || !threads.complete
      || threads.unresolved_count !== 0
    )) {
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
    const proofReasons = proof.status === 'error' ? ['proof_error'] : proof.failure_codes;
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

  if (isOnlyWaitableState(proof)) {
    return {
      ...base,
      decision: 'waiting',
      next_state: 'waiting',
      action: 'wait',
      ready_for_scheduled_confirmation: false,
      reason_codes: [...proof.failure_codes].sort(),
    };
  }
  return attention(base, proof.failure_codes);
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

function isOnlyWaitableState(proof) {
  const waitableCodes = new Set(['pr_is_draft', 'required_check_not_successful']);
  if (proof.failure_codes.some((code) => !waitableCodes.has(code))) return false;
  if (!proof.failure_codes.includes('required_check_not_successful')) return true;

  const incomplete = proof.checks.required_results.filter((result) => result.result !== 'success');
  if (incomplete.length === 0) return false;
  return incomplete.every((required) => {
    if (required.result !== 'not_successful') return false;
    const matches = proof.checks.contexts.filter((context) => (
      context.name === required.context
      && (required.app_id === null || context.app_id === required.app_id)
    ));
    return matches.length > 0 && matches.every((context) => (
      PENDING_CHECK_STATES.has(context.status)
    ));
  });
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

function validateCheckContext(context) {
  if (
    !isRecord(context)
    || !['check_run', 'status_context'].includes(context.type)
    || typeof context.name !== 'string'
    || typeof context.status !== 'string'
    || typeof context.successful !== 'boolean'
    || (context.conclusion !== null && typeof context.conclusion !== 'string')
    || (context.app_id !== null && (!Number.isInteger(context.app_id) || context.app_id <= 0))
  ) {
    throw new AttentionError('invalid_proof', 'Readiness proof check context is invalid');
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
