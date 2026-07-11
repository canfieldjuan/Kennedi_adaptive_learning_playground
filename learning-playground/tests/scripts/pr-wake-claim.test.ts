// @ts-expect-error Vitest runs in Node; the app intentionally does not ship Node typings.
import { execFile } from 'node:child_process';
// @ts-expect-error Vitest runs in Node; the app intentionally does not ship Node typings.
import { chmodSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
// @ts-expect-error Vitest runs in Node; the app intentionally does not ship Node typings.
import { tmpdir } from 'node:os';
// @ts-expect-error Vitest runs in Node; the app intentionally does not ship Node typings.
import { join } from 'node:path';
// @ts-expect-error Vitest runs in Node; the app intentionally does not ship Node typings.
import { promisify } from 'node:util';
import { afterEach, describe, expect, test } from 'vitest';
// @ts-expect-error The repository-owned Node CLI is intentionally plain JavaScript.
import * as claims from '../../scripts/pr-wake-claim.mjs';

const { executeClaimAction, MAX_ROOT_RECORDS, parseCliArgs, runCli } = claims;
const execFileAsync = promisify(execFile);
const SCRIPT = new URL('../../scripts/pr-wake-claim.mjs', import.meta.url).pathname;
const HEAD = '1'.repeat(40);
const TOKEN = '11111111-1111-4111-8111-111111111111';
const TOKEN_HASH = 'c2e1405db2f9b352ad9c28f5337c92b9d471d2a0903e9eadb7057ecdec6081e6';
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('wake claim ownership', () => {
  test('acquires one exact PR/head claim without merge authority', () => {
    const input = parsed();
    const result = executeClaimAction(input, fixed());

    expect(result).toMatchObject({
      decision: 'acquired', repository: input.repository, pull_request: 75,
      expected_head_sha: HEAD, wake_source: 'review', wake_id: 'delivery-1',
      claim_token: TOKEN, merge_authorized: false,
    });
  });

  test('deduplicates the same active wake without exposing its token', () => {
    const input = parsed();
    executeClaimAction(input, fixed());
    const replay = executeClaimAction(input, { ...fixed(), createToken: () => '22222222-2222-4222-8222-222222222222' });

    expect(replay).toMatchObject({ decision: 'duplicate', merge_authorized: false });
    expect(replay).not.toHaveProperty('claim_token');
  });

  test('reports a different wake on the same head as busy', () => {
    const input = parsed();
    executeClaimAction(input, fixed());
    const overlap = executeClaimAction({ ...input, wakeId: 'delivery-2', wakeSource: 'check' }, fixed());

    expect(overlap).toMatchObject({ decision: 'busy', wake_id: 'delivery-2' });
    expect(overlap).not.toHaveProperty('claim_token');
  });

  test('allows different heads to be claimed independently', () => {
    const input = parsed();
    expect(executeClaimAction(input, fixed()).decision).toBe('acquired');
    expect(executeClaimAction({ ...input, expectedHead: '2'.repeat(40) }, {
      ...fixed(), createToken: () => '22222222-2222-4222-8222-222222222222',
    }).decision).toBe('acquired');
  });

  test('completion leaves a durable replay receipt and releases the head', () => {
    const input = parsed();
    executeClaimAction(input, fixed());
    expect(executeClaimAction({ ...input, action: 'complete', claimToken: TOKEN }, fixed()))
      .toMatchObject({ decision: 'completed', merge_authorized: false });

    expect(executeClaimAction(input, fixed()).decision).toBe('duplicate');
    expect(executeClaimAction({ ...input, wakeId: 'delivery-2' }, {
      ...fixed(), createToken: () => '22222222-2222-4222-8222-222222222222',
    }).decision).toBe('acquired');
  });

  test('completion can be retried after its active record is removed', () => {
    const input = parsed();
    executeClaimAction(input, fixed());
    const completion = { ...input, action: 'complete', claimToken: TOKEN };
    expect(executeClaimAction(completion, fixed()).decision).toBe('completed');
    expect(executeClaimAction(completion, fixed()).decision).toBe('completed');
  });

  test('completion retry clears an interrupted transition marker', () => {
    const input = parsed();
    executeClaimAction(input, fixed());
    const active = activeName(input.claimRoot);
    const completion = { ...input, action: 'complete', claimToken: TOKEN };
    executeClaimAction(completion, fixed());
    writeFileSync(join(input.claimRoot, active.replace('.active.json', '.transition.json')),
      JSON.stringify(transition(input, 'complete')));

    expect(executeClaimAction(completion, fixed()).decision).toBe('completed');
    expect(readdirSync(input.claimRoot).some((name: string) => name.endsWith('.transition.json'))).toBe(false);
  });

  test('abandon releases the head without marking the wake complete', () => {
    const input = parsed();
    executeClaimAction(input, fixed());
    expect(executeClaimAction({ ...input, action: 'abandon', claimToken: TOKEN }, fixed()).decision)
      .toBe('abandoned');
    expect(executeClaimAction(input, fixed()).decision).toBe('acquired');
  });

  test('abandon retry clears an interrupted transition marker', () => {
    const input = parsed();
    executeClaimAction(input, fixed());
    const active = activeName(input.claimRoot);
    unlinkSync(join(input.claimRoot, active));
    writeFileSync(join(input.claimRoot, active.replace('.active.json', '.transition.json')),
      JSON.stringify(transition(input, 'abandon')));

    expect(executeClaimAction({ ...input, action: 'abandon', claimToken: TOKEN }, fixed()).decision)
      .toBe('abandoned');
  });

  test.each(['complete', 'abandon'] as const)('rejects the wrong token for %s', (action) => {
    const input = parsed();
    executeClaimAction(input, fixed());
    expect(() => executeClaimAction({
      ...input, action, claimToken: '22222222-2222-4222-8222-222222222222',
    }, fixed())).toThrowError(expect.objectContaining({ code: 'claim_token_mismatch' }));
  });

  test('does not steal an old active claim based on elapsed time', () => {
    const input = parsed();
    executeClaimAction(input, { ...fixed(), now: () => '2000-01-01T00:00:00.000Z' });
    expect(executeClaimAction({ ...input, wakeId: 'delivery-2' }, {
      ...fixed(), now: () => '2100-01-01T00:00:00.000Z',
    }).decision).toBe('busy');
  });

  test('rejects an invalid acquisition clock before publishing state', () => {
    const input = parsed();
    expect(() => executeClaimAction(input, { ...fixed(), now: () => 'invalid' }))
      .toThrowError(expect.objectContaining({ code: 'clock' }));
    expect(readdirSync(input.claimRoot)).toHaveLength(0);
  });
});

describe('wake claim state validation', () => {
  test.each([
    ['malformed JSON', '{'],
    ['empty JSON object', '{}'],
    ['oversized state', `{"padding":"${'x'.repeat(20_000)}"}`],
  ] as Array<[string, string]>)('fails closed for %s in the active record', (_label, contents) => {
    const input = parsed();
    executeClaimAction(input, fixed());
    const active = readdirSync(input.claimRoot).find((name: string) => name.endsWith('.active.json'))!;
    writeFileSync(join(input.claimRoot, active), contents);
    expect(() => executeClaimAction({ ...input, wakeId: 'delivery-2' }, fixed())).toThrow();
  });

  test('fails closed when a completed receipt contradicts the wake identity', () => {
    const input = parsed();
    executeClaimAction(input, fixed());
    executeClaimAction({ ...input, action: 'complete', claimToken: TOKEN }, fixed());
    const receipt = readdirSync(input.claimRoot).find((name: string) => name.endsWith('.completed.json'))!;
    const record = JSON.parse(readFileSync(join(input.claimRoot, receipt), 'utf8'));
    record.wake_id = 'other-delivery';
    writeFileSync(join(input.claimRoot, receipt), JSON.stringify(record));
    expect(() => executeClaimAction(input, fixed())).toThrowError(
      expect.objectContaining({ code: 'completed_record' })
    );
  });

  test('a transition marker blocks new work on the same head', () => {
    const input = parsed();
    executeClaimAction(input, fixed());
    const active = activeName(input.claimRoot);
    writeFileSync(join(input.claimRoot, active.replace('.active.json', '.transition.json')),
      JSON.stringify(transition(input, 'complete')));

    expect(executeClaimAction({ ...input, wakeId: 'delivery-2' }, fixed()).decision).toBe('busy');
  });

  test('rejects a symbolic-link active record without following it', () => {
    const input = parsed();
    executeClaimAction(input, fixed());
    const active = join(input.claimRoot, activeName(input.claimRoot));
    const target = join(input.claimRoot, 'target.json');
    writeFileSync(target, '{}');
    unlinkSync(active);
    symlinkSync(target, active);

    expect(() => executeClaimAction({ ...input, wakeId: 'delivery-2' }, fixed())).toThrow();
  });

  test('rejects a symbolic-link claim root', () => {
    const real = root();
    const link = `${real}-link`;
    roots.push(link);
    symlinkSync(real, link, 'dir');
    const input = { ...parsed(), claimRoot: link };
    expect(() => executeClaimAction(input, fixed())).toThrowError(
      expect.objectContaining({ code: 'claim_root' })
    );
  });

  test('requires an existing absolute claim-root directory', () => {
    const input = parsed();
    expect(() => executeClaimAction({ ...input, claimRoot: join(input.claimRoot, 'missing') }, fixed()))
      .toThrowError(expect.objectContaining({ code: 'claim_root' }));
    expect(() => parseCliArgs(cli({ claimRoot: 'relative' }))).toThrowError(
      expect.objectContaining({ code: 'invalid_arguments' })
    );
  });

  test.each([0o750, 0o707])('rejects a non-private claim root mode %s', (mode) => {
    const input = parsed();
    chmodSync(input.claimRoot, mode);
    expect(() => executeClaimAction(input, fixed())).toThrowError(
      expect.objectContaining({ code: 'claim_root_permissions' })
    );
  });

  test('fails closed at the completed-record capacity', () => {
    const input = parsed();
    for (let index = 0; index < MAX_ROOT_RECORDS; index += 1) {
      writeFileSync(join(input.claimRoot, `${index}.completed.json`), '{}');
    }
    expect(() => executeClaimAction(input, fixed())).toThrowError(
      expect.objectContaining({ code: 'claim_root_capacity' })
    );
  });
});

describe('wake claim CLI', () => {
  test.each([
    { action: 'unknown' },
    { repository: 'not-a-repository' },
    { pr: '0' },
    { expectedHead: 'abc' },
    { wakeSource: 'merge' },
    { wakeId: '../escape' },
  ] as Array<Record<string, string>>)('rejects invalid argument boundary %j', (override) => {
    expect(() => parseCliArgs(cli(override))).toThrowError(
      expect.objectContaining({ code: 'invalid_arguments' })
    );
  });

  test('rejects duplicate, unknown, missing, and acquire-token arguments', () => {
    expect(() => parseCliArgs([...cli(), '--pr', '75'])).toThrow();
    expect(() => parseCliArgs([...cli(), '--unknown', 'value'])).toThrow();
    expect(() => parseCliArgs(cli().slice(0, -1))).toThrow();
    expect(() => parseCli({ claimToken: TOKEN })).toThrow();
  });

  test('returns exits 0, 1, and 2 with merge unauthorized', () => {
    const args = cli();
    expect(invoke(args)).toMatchObject({ exitCode: 0, output: { decision: 'acquired', merge_authorized: false } });
    expect(invoke(args)).toMatchObject({ exitCode: 1, output: { decision: 'duplicate', merge_authorized: false } });
    expect(invoke(['--action', 'acquire'])).toMatchObject({ exitCode: 2, output: { decision: 'error', merge_authorized: false } });
  });

  test('two real processes cannot both acquire the same PR/head', async () => {
    const args = cli();
    const results = await Promise.all([runProcess(args), runProcess(args)]);
    const decisions = results.map(({ output }) => output.decision).sort();
    expect(decisions).toEqual(['acquired', 'duplicate']);
    expect(results.filter(({ exitCode }) => exitCode === 0)).toHaveLength(1);
    expect(results.filter(({ exitCode }) => exitCode === 1)).toHaveLength(1);
  });

  test('two real completion processes leave one receipt and no active claim', async () => {
    const input = parsed();
    executeClaimAction(input, fixed());
    const args = cli({ action: 'complete', claimRoot: input.claimRoot, claimToken: TOKEN });
    const results = await Promise.all([runProcess(args), runProcess(args)]);

    expect(results.some(({ output }) => output.decision === 'completed')).toBe(true);
    expect(readdirSync(input.claimRoot).filter((name: string) => name.endsWith('.completed.json'))).toHaveLength(1);
    expect(readdirSync(input.claimRoot).filter((name: string) => name.endsWith('.active.json'))).toHaveLength(0);
  });
});

function parsed() {
  return parseCliArgs(cli());
}

function parseCli(override: Record<string, string>) {
  return parseCliArgs(cli(override));
}

function cli(override: Record<string, string> = {}) {
  const values: Record<string, string> = {
    action: 'acquire', repository: 'canfieldjuan/Kennedi_adaptive_learning_playground',
    pr: '75', expectedHead: HEAD, wakeSource: 'review', wakeId: 'delivery-1',
    claimRoot: root(), ...override,
  };
  const args = [
    '--action', values.action, '--repository', values.repository, '--pr', values.pr,
    '--expected-head', values.expectedHead, '--wake-source', values.wakeSource,
    '--wake-id', values.wakeId, '--claim-root', values.claimRoot,
  ];
  if (values.claimToken) args.push('--claim-token', values.claimToken);
  return args;
}

function root() {
  const path = mkdtempSync(join(tmpdir(), 'kennedi-wake-claim-'));
  roots.push(path);
  return path;
}

function fixed() {
  return { createToken: () => TOKEN, now: () => '2026-07-11T02:00:00.000Z' };
}

function activeName(claimRoot: string) {
  return readdirSync(claimRoot).find((name: string) => name.endsWith('.active.json'))!;
}

function transition(input: ReturnType<typeof parsed>, action: string) {
  return {
    schema_version: 1,
    record_type: 'transition',
    action,
    repository: input.repository,
    pull_request: input.prNumber,
    expected_head_sha: input.expectedHead,
    claim_token_sha256: TOKEN_HASH,
  };
}

function invoke(argv: string[]) {
  let text = '';
  const exitCode = runCli({ argv, stdout: { write: (chunk: string) => { text += chunk; return true; } } });
  return { exitCode, output: JSON.parse(text) };
}

async function runProcess(args: string[]) {
  try {
    const { stdout } = await execFileAsync('node', [SCRIPT, ...args]);
    return { exitCode: 0, output: JSON.parse(stdout) };
  } catch (error) {
    const current = error as { code: number; stdout: string };
    return { exitCode: current.code, output: JSON.parse(current.stdout) };
  }
}
