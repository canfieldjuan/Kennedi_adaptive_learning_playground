#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';
import {
  closeSync, constants, fstatSync, fsyncSync, linkSync, lstatSync, openSync,
  readSync, realpathSync, unlinkSync, writeSync,
} from 'node:fs';
import { basename, isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const CLAIM_SCHEMA_VERSION = 1;
export const CLAIM_DECISION_TYPE = 'kennedi.pr-wake-claim';
export const MAX_RECORD_BYTES = 16 * 1024;
export const MAX_WAKE_RECORDS = 4096;

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
    if (pathPresent(paths.transition)) {
      const marker = readRecordIfPresent(paths.transition);
      if (marker === null) continue;
      validateBlockingTransition(marker, input, paths);
      return baseResult(input, 'busy');
    }
    if (pathPresent(paths.completed)) {
      const completed = readRecordIfPresent(paths.completed);
      if (completed === null) continue;
      validateCompleted(completed, input);
      validateCapacitySlot(readRecord(paths.capacitySlot(completed.capacity_slot)), input, completed);
      return baseResult(input, 'duplicate');
    }
    if (pathPresent(paths.active)) {
      const active = readRecordIfPresent(paths.active);
      if (active === null) continue;
      validateActive(active, input);
      validateCapacitySlot(readRecord(paths.capacitySlot(active.capacity_slot)), {
        ...input, wakeSource: active.wake_source, wakeId: active.wake_id,
      }, active);
      return baseResult(input, active.wake_id === input.wakeId
        && active.wake_source === input.wakeSource ? 'duplicate' : 'busy');
    }
    const token = createToken().toLowerCase();
    if (!TOKEN.test(token)) fail('token_generation', 'Generated claim token is invalid');
    const capacitySlot = reserveCapacitySlot(paths, input, token, now());
    const record = activeRecord(input, token, capacitySlot, now());
    try {
      createRecord(paths.active, record, paths.root, paths.activePublication(capacitySlot));
      return { ...baseResult(input, 'acquired'), claim_token: token };
    } catch (error) {
      if (hasCode(error, 'publication_busy')) {
        releaseCapacitySlot(paths, input, capacitySlot, token);
        return baseResult(input, 'busy');
      }
      if (!hasCode(error, 'record_exists')) throw error;
      releaseCapacitySlot(paths, input, capacitySlot, token);
      try {
        const active = readRecord(paths.active);
        validateActive(active, input);
        validateCapacitySlot(readRecord(paths.capacitySlot(active.capacity_slot)), {
          ...input, wakeSource: active.wake_source, wakeId: active.wake_id,
        }, active);
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
  if (pathPresent(paths.completed)) {
    const completed = readRecord(paths.completed);
    validateCompleted(completed, input, input.claimToken);
    validateCapacitySlot(readRecord(paths.capacitySlot(completed.capacity_slot)), input, completed);
    const active = readRecordIfPresent(paths.active);
    if (active === null) {
      const marker = readRecordIfPresent(paths.transition);
      if (transitionBelongsTo(marker, input, 'complete', completed.capacity_slot)) {
        finishInterruptedTransition(input, paths, 'complete', completed.capacity_slot);
      }
      return baseResult(input, 'completed');
    }
    validateActive(active, input);
    if (!activeBelongsTo(active, input)) return baseResult(input, 'completed');
  }
  const active = readRecord(paths.active);
  validateOwnedActive(active, input);
  validateCapacitySlot(readRecord(paths.capacitySlot(active.capacity_slot)), input, active);
  return withTransition(input, paths, 'complete', active, () => {
    const completed = completedRecord(input, active.claim_token, active.capacity_slot, now());
    if (pathPresent(paths.completed)) {
      validateCompleted(readRecord(paths.completed), input, active.claim_token);
    } else {
      try {
        createRecord(paths.completed, completed, paths.root);
      } catch (error) {
        if (hasCode(error, 'publication_busy')) return baseResult(input, 'busy');
        if (!hasCode(error, 'record_exists')) throw error;
        validateCompleted(readRecord(paths.completed), input, active.claim_token);
      }
    }
    unlinkIfPresent(paths.active);
    syncDirectory(paths.root);
    return baseResult(input, 'completed');
  });
}

function activeBelongsTo(record, input) {
  return record.wake_source === input.wakeSource && record.wake_id === input.wakeId
    && record.claim_token === input.claimToken;
}

function transitionBelongsTo(record, input, action, expectedSlot) {
  return isRecord(record) && record.schema_version === CLAIM_SCHEMA_VERSION
    && record.record_type === 'transition' && record.action === action
    && record.repository === input.repository && record.pull_request === input.prNumber
    && record.expected_head_sha === input.expectedHead
    && record.wake_source === input.wakeSource && record.wake_id === input.wakeId
    && record.capacity_slot === expectedSlot
    && record.claim_token_sha256 === digest([input.claimToken]);
}

function abandon(input, paths, { now }) {
  if (!pathPresent(paths.active) && pathPresent(paths.transition)) {
    const marker = finishInterruptedTransition(input, paths, 'abandon');
    if (marker !== null) {
      releaseCapacitySlot(paths, input, marker.capacity_slot, input.claimToken);
    }
    return abandonedResult(input, now());
  }
  const active = readRecord(paths.active);
  validateOwnedActive(active, input);
  validateCapacitySlot(readRecord(paths.capacitySlot(active.capacity_slot)), input, active);
  return withTransition(input, paths, 'abandon', active, () => {
    unlinkIfPresent(paths.active);
    releaseCapacitySlot(paths, input, active.capacity_slot, active.claim_token);
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
    capacitySlot: (index) => resolve(root, `.capacity-slot-${index}.json`),
    capacityOrphan: (index) => resolve(root, `.capacity-slot-${index}.orphan.json`),
    activePublication: (index) => resolve(root, `.${activeKey}.active.slot-${index}.tmp`),
  };
}

function withTransition(input, paths, action, active, operation) {
  const marker = {
    schema_version: CLAIM_SCHEMA_VERSION,
    record_type: 'transition',
    action,
    repository: input.repository,
    pull_request: input.prNumber,
    expected_head_sha: input.expectedHead,
    wake_source: input.wakeSource,
    wake_id: input.wakeId,
    capacity_slot: active.capacity_slot,
    claim_token_sha256: digest([input.claimToken]),
  };
  try {
    createRecord(paths.transition, marker, paths.root);
  } catch (error) {
    if (hasCode(error, 'publication_busy')) return baseResult(input, 'busy');
    if (hasCode(error, 'record_exists')) {
      const existing = readRecordIfPresent(paths.transition);
      if (existing === null) {
        fail('transition_race', 'Claim transition changed during recovery');
      }
      validateTransition(existing, input, action, active.capacity_slot);
    } else {
      throw error;
    }
  }
  let result;
  let failure;
  try { result = operation(); } catch (error) { failure = error; }
  try {
    if (pathPresent(paths.transition)) {
      const current = readRecordIfPresent(paths.transition);
      if (current !== null) {
        validateTransition(current, input, action, active.capacity_slot);
        unlinkIfPresent(paths.transition);
      }
    }
    syncDirectory(paths.root);
  } catch (error) {
    if (failure === undefined) failure = error;
  }
  if (failure !== undefined) throw failure;
  return result;
}

function finishInterruptedTransition(input, paths, action, expectedSlot) {
  if (!pathPresent(paths.transition)) return null;
  const marker = readRecordIfPresent(paths.transition);
  if (marker === null) return null;
  validateTransition(marker, input, action, expectedSlot);
  unlinkIfPresent(paths.transition);
  syncDirectory(paths.root);
  return marker;
}

function reserveCapacitySlot(paths, input, token, reservedAt) {
  if (!validTimestamp(reservedAt)) fail('clock', 'Capacity timestamp is invalid');
  const start = Number.parseInt(digest([
    input.repository, input.prNumber, input.expectedHead, input.wakeSource, input.wakeId,
  ]).slice(0, 8), 16) % MAX_WAKE_RECORDS;
  for (let offset = 0; offset < MAX_WAKE_RECORDS; offset += 1) {
    const slot = (start + offset) % MAX_WAKE_RECORDS;
    const path = paths.capacitySlot(slot);
    if (pathPresent(paths.capacityOrphan(slot))) {
      finishCapacityReclamation(paths, slot);
      if (pathPresent(paths.capacityOrphan(slot))) continue;
    }
    if (pathPresent(path)) {
      const existing = readRecord(path);
      if (!capacitySlotIsOrphan(existing, paths.root)) continue;
      if (!beginCapacityReclamation(paths, slot)) continue;
      finishCapacityReclamation(paths, slot);
      if (pathPresent(path) || pathPresent(paths.capacityOrphan(slot))) continue;
    }
    const record = {
      schema_version: CLAIM_SCHEMA_VERSION,
      record_type: 'capacity_slot',
      capacity_slot: slot,
      repository: input.repository,
      pull_request: input.prNumber,
      expected_head_sha: input.expectedHead,
      wake_source: input.wakeSource,
      wake_id: input.wakeId,
      claim_token_sha256: digest([token]),
      publisher_pid: process.pid,
      reserved_at: reservedAt,
    };
    try {
      createRecord(path, record, paths.root);
      return slot;
    } catch (error) {
      if (!hasCode(error, 'record_exists') && !hasCode(error, 'publication_busy')) throw error;
    }
  }
  fail('claim_root_capacity', 'Claim root reached its bounded wake-record capacity');
}

function releaseCapacitySlot(paths, input, slot, token) {
  const path = paths.capacitySlot(slot);
  if (!pathPresent(path)) return;
  const record = readRecordIfPresent(path);
  if (record === null) return;
  validateCapacitySlot(record, input, {
    capacity_slot: slot,
    claim_token_sha256: digest([token]),
  });
  unlinkIfPresent(path);
  syncDirectory(paths.root);
}

function validateCapacitySlot(record, input, owner) {
  const expectedHash = typeof owner.claim_token === 'string'
    ? digest([owner.claim_token])
    : owner.claim_token_sha256;
  if (!isRecord(record) || record.schema_version !== CLAIM_SCHEMA_VERSION
    || record.record_type !== 'capacity_slot' || record.capacity_slot !== owner.capacity_slot
    || !validSlot(record.capacity_slot) || record.repository !== input.repository
    || record.pull_request !== input.prNumber || record.expected_head_sha !== input.expectedHead
    || record.wake_source !== input.wakeSource || record.wake_id !== input.wakeId
    || record.claim_token_sha256 !== expectedHash
    || !Number.isInteger(record.publisher_pid) || record.publisher_pid <= 0
    || !validTimestamp(record.reserved_at)) {
    fail('capacity_slot', 'Capacity slot is malformed or contradictory');
  }
}

function capacitySlotIsOrphan(record, root) {
  if (!isRecord(record)) fail('capacity_slot', 'Capacity slot is malformed or contradictory');
  const input = {
    repository: record.repository,
    prNumber: record.pull_request,
    expectedHead: record.expected_head_sha,
    wakeSource: record.wake_source,
    wakeId: record.wake_id,
  };
  validateCapacitySlot(record, input, record);
  if (processIsAlive(record.publisher_pid)) return false;
  const ownerPaths = claimPaths(root, input);
  return !pathPresent(ownerPaths.active)
    && !pathPresent(ownerPaths.completed)
    && !pathPresent(ownerPaths.transition);
}

function beginCapacityReclamation(paths, slot) {
  try {
    linkSync(paths.capacitySlot(slot), paths.capacityOrphan(slot));
    syncDirectory(paths.root);
    return true;
  } catch (error) {
    if (error && typeof error === 'object' && ['EEXIST', 'ENOENT'].includes(error.code)) {
      return false;
    }
    throw error;
  }
}

function finishCapacityReclamation(paths, slot) {
  const orphanPath = paths.capacityOrphan(slot);
  const record = readRecordIfPresent(orphanPath);
  if (record === null || !capacitySlotIsOrphan(record, paths.root)) return;
  const orphanMetadata = lstatSync(orphanPath);
  const slotPath = paths.capacitySlot(slot);
  if (pathPresent(slotPath)) {
    const slotMetadata = lstatSync(slotPath);
    if (slotMetadata.dev !== orphanMetadata.dev || slotMetadata.ino !== orphanMetadata.ino) {
      fail('capacity_reclamation_race', 'Capacity slot changed during orphan reclamation');
    }
    unlinkIfPresent(slotPath);
  }
  const ownerPaths = claimPaths(paths.root, {
    repository: record.repository,
    prNumber: record.pull_request,
    expectedHead: record.expected_head_sha,
    wakeSource: record.wake_source,
    wakeId: record.wake_id,
  });
  unlinkIfPresent(ownerPaths.activePublication(slot));
  unlinkIfPresent(orphanPath);
  syncDirectory(paths.root);
}

function processIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return !(error && typeof error === 'object' && error.code === 'ESRCH');
  }
}

function activeRecord(input, token, capacitySlot, acquiredAt) {
  if (!validTimestamp(acquiredAt)) fail('clock', 'Claim timestamp is invalid');
  return {
    schema_version: CLAIM_SCHEMA_VERSION,
    record_type: 'active',
    repository: input.repository,
    pull_request: input.prNumber,
    expected_head_sha: input.expectedHead,
    wake_source: input.wakeSource,
    wake_id: input.wakeId,
    capacity_slot: capacitySlot,
    claim_token: token,
    acquired_at: acquiredAt,
  };
}

function completedRecord(input, token, capacitySlot, completedAt) {
  if (!validTimestamp(completedAt)) fail('clock', 'Completion timestamp is invalid');
  return {
    schema_version: CLAIM_SCHEMA_VERSION,
    record_type: 'completed',
    repository: input.repository,
    pull_request: input.prNumber,
    expected_head_sha: input.expectedHead,
    wake_source: input.wakeSource,
    wake_id: input.wakeId,
    capacity_slot: capacitySlot,
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
    || !validSlot(record.capacity_slot) || !TOKEN.test(record.claim_token ?? '')
    || !validTimestamp(record.acquired_at)) {
    fail('active_record', 'Active claim record is malformed or contradictory');
  }
}

function validateCompleted(record, input, token) {
  if (!isRecord(record) || record.schema_version !== CLAIM_SCHEMA_VERSION
    || record.record_type !== 'completed' || record.repository !== input.repository
    || record.pull_request !== input.prNumber || record.expected_head_sha !== input.expectedHead
    || record.wake_source !== input.wakeSource || record.wake_id !== input.wakeId
    || !validSlot(record.capacity_slot) || !/^[0-9a-f]{64}$/.test(record.claim_token_sha256 ?? '')
    || !validTimestamp(record.completed_at)
    || (token && record.claim_token_sha256 !== digest([token]))) {
    fail('completed_record', 'Completed wake receipt is malformed or contradictory');
  }
}

function validateTransition(record, input, action, expectedSlot) {
  if (!isRecord(record) || record.schema_version !== CLAIM_SCHEMA_VERSION
    || record.record_type !== 'transition' || record.action !== action
    || record.repository !== input.repository || record.pull_request !== input.prNumber
    || record.expected_head_sha !== input.expectedHead
    || record.wake_source !== input.wakeSource || record.wake_id !== input.wakeId
    || !validSlot(record.capacity_slot)
    || (expectedSlot !== undefined && record.capacity_slot !== expectedSlot)
    || record.claim_token_sha256 !== digest([input.claimToken])) {
    fail('transition_record', 'Claim transition record is malformed or contradictory');
  }
}

function validateBlockingTransition(record, input, paths) {
  if (!isRecord(record) || record.schema_version !== CLAIM_SCHEMA_VERSION
    || record.record_type !== 'transition' || !['complete', 'abandon'].includes(record.action)
    || record.repository !== input.repository || record.pull_request !== input.prNumber
    || record.expected_head_sha !== input.expectedHead
    || !WAKE_SOURCES.has(record.wake_source) || !WAKE_ID.test(record.wake_id ?? '')
    || !validSlot(record.capacity_slot)
    || !/^[0-9a-f]{64}$/.test(record.claim_token_sha256 ?? '')) {
    fail('transition_record', 'Claim transition record is malformed or contradictory');
  }
  const markerInput = { ...input, wakeSource: record.wake_source, wakeId: record.wake_id };
  validateCapacitySlot(readRecord(paths.capacitySlot(record.capacity_slot)), markerInput, record);
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

function readRecordIfPresent(path) {
  try {
    return readRecord(path);
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') return null;
    throw error;
  }
}

function createRecord(path, record, root, publicationPath = resolve(root, `.${basename(path)}.tmp`)) {
  const bytes = Buffer.from(`${JSON.stringify(record)}\n`, 'utf8');
  if (bytes.length > MAX_RECORD_BYTES) fail('record_size', 'Claim record is oversized');
  const temporary = publicationPath;
  let descriptor;
  let ownsTemporary = false;
  try {
    descriptor = openSync(temporary, WRITE_FLAGS, 0o600);
    ownsTemporary = true;
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'EEXIST') {
      fail('publication_busy', 'Another process is publishing this record');
    }
    throw error;
  }
  try {
    let offset = 0;
    while (offset < bytes.length) {
      offset += writeSync(descriptor, bytes, offset, bytes.length - offset);
    }
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    try {
      linkSync(temporary, path);
    } catch (error) {
      if (error && typeof error === 'object' && error.code === 'EEXIST') {
        fail('record_exists', 'Record is already published');
      }
      throw error;
    }
    syncDirectory(root);
  } catch (error) {
    if (descriptor !== undefined) {
      try { closeSync(descriptor); } catch { /* best effort after failed write */ }
    }
    if (ownsTemporary) {
      try { unlinkSync(temporary); } catch { /* bounded target contains residue */ }
    }
    throw error;
  }
  try { unlinkSync(temporary); } catch { /* target is already durably published */ }
  syncDirectory(root);
}

function syncDirectory(root) {
  const descriptor = openSync(root, constants.O_RDONLY);
  try { fsyncSync(descriptor); } finally { closeSync(descriptor); }
}

function pathPresent(path) {
  try {
    lstatSync(path);
    return true;
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') return false;
    throw error;
  }
}

function unlinkIfPresent(path) {
  try {
    unlinkSync(path);
  } catch (error) {
    if (!(error && typeof error === 'object' && error.code === 'ENOENT')) throw error;
  }
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
function validSlot(value) {
  return Number.isInteger(value) && value >= 0 && value < MAX_WAKE_RECORDS;
}
function validTimestamp(value) { return typeof value === 'string' && !Number.isNaN(Date.parse(value)); }
function isRecord(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function hasCode(error, code) { return error instanceof WakeClaimError && error.code === code; }
function fail(code, message) { throw new WakeClaimError(code, message); }

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runCli();
}
