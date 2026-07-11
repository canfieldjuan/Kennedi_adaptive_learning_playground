// @ts-expect-error Vitest runs in Node; the app intentionally does not ship Node typings.
import { execFile } from 'node:child_process';
// @ts-expect-error Vitest runs in Node; the app intentionally does not ship Node typings.
import { chmodSync, linkSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
// @ts-expect-error Vitest runs in Node; the app intentionally does not ship Node typings.
import { tmpdir } from 'node:os';
// @ts-expect-error Vitest runs in Node; the app intentionally does not ship Node typings.
import process from 'node:process';
// @ts-expect-error Vitest runs in Node; the app intentionally does not ship Node typings.
import { join } from 'node:path';
// @ts-expect-error Vitest runs in Node; the app intentionally does not ship Node typings.
import { promisify } from 'node:util';
import { afterEach, describe, expect, test } from 'vitest';
// @ts-expect-error The repository-owned Node CLI is intentionally plain JavaScript.
import * as claims from '../../scripts/pr-wake-claim.mjs';

const { executeClaimAction, MAX_WAKE_RECORDS, parseCliArgs, runCli } = claims;
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

  test('an old completion retry ignores a newer active wake on the same head', () => {
    const input = parsed();
    executeClaimAction(input, fixed());
    executeClaimAction({ ...input, action: 'complete', claimToken: TOKEN }, fixed());
    const newer = { ...input, wakeId: 'delivery-2' };
    const newerToken = '22222222-2222-4222-8222-222222222222';
    expect(executeClaimAction(newer, { ...fixed(), createToken: () => newerToken }).decision)
      .toBe('acquired');

    expect(executeClaimAction({ ...input, action: 'complete', claimToken: TOKEN }, fixed()).decision)
      .toBe('completed');
    expect(activeState(input.claimRoot)).toMatchObject({
      wake_id: 'delivery-2', claim_token: newerToken,
    });
  });

  test('an exact receipt wins over a newer shared transition marker', () => {
    const input = parsed();
    executeClaimAction(input, fixed());
    executeClaimAction({ ...input, action: 'complete', claimToken: TOKEN }, fixed());
    const newer = { ...input, wakeId: 'delivery-2' };
    executeClaimAction(newer, fixed());
    const active = activeName(input.claimRoot);
    const capacitySlot = activeState(input.claimRoot).capacity_slot;
    writeFileSync(join(input.claimRoot, active.replace('.active.json', '.transition.json')),
      JSON.stringify(transition(newer, 'complete', capacitySlot)));

    expect(executeClaimAction(input, fixed()).decision).toBe('duplicate');
  });

  test('completion retry clears an interrupted transition marker', () => {
    const input = parsed();
    executeClaimAction(input, fixed());
    const active = activeName(input.claimRoot);
    const capacitySlot = activeState(input.claimRoot).capacity_slot;
    const completion = { ...input, action: 'complete', claimToken: TOKEN };
    executeClaimAction(completion, fixed());
    writeFileSync(join(input.claimRoot, active.replace('.active.json', '.transition.json')),
      JSON.stringify(transition(input, 'complete', capacitySlot)));

    expect(executeClaimAction(completion, fixed()).decision).toBe('completed');
    expect(readdirSync(input.claimRoot).some((name: string) => name.endsWith('.transition.json'))).toBe(false);
  });

  test('completion recovers a matching transition while the active claim remains', () => {
    const input = parsed();
    executeClaimAction(input, fixed());
    const active = activeName(input.claimRoot);
    const capacitySlot = activeState(input.claimRoot).capacity_slot;
    writeFileSync(join(input.claimRoot, active.replace('.active.json', '.transition.json')),
      JSON.stringify(transition(input, 'complete', capacitySlot)));

    expect(executeClaimAction({ ...input, action: 'complete', claimToken: TOKEN }, fixed()).decision)
      .toBe('completed');
    expect(readdirSync(input.claimRoot).some((name: string) => name.endsWith('.active.json'))).toBe(false);
  });

  test('abandon releases the head without marking the wake complete', () => {
    const input = parsed();
    executeClaimAction(input, fixed());
    expect(executeClaimAction({ ...input, action: 'abandon', claimToken: TOKEN }, fixed()).decision)
      .toBe('abandoned');
    expect(executeClaimAction(input, fixed()).decision).toBe('acquired');
  });

  test('abandon removes active publication residue before releasing its slot', () => {
    const input = parsed();
    executeClaimAction(input, fixed());
    const active = activeName(input.claimRoot);
    const slot = activeState(input.claimRoot).capacity_slot;
    const publication = join(input.claimRoot, `.${active.replace('.json', `.slot-${slot}.tmp`)}`);
    writeFileSync(publication, '{"stale":');

    expect(executeClaimAction({ ...input, action: 'abandon', claimToken: TOKEN }, fixed()).decision)
      .toBe('abandoned');
    expect(readdirSync(input.claimRoot)).not.toContain(publication.split('/').at(-1));
    expect(executeClaimAction(input, fixed()).decision).toBe('acquired');
  });

  test('abandon finishes its quarantined slot after marker cleanup', () => {
    const input = parsed();
    executeClaimAction(input, fixed());
    const active = activeName(input.claimRoot);
    const slot = activeState(input.claimRoot).capacity_slot;
    const slotPath = join(input.claimRoot, `.capacity-slot-${slot}.json`);
    linkSync(slotPath, join(input.claimRoot, `.capacity-slot-${slot}.orphan.json`));
    unlinkSync(join(input.claimRoot, active));

    expect(executeClaimAction({ ...input, action: 'abandon', claimToken: TOKEN }, fixed()).decision)
      .toBe('abandoned');
    expect(pathNames(input.claimRoot).some((name) => name.startsWith('.capacity-slot-')))
      .toBe(false);
  });

  test('old abandon cleanup never touches a newer active owner with a reused token', () => {
    const input = parsed();
    executeClaimAction(input, fixed());
    const active = activeName(input.claimRoot);
    const slot = activeState(input.claimRoot).capacity_slot;
    const slotPath = join(input.claimRoot, `.capacity-slot-${slot}.json`);
    linkSync(slotPath, join(input.claimRoot, `.capacity-slot-${slot}.orphan.json`));
    unlinkSync(join(input.claimRoot, active));
    expect(executeClaimAction(input, fixed()).decision).toBe('acquired');

    expect(executeClaimAction({ ...input, action: 'abandon', claimToken: TOKEN }, fixed()).decision)
      .toBe('abandoned');
    expect(activeState(input.claimRoot)).toMatchObject({
      wake_id: 'delivery-1', claim_token: TOKEN,
    });
  });

  test('recovers dead capacity publication ownership', () => {
    const input = parsed();
    executeClaimAction(input, fixed());
    const slot = activeState(input.claimRoot).capacity_slot;
    executeClaimAction({ ...input, action: 'abandon', claimToken: TOKEN }, fixed());
    const publication = join(input.claimRoot, `.capacity-slot-${slot}.json.tmp`);
    writeDeadPublication(publication);

    expect(executeClaimAction(input, fixed()).decision).toBe('acquired');
    expect(pathNames(input.claimRoot)).not.toContain(`${publication.split('/').at(-1)}.lock`);
  });

  test('recovers dead transition publication ownership', () => {
    const input = parsed();
    executeClaimAction(input, fixed());
    const active = activeName(input.claimRoot);
    const publication = join(input.claimRoot,
      `.${active.replace('.active.json', '.transition.json.tmp')}`);
    writeDeadPublication(publication);

    expect(executeClaimAction({ ...input, action: 'complete', claimToken: TOKEN }, fixed()).decision)
      .toBe('completed');
    expect(pathNames(input.claimRoot)).not.toContain(`${publication.split('/').at(-1)}.lock`);
  });

  test('does not steal live transition publication ownership', () => {
    const input = parsed();
    executeClaimAction(input, fixed());
    const active = activeName(input.claimRoot);
    const publication = join(input.claimRoot,
      `.${active.replace('.active.json', '.transition.json.tmp')}`);
    writeFileSync(publication, '{"partial":');
    symlinkSync(`${process.pid}:44444444-4444-4444-8444-444444444444`,
      `${publication}.lock`);

    expect(executeClaimAction({ ...input, action: 'complete', claimToken: TOKEN }, fixed()).decision)
      .toBe('busy');
    expect(pathNames(input.claimRoot)).toContain(active);
  });

  test('fails closed on malformed publication ownership', () => {
    const input = parsed();
    executeClaimAction(input, fixed());
    const active = activeName(input.claimRoot);
    const publication = join(input.claimRoot,
      `.${active.replace('.active.json', '.transition.json.tmp')}`);
    writeFileSync(publication, '{"partial":');
    symlinkSync('not-a-publisher', `${publication}.lock`);

    expect(() => executeClaimAction({
      ...input, action: 'complete', claimToken: TOKEN,
    }, fixed())).toThrowError(expect.objectContaining({ code: 'publication_lock' }));
  });

  test('recovers dead completed-receipt publication ownership', () => {
    const input = parsed();
    executeClaimAction(input, fixed());
    const active = activeName(input.claimRoot);
    const activePath = join(input.claimRoot, active);
    const activeContents = readFileSync(activePath, 'utf8');
    executeClaimAction({ ...input, action: 'complete', claimToken: TOKEN }, fixed());
    const receipt = pathNames(input.claimRoot).find((name) => name.endsWith('.completed.json'))!;
    unlinkSync(join(input.claimRoot, receipt));
    writeFileSync(activePath, activeContents);
    const publication = join(input.claimRoot, `.${receipt}.tmp`);
    writeDeadPublication(publication);

    expect(executeClaimAction({ ...input, action: 'complete', claimToken: TOKEN }, fixed()).decision)
      .toBe('completed');
    expect(pathNames(input.claimRoot)).not.toContain(`${publication.split('/').at(-1)}.lock`);
  });

  test('abandon retry clears an interrupted transition marker', () => {
    const input = parsed();
    executeClaimAction(input, fixed());
    const active = activeName(input.claimRoot);
    const capacitySlot = activeState(input.claimRoot).capacity_slot;
    unlinkSync(join(input.claimRoot, active));
    writeFileSync(join(input.claimRoot, active.replace('.active.json', '.transition.json')),
      JSON.stringify(transition(input, 'abandon', capacitySlot)));

    expect(executeClaimAction({ ...input, action: 'abandon', claimToken: TOKEN }, fixed()).decision)
      .toBe('abandoned');
  });

  test('abandon recovers a matching transition while the active claim remains', () => {
    const input = parsed();
    executeClaimAction(input, fixed());
    const active = activeName(input.claimRoot);
    const capacitySlot = activeState(input.claimRoot).capacity_slot;
    writeFileSync(join(input.claimRoot, active.replace('.active.json', '.transition.json')),
      JSON.stringify(transition(input, 'abandon', capacitySlot)));

    expect(executeClaimAction({ ...input, action: 'abandon', claimToken: TOKEN }, fixed()).decision)
      .toBe('abandoned');
    expect(readdirSync(input.claimRoot).some((name: string) => name.startsWith('.capacity-slot-')))
      .toBe(false);
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

  test('fails closed when the reserved capacity slot contradicts its active claim', () => {
    const input = parsed();
    executeClaimAction(input, fixed());
    const slotPath = join(input.claimRoot, readdirSync(input.claimRoot)
      .find((name: string) => name.startsWith('.capacity-slot-'))!);
    const slot = JSON.parse(readFileSync(slotPath, 'utf8'));
    slot.wake_id = 'other-delivery';
    writeFileSync(slotPath, JSON.stringify(slot));

    expect(() => executeClaimAction(input, fixed())).toThrowError(
      expect.objectContaining({ code: 'capacity_slot' })
    );
  });

  test('a transition marker blocks new work on the same head', () => {
    const input = parsed();
    executeClaimAction(input, fixed());
    const active = activeName(input.claimRoot);
    const capacitySlot = activeState(input.claimRoot).capacity_slot;
    writeFileSync(join(input.claimRoot, active.replace('.active.json', '.transition.json')),
      JSON.stringify(transition(input, 'complete', capacitySlot)));

    expect(executeClaimAction({ ...input, wakeId: 'delivery-2' }, fixed()).decision).toBe('busy');
  });

  test('an abandon transition remains blocking after active removal while its slot exists', () => {
    const input = parsed();
    executeClaimAction(input, fixed());
    const active = activeName(input.claimRoot);
    const capacitySlot = activeState(input.claimRoot).capacity_slot;
    unlinkSync(join(input.claimRoot, active));
    writeFileSync(join(input.claimRoot, active.replace('.active.json', '.transition.json')),
      JSON.stringify(transition(input, 'abandon', capacitySlot)));

    expect(executeClaimAction({ ...input, wakeId: 'delivery-2' }, fixed()).decision).toBe('busy');
  });

  test.each(['completed', 'transition'] as const)(
    'fails closed on a dangling %s path',
    (boundary) => {
      const input = parsed();
      executeClaimAction(input, fixed());
      let path;
      if (boundary === 'completed') {
        executeClaimAction({ ...input, action: 'complete', claimToken: TOKEN }, fixed());
        path = join(input.claimRoot, readdirSync(input.claimRoot)
          .find((name: string) => name.endsWith('.completed.json'))!);
        unlinkSync(path);
      } else {
        const active = activeName(input.claimRoot);
        path = join(input.claimRoot, active.replace('.active.json', '.transition.json'));
      }
      symlinkSync(join(input.claimRoot, 'missing-target'), path);

      expect(() => executeClaimAction(input, fixed())).toThrow();
    }
  );

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

  test('fails closed at the wake-record capacity', () => {
    const input = parsed();
    for (let index = 0; index < MAX_WAKE_RECORDS; index += 1) {
      writeFileSync(join(input.claimRoot, `.capacity-slot-${index}.json`),
        JSON.stringify(capacitySlot(index, 1)));
    }
    expect(() => executeClaimAction(input, fixed())).toThrowError(
      expect.objectContaining({ code: 'claim_root_capacity' })
    );
  });

  test('reclaims dead-publisher reservations that have no active owner', () => {
    const input = parsed();
    for (let index = 0; index < MAX_WAKE_RECORDS; index += 1) {
      writeFileSync(join(input.claimRoot, `.capacity-slot-${index}.json`),
        JSON.stringify(capacitySlot(index, 2_147_483_647)));
    }

    expect(executeClaimAction(input, fixed()).decision).toBe('acquired');
    expect(readdirSync(input.claimRoot).filter((name: string) => name.endsWith('.orphan.json')))
      .toHaveLength(0);
  });

  test('reclaims a dead publisher active temporary file with its reservation', () => {
    const input = parsed();
    expect(executeClaimAction(input, fixed()).decision).toBe('acquired');
    const active = activeName(input.claimRoot);
    const slot = activeState(input.claimRoot).capacity_slot;
    const slotPath = join(input.claimRoot, `.capacity-slot-${slot}.json`);
    const record = JSON.parse(readFileSync(slotPath, 'utf8'));
    unlinkSync(join(input.claimRoot, active));
    writeFileSync(slotPath, JSON.stringify({ ...record, publisher_pid: 2_147_483_647 }));
    const publication = join(input.claimRoot, `.${active.replace('.json', `.slot-${slot}.tmp`)}`);
    writeFileSync(publication, '{"partial":');

    expect(executeClaimAction(input, fixed()).decision).toBe('acquired');
    expect(readdirSync(input.claimRoot)).not.toContain(publication.split('/').at(-1));
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
    expect(results.filter(({ exitCode }) => exitCode === 0)).toHaveLength(1);
    expect(results.filter(({ exitCode }) => exitCode === 1)).toHaveLength(1);
    expect(results.every(({ output }) => ['acquired', 'duplicate', 'busy'].includes(output.decision)))
      .toBe(true);
  });

  test('a burst of real acquire processes returns ownership decisions without races', async () => {
    const args = cli();
    const results = await Promise.all(Array.from({ length: 8 }, () => runProcess(args)));

    expect(results.filter(({ output }) => output.decision === 'acquired')).toHaveLength(1);
    expect(results.every(({ output }) => ['acquired', 'duplicate', 'busy'].includes(output.decision)))
      .toBe(true);
  });

  test('parallel different-head acquires cannot exceed the final capacity slot', async () => {
    const claimRoot = root();
    for (let index = 0; index < MAX_WAKE_RECORDS - 1; index += 1) {
      writeFileSync(join(claimRoot, `.capacity-slot-${index}.json`),
        JSON.stringify(capacitySlot(index, 1)));
    }
    const results = await Promise.all([
      runProcess(cli({ claimRoot, expectedHead: '2'.repeat(40), wakeId: 'delivery-2' })),
      runProcess(cli({ claimRoot, expectedHead: '3'.repeat(40), wakeId: 'delivery-3' })),
    ]);

    expect(results.filter(({ output }) => output.decision === 'acquired')).toHaveLength(1);
    expect(results.filter(({ output }) => output.error?.code === 'claim_root_capacity')).toHaveLength(1);
    expect(readdirSync(claimRoot).filter((name: string) => name.startsWith('.capacity-slot-')))
      .toHaveLength(MAX_WAKE_RECORDS);
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

  test('a burst of real completion retries never loses both receipt and active state', async () => {
    const input = parsed();
    executeClaimAction(input, fixed());
    const args = cli({ action: 'complete', claimRoot: input.claimRoot, claimToken: TOKEN });
    const results = await Promise.all(Array.from({ length: 8 }, () => runProcess(args)));

    expect(results.every(({ output }) => ['completed', 'busy'].includes(output.decision))).toBe(true);
    expect(results.some(({ output }) => output.decision === 'completed')).toBe(true);
  });

  test('two real abandon processes leave no active claim or capacity slot', async () => {
    const input = parsed();
    executeClaimAction(input, fixed());
    const args = cli({ action: 'abandon', claimRoot: input.claimRoot, claimToken: TOKEN });
    const results = await Promise.all([runProcess(args), runProcess(args)]);

    expect(results.some(({ output }) => output.decision === 'abandoned')).toBe(true);
    expect(readdirSync(input.claimRoot).filter((name: string) => name.endsWith('.active.json'))).toHaveLength(0);
    expect(readdirSync(input.claimRoot).filter((name: string) => name.startsWith('.capacity-slot-'))).toHaveLength(0);
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

function pathNames(claimRoot: string) {
  return readdirSync(claimRoot) as string[];
}

function writeDeadPublication(publication: string) {
  writeFileSync(publication, '{"partial":');
  symlinkSync('2147483647:33333333-3333-4333-8333-333333333333', `${publication}.lock`);
}

function activeName(claimRoot: string) {
  return readdirSync(claimRoot).find((name: string) => name.endsWith('.active.json'))!;
}

function activeState(claimRoot: string) {
  return JSON.parse(readFileSync(join(claimRoot, activeName(claimRoot)), 'utf8'));
}

function transition(input: ReturnType<typeof parsed>, action: string, capacitySlot: number) {
  return {
    schema_version: 1,
    record_type: 'transition',
    action,
    repository: input.repository,
    pull_request: input.prNumber,
    expected_head_sha: input.expectedHead,
    wake_source: input.wakeSource,
    wake_id: input.wakeId,
    capacity_slot: capacitySlot,
    claim_token_sha256: TOKEN_HASH,
  };
}

function capacitySlot(slot: number, publisherPid: number) {
  return {
    schema_version: 1,
    record_type: 'capacity_slot',
    capacity_slot: slot,
    repository: 'occupied/repo',
    pull_request: 999,
    expected_head_sha: '9'.repeat(40),
    wake_source: 'check',
    wake_id: `occupied-${slot}`,
    claim_token_sha256: TOKEN_HASH,
    publisher_pid: publisherPid,
    reserved_at: '2026-07-11T02:00:00.000Z',
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
