#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';
import {
  closeSync, constants, existsSync, fstatSync, fsyncSync, linkSync, lstatSync,
  openSync, opendirSync, readSync, realpathSync, unlinkSync, writeSync,
} from 'node:fs';
import { basename, isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const CLAIM_SCHEMA_VERSION = 1;
export const CLAIM_DECISION_TYPE = 'kennedi.pr-wake-claim';
export const MAX_RECORD_BYTES = 16 * 1024;
export const MAX_ROOT_RECORDS = 4096;

const SHA = /^[0-9a-f]{40}$/i;
const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const WAKE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const TOKEN = /^[0-9a-f-]{36}$/i;
const ACTIONS = new Set(['acquire', 'complete', 'abandon']);
const WAKE_SOURCES = new Set(['push', 'review', 'comment', 'check', 'scheduled']);
const WRITE_FLAGS = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL
  | (constants.O_NOFOLLOW ?? 0);
const READ_FLAGS = constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0);

export class WakeClaimError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WakeClaimError';
    this.code = code;
  }
}

export function parseCliArgs(argv) {
  const names = new Set([
    '--action', '--repository', '--pr', '--expected-head', '--wake-source',
    '--wake-id', '--claim-root', '--claim-token',
  ]);
  const values = new Map();
  if (argv.length % 2 !== 0) fail('invalid_arguments', 'Arguments must be name/value pairs');
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!names.has(name) || value.startsWith('--') || values.has(name)) {
      fail('invalid_arguments', 'Unexpected, duplicated, or missing argument value');
    }
    values.set(name, value);
  }
  const input = {
    action: values.get('--action'),
    repository: values.get('--repository'),
    prNumber: Number(values.get('--pr')),
    expectedHead: values.get('--expected-head')?.toLowerCase(),
    wakeSource: values.get('--wake-source'),
    wakeId: values.get('--wake-id'),
    claimRoot: values.get('--claim-root'),
    claimToken: values.get('--claim-token')?.toLowerCase(),
  };
  const needsToken = input.action === 'complete' || input.action === 'abandon';
  if (
    !ACTIONS.has(input.action)
    || !REPO.test(input.repository ?? '')
    || !Number.isInteger(input.prNumber) || input.prNumber <= 0
    || !SHA.test(input.expectedHead ?? '')
    || !WAKE_SOURCES.has(input.wakeSource)
    || !WAKE_ID.test(input.wakeId ?? '')
    || !isAbsolute(input.claimRoot ?? '')
    || (needsToken ? !TOKEN.test(input.claimToken ?? '') : input.claimToken !== undefined)
  ) fail('invalid_arguments', 'Invalid wake claim arguments');
  return input;
}

export function executeClaimAction(input, {
  createToken = randomUUID,
  now = () => new Date().toISOString(),
} = {}) {
  const root = validateRoot(input.claimRoot);
  const paths = claimPaths(root, input);
  if (input.action === 'acquire') return acquire(input, paths, { createToken, now });
  if (input.action === 'complete') return complete(input, paths, { now });
  return abandon(input, paths, { now });
}

export function runCli({ argv = process.argv.slice(2), stdout = process.stdout } = {}) {
  let input;
  try {
    input = parseCliArgs(argv);
    const result = executeClaimAction(input);
    stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return result.decision === 'busy' || result.decision === 'duplicate' ? 1 : 0;
  } catch (error) {
    const normalized = error instanceof WakeClaimError
      ? { code: error.code, message: error.message }
      : { code: 'unexpected_error', message: 'Unexpected wake claim failure' };
    stdout.write(`${JSON.stringify({ ...baseResult(input, 'error'), error: normalized }, null, 2)}\n`);
    return 2;
  }
}

function acquire(input, paths, { createToken, now }) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (existsSync(paths.completed)) {
      validateCompleted(readRecord(paths.completed), input);
      return baseResult(input, 'duplicate');
    }
    if (existsSync(paths.transition)) return baseResult(input, 'busy');
    if (existsSync(paths.active)) {
      const active = readRecord(paths.active);
      validateActive(active, input);
      return baseResult(input, active.wake_id === input.wakeId
        && active.wake_source === input.wakeSource ? 'duplicate' : 'busy');
    }
    assertRootCapacity(paths.root);
    const token = createToken().toLowerCase();
    if (!TOKEN.test(token)) fail('token_generation', 'Generated claim token is invalid');
    const record = activeRecord(input, token, now());
    try {
      createRecord(paths.active, record, paths.root);
      return { ...baseResult(input, 'acquired'), claim_token: token };
    } catch (error) {
      if (!(error && typeof error === 'object' && error.code === 'EEXIST')) throw error;
      try {
        const active = readRecord(paths.active);
        validateActive(active, input);
        return baseResult(input, active.wake_id === input.wakeId
          && active.wake_source === input.wakeSource ? 'duplicate' : 'busy');
      } catch (readError) {
        if (readError && typeof readError === 'object' && readError.code === 'ENOENT') continue;
        throw readError;
      }
    }
  }
  fail('claim_race', 'Claim state changed repeatedly during acquire');
}

