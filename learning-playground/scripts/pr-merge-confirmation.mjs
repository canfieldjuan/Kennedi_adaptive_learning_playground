#!/usr/bin/env node

import { pathToFileURL } from 'node:url';
import { parseReadinessProof, readBoundedInput } from './pr-attention.mjs';

export const CONFIRMATION_SCHEMA_VERSION = 1;
export const CONFIRMATION_DECISION_TYPE = 'kennedi.pr-merge-confirmation';

const SCHEDULED_SOURCES = new Set(['scheduled']);
const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export class ConfirmationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ConfirmationError';
    this.code = code;
  }
}

export function parseCliArgs(argv) {
  const values = new Map();
  const supported = new Set(['--wake-source', '--repository', '--pr', '--expected-head']);
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!supported.has(name) || value === undefined || value.startsWith('--')) {
      throw invalidArguments();
    }
    if (values.has(name)) {
      throw new ConfirmationError('invalid_arguments', `Duplicate argument: ${name}`);
    }
    values.set(name, value);
  }

  const wakeSource = values.get('--wake-source');
  const repository = values.get('--repository');
  const prValue = values.get('--pr');
  const expectedHead = values.get('--expected-head')?.toLowerCase();
  if (!SCHEDULED_SOURCES.has(wakeSource)) {
    throw new ConfirmationError('invalid_wake_source', 'Wake source must be scheduled');
  }
  if (!repository || !REPOSITORY_PATTERN.test(repository)) throw invalidArguments();
  const [owner, repo] = repository.split('/');
  if (owner === '.' || owner === '..' || repo === '.' || repo === '..') {
    throw invalidArguments();
  }
  if (!prValue || !/^[1-9][0-9]*$/.test(prValue)) throw invalidArguments();
  if (!expectedHead || !SHA_PATTERN.test(expectedHead)) throw invalidArguments();
  return { wakeSource, repository, prNumber: Number(prValue), expectedHead };
}

export function decideConfirmation(input, proof) {
  validateProofIdentity(input, proof);
  const base = {
    schema_version: CONFIRMATION_SCHEMA_VERSION,
    decision_type: CONFIRMATION_DECISION_TYPE,
    wake_source: input.wakeSource,
    repository: input.repository,
    pull_request: input.prNumber,
    expected_head_sha: input.expectedHead,
    proof_observed_at: proof.observed_at ?? null,
    merge_authorized: false,
  };

  if (
    proof.status !== 'error'
    && proof.pr.metadata_stable
    && proof.pr.initial.state !== 'OPEN'
    && proof.pr.final.state === proof.pr.initial.state
  ) {
    return {
      ...base,
      decision: 'terminal',
      next_state: 'terminal',
      action: 'stop',
      ready_for_guarded_merge: false,
      reason_codes: ['pr_terminal'],
    };
  }

  if (proof.status === 'error') {
    return {
      ...base,
      decision: 'error',
      next_state: 'blocked',
      action: 'stop',
      ready_for_guarded_merge: false,
      reason_codes: ['proof_error'],
    };
  }

  if (proof.ready) {
    return {
      ...base,
      decision: 'ready',
      next_state: 'scheduled_confirmation',
      action: 'report_ready',
      ready_for_guarded_merge: true,
      reason_codes: ['fresh_readiness_proof_ready'],
    };
  }

  return {
    ...base,
    decision: 'not_ready',
    next_state: 'waiting',
    action: 'wait',
    ready_for_guarded_merge: false,
    reason_codes: [...proof.failure_codes].sort(),
  };
}

export async function runCli({
  argv = process.argv.slice(2),
  stdin = process.stdin,
  inputText,
  stdout = process.stdout,
} = {}) {
  let input = null;
  try {
    input = parseCliArgs(argv);
    const raw = inputText ?? await readBoundedInput(stdin);
    const proof = parseReadinessProof(raw);
    const decision = decideConfirmation(input, proof);
    stdout.write(`${JSON.stringify(decision, null, 2)}\n`);
    return exitCodeFor(decision.decision);
  } catch (error) {
    const normalized = normalizeError(error);
    stdout.write(`${JSON.stringify({
      schema_version: CONFIRMATION_SCHEMA_VERSION,
      decision_type: CONFIRMATION_DECISION_TYPE,
      wake_source: input?.wakeSource ?? null,
      repository: input?.repository ?? null,
      pull_request: input?.prNumber ?? null,
      expected_head_sha: input?.expectedHead ?? null,
      proof_observed_at: null,
      decision: 'error',
      next_state: 'blocked',
      action: 'stop',
      ready_for_guarded_merge: false,
      merge_authorized: false,
      reason_codes: ['confirmation_error'],
      error: normalized,
    }, null, 2)}\n`);
    return 2;
  }
}

function exitCodeFor(decision) {
  if (decision === 'ready') return 0;
  if (decision === 'not_ready') return 1;
  if (decision === 'terminal') return 3;
  return 2;
}

function validateProofIdentity(input, proof) {
  if (proof.status === 'error') return;
  if (
    proof.repository !== input.repository
    || proof.pull_request !== input.prNumber
    || proof.expected_head_sha.toLowerCase() !== input.expectedHead
  ) {
    throw new ConfirmationError(
      'proof_identity_mismatch',
      'Readiness proof does not match the owned repository, PR, and expected head'
    );
  }
  if (
    typeof proof.observed_at !== 'string'
    || proof.observed_at.length === 0
    || Number.isNaN(Date.parse(proof.observed_at))
  ) {
    throw new ConfirmationError(
      'invalid_observation_time',
      'Readiness proof observation timestamp is invalid'
    );
  }
}

function invalidArguments() {
  return new ConfirmationError(
    'invalid_arguments',
    'Usage: pr-merge-confirmation.mjs --wake-source scheduled --repository owner/name --pr NUMBER --expected-head SHA'
  );
}

function normalizeError(error) {
  if (
    error instanceof Error
    && typeof error.code === 'string'
    && error.code.length > 0
  ) {
    return { code: error.code, message: error.message };
  }
  return {
    code: 'unexpected_error',
    message: error instanceof Error ? error.message : 'Unknown confirmation failure',
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runCli();
}
