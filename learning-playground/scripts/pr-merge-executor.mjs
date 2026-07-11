#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { statSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { parseReadinessProof } from './pr-attention.mjs';
import { decideConfirmation } from './pr-merge-confirmation.mjs';

export const EXECUTION_SCHEMA_VERSION = 1;
export const EXECUTION_DECISION_TYPE = 'kennedi.pr-merge-execution';
export const MAX_AUTHORITY_BYTES = 64 * 1024;

const execFileAsync = promisify(execFile);
const SHA = /^[0-9a-f]{40}$/i;
const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const BRANCH = /^[A-Za-z0-9._/-]+$/;
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

export class MergeExecutionError extends Error {
  constructor(code, message, mergeOutcome = 'not_performed') {
    super(message);
    this.name = 'MergeExecutionError';
    this.code = code;
    this.mergeOutcome = mergeOutcome;
  }
}

export function parseCliArgs(argv) {
  const names = new Set([
    '--wake-source', '--repository', '--pr', '--expected-head', '--branch',
    '--worktree', '--authorization-file',
  ]);
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!names.has(name) || value === undefined || value.startsWith('--') || values.has(name)) {
      throw invalidArguments();
    }
    values.set(name, value);
  }
  const input = {
    wakeSource: values.get('--wake-source'),
    repository: values.get('--repository'),
    prNumber: Number(values.get('--pr')),
    expectedHead: values.get('--expected-head')?.toLowerCase(),
    branch: values.get('--branch'),
    worktree: values.get('--worktree'),
    authorizationFile: values.get('--authorization-file'),
  };
  if (
    input.wakeSource !== 'scheduled'
    || !REPO.test(input.repository ?? '')
    || !Number.isInteger(input.prNumber) || input.prNumber <= 0
    || !SHA.test(input.expectedHead ?? '')
    || !BRANCH.test(input.branch ?? '') || input.branch.includes('..')
    || !isAbsolute(input.worktree ?? '')
    || !isAbsolute(input.authorizationFile ?? '')
  ) throw invalidArguments();
  return input;
}

export function parseAuthorizationRecord(raw, input) {
  if (typeof raw !== 'string' || Buffer.byteLength(raw) > MAX_AUTHORITY_BYTES) {
    throw new MergeExecutionError('authority_size', 'Authorization record is missing or oversized');
  }
  const field = (label) => {
    const pattern = new RegExp(`^${escapeRegex(label)}: (.+)$`, 'gm');
    const matches = [...raw.matchAll(pattern)];
    if (matches.length !== 1) {
      throw new MergeExecutionError('authority_shape', `Authorization field must occur once: ${label}`);
    }
    return matches[0][1].trim();
  };
  const expectedAction = `merge-pr-${input.prNumber}-after-fresh-gate`;
  const allowed = field('Allowed actions').split(' | ');
  if (
    field('Repository') !== input.repository
    || field('Status') !== 'scheduled_confirmation'
    || field('PR') !== String(input.prNumber)
    || field('Branch') !== input.branch
    || field('Worktree') !== input.worktree
    || field('Expected head SHA').toLowerCase() !== input.expectedHead
    || !allowed.includes(expectedAction)
    || field('Merge authorization') !== `one-shot for PR #${input.prNumber} at ${input.expectedHead}`
    || field('Authorization source') === 'none'
  ) {
    throw new MergeExecutionError('authority_mismatch', 'Authorization record does not grant this exact merge');
  }
  return { source: field('Authorization source') };
}