function complete(input, paths, { now }) {
  if (existsSync(paths.completed) && !existsSync(paths.active)) {
    validateCompleted(readRecord(paths.completed), input, input.claimToken);
    finishInterruptedTransition(input, paths, 'complete');
    return baseResult(input, 'completed');
  }
  const active = readRecord(paths.active);
  validateOwnedActive(active, input);
  return withTransition(input, paths, 'complete', () => {
    const completed = completedRecord(input, active.claim_token, now());
    if (existsSync(paths.completed)) {
      validateCompleted(readRecord(paths.completed), input, active.claim_token);
    } else {
      try {
        createRecord(paths.completed, completed, paths.root);
      } catch (error) {
        if (!(error && typeof error === 'object' && error.code === 'EEXIST')) throw error;
        validateCompleted(readRecord(paths.completed), input, active.claim_token);
      }
    }
    unlinkSync(paths.active);
    syncDirectory(paths.root);
    return baseResult(input, 'completed');
  });
}

function abandon(input, paths, { now }) {
  if (!existsSync(paths.active) && existsSync(paths.transition)) {
    finishInterruptedTransition(input, paths, 'abandon');
    return abandonedResult(input, now());
  }
  const active = readRecord(paths.active);
  validateOwnedActive(active, input);
  return withTransition(input, paths, 'abandon', () => {
    unlinkSync(paths.active);
    syncDirectory(paths.root);
    return abandonedResult(input, now());
  });
}

function validateRoot(path) {
  if (typeof constants.O_NOFOLLOW !== 'number') {
    fail('unsupported_platform', 'Platform cannot enforce no-follow record reads');
  }
  let metadata;
  try {
    metadata = lstatSync(path);
  } catch {
    fail('claim_root', 'Claim root must already exist');
  }
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    fail('claim_root', 'Claim root must be a real directory');
  }
  if ((typeof process.getuid === 'function' && metadata.uid !== process.getuid())
    || (metadata.mode & 0o077) !== 0) {
    fail('claim_root_permissions', 'Claim root must be private and owned by this user');
  }
  const canonical = realpathSync(path);
  if (canonical !== resolve(path)) fail('claim_root', 'Claim root path must be canonical');
  return canonical;
}

function assertRootCapacity(root) {
  const directory = opendirSync(root);
  try {
    let count = 0;
    while (directory.readSync() !== null) {
      count += 1;
      if (count >= MAX_ROOT_RECORDS) {
        fail('claim_root_capacity', 'Claim root reached its bounded record capacity');
      }
    }
  } finally {
    directory.closeSync();
  }
}

function claimPaths(root, input) {
  const activeKey = digest([input.repository, input.prNumber, input.expectedHead]);
  const completedKey = digest([
    input.repository, input.prNumber, input.expectedHead, input.wakeSource, input.wakeId,
  ]);
  return {
    root,
    active: resolve(root, `${activeKey}.active.json`),
    transition: resolve(root, `${activeKey}.transition.json`),
    completed: resolve(root, `${completedKey}.completed.json`),
  };
}

function withTransition(input, paths, action, operation) {
  const marker = {
    schema_version: CLAIM_SCHEMA_VERSION,
    record_type: 'transition',
    action,
    repository: input.repository,
    pull_request: input.prNumber,
    expected_head_sha: input.expectedHead,
    claim_token_sha256: digest([input.claimToken]),
  };
  try {
    createRecord(paths.transition, marker, paths.root);
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'EEXIST') {
      fail('transition_busy', 'Another claim transition is already active');
    }
    throw error;
  }
  let result;
  let failure;
  try { result = operation(); } catch (error) { failure = error; }
  try {
    validateTransition(readRecord(paths.transition), input, action);
    unlinkSync(paths.transition);
    syncDirectory(paths.root);
  } catch (error) {
    if (failure === undefined) failure = error;
  }
  if (failure !== undefined) throw failure;
  return result;
}

function finishInterruptedTransition(input, paths, action) {
  if (!existsSync(paths.transition)) return;
  validateTransition(readRecord(paths.transition), input, action);
  unlinkSync(paths.transition);
  syncDirectory(paths.root);
}

function activeRecord(input, token, acquiredAt) {
  if (!validTimestamp(acquiredAt)) fail('clock', 'Claim timestamp is invalid');
  return {
    schema_version: CLAIM_SCHEMA_VERSION,
    record_type: 'active',
    repository: input.repository,
    pull_request: input.prNumber,
    expected_head_sha: input.expectedHead,
    wake_source: input.wakeSource,
    wake_id: input.wakeId,
    claim_token: token,
    acquired_at: acquiredAt,
  };
}

function completedRecord(input, token, completedAt) {
  if (!validTimestamp(completedAt)) fail('clock', 'Completion timestamp is invalid');
  return {
    schema_version: CLAIM_SCHEMA_VERSION,
    record_type: 'completed',
    repository: input.repository,
    pull_request: input.prNumber,
    expected_head_sha: input.expectedHead,
    wake_source: input.wakeSource,
    wake_id: input.wakeId,
    claim_token_sha256: digest([token]),
    completed_at: completedAt,
  };
}