export async function executeGuardedMerge(input, authorityRaw, {
  run = runCommand,
  cwd = process.cwd(),
  canonicalize = realpathSync,
  scriptDir = SCRIPT_DIR,
} = {}) {
  parseAuthorizationRecord(authorityRaw, input);
  const canonicalCwd = canonicalize(cwd);
  const canonicalAuthorized = canonicalize(input.worktree);
  if (canonicalCwd !== canonicalAuthorized) fail('worktree_mismatch', 'Current worktree is not authorized');

  await assertLocalState(input, { run, cwd, canonicalAuthorized });

  let producer;
  try {
    producer = await run(process.execPath, [
      resolve(scriptDir, 'pr-readiness.mjs'), '--repository', input.repository,
      '--pr', String(input.prNumber), '--expected-head', input.expectedHead,
    ], { cwd, timeout: 120_000 });
  } catch {
    fail('readiness_failed', 'Live readiness producer did not prove readiness');
  }
  const proof = parseReadinessProof(producer.stdout);
  const confirmationInput = {
    wakeSource: 'scheduled', repository: input.repository,
    prNumber: input.prNumber, expectedHead: input.expectedHead,
  };
  const confirmation = decideConfirmation(confirmationInput, proof);
  if (
    confirmation.decision !== 'ready'
    || confirmation.ready_for_guarded_merge !== true
    || confirmation.merge_authorized !== false
  ) fail('confirmation_not_ready', 'Scheduled confirmation did not prove readiness');

  await assertLocalState(input, { run, cwd, canonicalAuthorized });
  try {
    await run('gh', [
      'pr', 'merge', String(input.prNumber), '--repo', input.repository,
      '--merge', '--match-head-commit', input.expectedHead,
    ], { cwd, timeout: 30_000 });
  } catch {
    throw new MergeExecutionError('merge_outcome_unknown', 'Merge command outcome is unknown', 'unknown');
  }
  let receipt;
  try {
    const receiptResult = await run('gh', [
      'pr', 'view', String(input.prNumber), '--repo', input.repository,
      '--json', 'state,mergedAt,mergeCommit,headRefOid,url',
    ], { cwd, timeout: 30_000 });
    receipt = parseJson(receiptResult.stdout, 'receipt_json');
  } catch {
    throw new MergeExecutionError('merge_outcome_unknown', 'Merge receipt outcome is unknown', 'unknown');
  }
  if (
    receipt.state !== 'MERGED'
    || receipt.headRefOid?.toLowerCase() !== input.expectedHead
    || !SHA.test(receipt.mergeCommit?.oid ?? '')
    || typeof receipt.mergedAt !== 'string'
  ) throw new MergeExecutionError('merge_outcome_unknown', 'GitHub did not return a valid merge receipt', 'unknown');
  return {
    schema_version: EXECUTION_SCHEMA_VERSION,
    decision_type: EXECUTION_DECISION_TYPE,
    repository: input.repository,
    pull_request: input.prNumber,
    expected_head_sha: input.expectedHead,
    merge_performed: true,
    merge_commit_sha: receipt.mergeCommit.oid.toLowerCase(),
    merged_at: receipt.mergedAt,
    url: receipt.url,
  };
}

export async function runCli({ argv = process.argv.slice(2), stdout = process.stdout, run = runCommand } = {}) {
  let input;
  try {
    input = parseCliArgs(argv);
    const size = statSync(input.authorizationFile).size;
    if (size > MAX_AUTHORITY_BYTES) fail('authority_size', 'Authorization record is oversized');
    const raw = readFileSync(input.authorizationFile, 'utf8');
    const receipt = await executeGuardedMerge(input, raw, { run });
    stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
    return 0;
  } catch (error) {
    const normalized = normalizeError(error);
    stdout.write(`${JSON.stringify({
      schema_version: EXECUTION_SCHEMA_VERSION,
      decision_type: EXECUTION_DECISION_TYPE,
      repository: input?.repository ?? null,
      pull_request: input?.prNumber ?? null,
      expected_head_sha: input?.expectedHead ?? null,
      merge_performed: error instanceof MergeExecutionError && error.mergeOutcome === 'unknown' ? null : false,
      merge_outcome: error instanceof MergeExecutionError ? error.mergeOutcome : 'not_performed',
      error: normalized,
    }, null, 2)}\n`);
    return 2;
  }
}

async function runCommand(file, args, options) {
  return execFileAsync(file, args, { ...options, maxBuffer: 4 * 1024 * 1024, encoding: 'utf8' });
}
async function assertLocalState(input, { run, cwd, canonicalAuthorized }) {
  const git = async (...args) => (await run('git', args, { cwd })).stdout.trim();
  if (await git('status', '--porcelain') !== '') fail('worktree_dirty', 'Authorized worktree is dirty');
  if (await git('rev-parse', '--show-toplevel') !== canonicalAuthorized) fail('worktree_mismatch', 'Git root is not authorized');
  if (await git('branch', '--show-current') !== input.branch) fail('branch_mismatch', 'Current branch is not authorized');
  if ((await git('rev-parse', 'HEAD')).toLowerCase() !== input.expectedHead) fail('head_mismatch', 'Local HEAD is not authorized');
}
function parseJson(raw, code) {
  try { return JSON.parse(raw); } catch { fail(code, 'Command returned malformed JSON'); }
}
function fail(code, message) { throw new MergeExecutionError(code, message); }
function invalidArguments() { return new MergeExecutionError('invalid_arguments', 'Invalid guarded merge arguments'); }
function escapeRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function normalizeError(error) {
  return error instanceof MergeExecutionError
    ? { code: error.code, message: error.message }
    : { code: 'unexpected_error', message: 'Unexpected guarded merge failure' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runCli();
}