function validateOwnedActive(record, input) {
  validateActive(record, input);
  if (record.wake_source !== input.wakeSource || record.wake_id !== input.wakeId
    || record.claim_token !== input.claimToken) {
    fail('claim_token_mismatch', 'Claim token does not own this exact wake');
  }
}

function validateActive(record, input) {
  if (!isRecord(record) || record.schema_version !== CLAIM_SCHEMA_VERSION
    || record.record_type !== 'active' || record.repository !== input.repository
    || record.pull_request !== input.prNumber || record.expected_head_sha !== input.expectedHead
    || !WAKE_SOURCES.has(record.wake_source) || !WAKE_ID.test(record.wake_id ?? '')
    || !TOKEN.test(record.claim_token ?? '') || !validTimestamp(record.acquired_at)) {
    fail('active_record', 'Active claim record is malformed or contradictory');
  }
}

function validateCompleted(record, input, token) {
  if (!isRecord(record) || record.schema_version !== CLAIM_SCHEMA_VERSION
    || record.record_type !== 'completed' || record.repository !== input.repository
    || record.pull_request !== input.prNumber || record.expected_head_sha !== input.expectedHead
    || record.wake_source !== input.wakeSource || record.wake_id !== input.wakeId
    || !/^[0-9a-f]{64}$/.test(record.claim_token_sha256 ?? '')
    || !validTimestamp(record.completed_at)
    || (token && record.claim_token_sha256 !== digest([token]))) {
    fail('completed_record', 'Completed wake receipt is malformed or contradictory');
  }
}

function validateTransition(record, input, action) {
  if (!isRecord(record) || record.schema_version !== CLAIM_SCHEMA_VERSION
    || record.record_type !== 'transition' || record.action !== action
    || record.repository !== input.repository || record.pull_request !== input.prNumber
    || record.expected_head_sha !== input.expectedHead
    || record.claim_token_sha256 !== digest([input.claimToken])) {
    fail('transition_record', 'Claim transition record is malformed or contradictory');
  }
}

function readRecord(path) {
  const descriptor = openSync(path, READ_FLAGS);
  try {
    const metadata = fstatSync(descriptor);
    if (!metadata.isFile() || metadata.size <= 0 || metadata.size > MAX_RECORD_BYTES) {
      fail('record_file', 'Claim record must be a bounded regular file');
    }
    const bytes = Buffer.allocUnsafe(MAX_RECORD_BYTES + 1);
    let total = 0;
    while (total <= MAX_RECORD_BYTES) {
      const count = readSync(descriptor, bytes, total, bytes.length - total, null);
      if (count === 0) break;
      total += count;
    }
    if (total <= 0 || total > MAX_RECORD_BYTES) fail('record_size', 'Claim record is oversized');
    const raw = bytes.subarray(0, total).toString('utf8');
    try {
      return JSON.parse(raw);
    } catch {
      fail('record_json', 'Claim record is malformed JSON');
    }
  } finally {
    closeSync(descriptor);
  }
}

function createRecord(path, record, root) {
  const bytes = Buffer.from(`${JSON.stringify(record)}\n`, 'utf8');
  if (bytes.length > MAX_RECORD_BYTES) fail('record_size', 'Claim record is oversized');
  const temporary = resolve(root, `.${basename(path)}.${randomUUID()}.tmp`);
  let descriptor;
  try {
    descriptor = openSync(temporary, WRITE_FLAGS, 0o600);
    let offset = 0;
    while (offset < bytes.length) {
      offset += writeSync(descriptor, bytes, offset, bytes.length - offset);
    }
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    linkSync(temporary, path);
    syncDirectory(root);
  } catch (error) {
    if (descriptor !== undefined) {
      try { closeSync(descriptor); } catch { /* best effort after failed write */ }
    }
    try { unlinkSync(temporary); } catch { /* bounded root capacity contains residue */ }
    throw error;
  }
  try { unlinkSync(temporary); } catch { /* target is already durably published */ }
  syncDirectory(root);
}

function syncDirectory(root) {
  const descriptor = openSync(root, constants.O_RDONLY);
  try { fsyncSync(descriptor); } finally { closeSync(descriptor); }
}

function baseResult(input, decision) {
  return {
    schema_version: CLAIM_SCHEMA_VERSION,
    decision_type: CLAIM_DECISION_TYPE,
    decision,
    repository: input?.repository ?? null,
    pull_request: input?.prNumber ?? null,
    expected_head_sha: input?.expectedHead ?? null,
    wake_source: input?.wakeSource ?? null,
    wake_id: input?.wakeId ?? null,
    merge_authorized: false,
  };
}

function abandonedResult(input, abandonedAt) {
  if (!validTimestamp(abandonedAt)) fail('clock', 'Abandon timestamp is invalid');
  return { ...baseResult(input, 'abandoned'), abandoned_at: abandonedAt };
}

function digest(parts) {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}
function validTimestamp(value) { return typeof value === 'string' && !Number.isNaN(Date.parse(value)); }
function isRecord(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function fail(code, message) { throw new WakeClaimError(code, message); }

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runCli();
}
