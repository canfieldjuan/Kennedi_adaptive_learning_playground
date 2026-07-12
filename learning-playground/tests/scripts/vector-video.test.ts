// @ts-expect-error Vitest runs in Node; the app intentionally does not ship Node typings.
import { access, mkdtemp, mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
// @ts-expect-error Vitest runs in Node; the app intentionally does not ship Node typings.
import { EventEmitter } from 'node:events';
// @ts-expect-error Vitest runs in Node; the app intentionally does not ship Node typings.
import { tmpdir } from 'node:os';
// @ts-expect-error Vitest runs in Node; the app intentionally does not ship Node typings.
import path from 'node:path';
// @ts-expect-error Vitest runs in Node; the app intentionally does not ship Node typings.
import process from 'node:process';
import { describe, expect, test } from 'vitest';
// @ts-expect-error The repository-owned Node CLI is intentionally plain JavaScript.
import * as vectorVideo from '../../scripts/video-production/vector-video.mjs';

const {
  assertNoSymlinkSegments,
  buildFfmpegArgs,
  loadVectorContext,
  parseCliArgs,
  planFrameTimes,
  renderVectorCommand,
  validateManifest,
  validateSourceText,
} = vectorVideo;

const SOURCE_ROOT = path.join(process.cwd(), 'design-source/video/bear-bakes-bread');
const MANIFEST_PATH = path.join(SOURCE_ROOT, 'vector-render-manifest.json');

describe('deterministic vector video proof boundary', () => {
  test('parses only the bounded render CLI', () => {
    expect(parseCliArgs(['render', '--manifest', 'proof.json', '--dry-run'])).toEqual({
      command: 'render', manifest: 'proof.json', dryRun: true,
    });
    expect(() => parseCliArgs(['assemble', '--manifest', 'proof.json'])).toThrow(/render/);
    expect(() => parseCliArgs(['render', '--manifest', 'proof.json', '--seed', '1'])).toThrow(/unknown/);
    expect(() => parseCliArgs(['render'])).toThrow(/manifest/);
  });

  test('pins proof-only geometry, local paths, browser, and deterministic VP9 settings', () => {
    expect(validateManifest(makeManifest())).toBeDefined();
    expect(() => validateManifest(makeManifest({ production_writes_allowed: true }))).toThrow();
    expect(() => validateManifest(makeManifest({ width: 0 }))).toThrow(/geometry/);
    expect(() => validateManifest(makeManifest({ source_svg: '../escape.svg' }))).toThrow();
    expect(() => validateManifest(makeManifest({ review_output: 'public/proof.webm' }))).toThrow(/review/);
    expect(() => validateManifest(makeManifest({
      browser: { ...makeManifest().browser, network_allowed: true },
    }))).toThrow(/network/);
    expect(() => validateManifest(makeManifest({
      encoding: { ...makeManifest().encoding, threads: 4 },
    }))).toThrow(/threads/);
  });

  test('validates the committed manifest and editable animation source', async () => {
    const manifest = validateManifest(JSON.parse(await readFile(MANIFEST_PATH, 'utf8')));
    const source = await readFile(path.join(SOURCE_ROOT, manifest.source_svg), 'utf8');

    expect(validateSourceText(source, manifest)).toBe(source);
    expect(source.match(/inkscape:groupmode="layer"/g)).toHaveLength(14);
    expect(source.match(/<animateTransform\b/g)).toHaveLength(4);
    expect(source).toContain('id="spoon-grip"');
    expect(source).not.toMatch(/<(?:text|image|script|foreignObject)\b/i);
  });

  test('rejects embedded content, external references, and missing motion targets', () => {
    const manifest = makeManifest();
    const source = validSource();
    expect(validateSourceText(source, manifest)).toBe(source);
    expect(() => validateSourceText(source.replace('</svg>', '<image href="remote.png"/></svg>'), manifest))
      .toThrow(/embedded-content/);
    expect(() => validateSourceText(source.replace('</svg>', '<style>@import "file:///tmp/x";</style></svg>'), manifest))
      .toThrow(/embedded-content/);
    expect(() => validateSourceText(source.replace('</svg>', '<path href="https://example.com/a"/></svg>'), manifest))
      .toThrow(/external/);
    expect(() => validateSourceText(source.replace('<svg ', '<svg onload="fetch(\'https://example.com\')" '), manifest))
      .toThrow(/event-handler/);
    expect(() => validateSourceText(source.replace('id="spoon-grip"', 'id="removed"'), manifest))
      .toThrow(/spoon-grip/);
  });

  test('plans exactly 77 monotonically increasing frame times', () => {
    const plan = planFrameTimes(77, 24);
    expect(plan).toHaveLength(77);
    expect(plan[0]).toEqual({ index: 0, seconds: 0, filename: 'frame-00000.png' });
    expect(plan.at(-1)).toEqual({
      index: 76, seconds: 76 / 24, filename: 'frame-00076.png',
    });
    expect(new Set(plan.map((frame: any) => frame.filename)).size).toBe(77);
    expect(() => planFrameTimes(78, 24)).toThrow(/pinned/);
  });

  test('builds metadata-free, audio-free, single-threaded VP9 encoding', () => {
    const args = buildFfmpegArgs(makeManifest(), '/lab/frames', '/lab/review/proof.webm');
    expect(args).toContain('-an');
    expect(args).toContain('-map_metadata');
    expect(args.filter((value: string) => value === 'encoder=')).toHaveLength(2);
    expect(flagValue(args, '-fflags')).toBe('+bitexact');
    expect(flagValue(args, '-flags:v')).toBe('+bitexact');
    expect(args).toContain('libvpx-vp9');
    expect(flagValue(args, '-threads')).toBe('1');
    expect(flagValue(args, '-row-mt')).toBe('0');
    expect(flagValue(args, '-frames:v')).toBe('77');
    expect(args.at(-1)).toBe('/lab/review/proof.webm');
  });

  test('rejects symlinked path components and repository output roots', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'kennedi-vector-path-test-'));
    const target = path.join(root, 'target');
    const linked = path.join(root, 'linked');
    await mkdir(target);
    await symlink(target, linked);
    await expect(assertNoSymlinkSegments(path.join(linked, 'frames'), 'frames'))
      .rejects.toThrow(/symbolic/);
    await expect(loadVectorContext(MANIFEST_PATH, {
      KENNEDI_VECTOR_VIDEO_LAB: process.cwd(),
    })).rejects.toThrow(/inside the repository/);

    const manifestTarget = path.join(root, 'manifest.json');
    const manifestLink = path.join(root, 'manifest-link.json');
    await writeFile(manifestTarget, JSON.stringify(makeManifest()));
    await symlink(manifestTarget, manifestLink);
    await expect(loadVectorContext(manifestLink)).rejects.toThrow(/symbolic/);
  });

  test('verifies the committed source hash before planning a dry run', async () => {
    const labRoot = await mkdtemp(path.join(tmpdir(), 'kennedi-vector-dry-run-'));
    const context = await loadVectorContext(MANIFEST_PATH, {
      KENNEDI_VECTOR_VIDEO_LAB: labRoot,
    });
    const result = await renderVectorCommand(context, { dryRun: true });
    expect(result).toMatchObject({
      dry_run: true,
      source_sha256: context.manifest.source_sha256,
      frame_count: 77,
      first_frame_seconds: 0,
      last_frame_seconds: 76 / 24,
    });

    const project = await mkdtemp(path.join(tmpdir(), 'kennedi-vector-hash-test-'));
    const sourceRoot = path.join(project, 'design-source');
    await mkdir(sourceRoot, { recursive: true });
    await writeFile(path.join(project, 'package.json'), '{"name":"learning-playground"}\n');
    await writeFile(path.join(sourceRoot, 'source.svg'), validSource());
    await writeFile(path.join(sourceRoot, 'manifest.json'), JSON.stringify(makeManifest({
      source_svg: 'source.svg',
      source_sha256: '0'.repeat(64),
    })));
    await expect(loadVectorContext(path.join(sourceRoot, 'manifest.json'), {
      KENNEDI_VECTOR_VIDEO_LAB: path.join(project, '..', 'external-lab'),
    })).rejects.toThrow(/SHA-256/);
  });

  test('removes stale output evidence before a failed rerender', async () => {
    const labRoot = await mkdtemp(path.join(tmpdir(), 'kennedi-vector-stale-test-'));
    const context = await loadVectorContext(MANIFEST_PATH, {
      KENNEDI_VECTOR_VIDEO_LAB: labRoot,
    });
    const recordPath = path.join(path.dirname(context.frameRoot), 'render-run.json');
    await mkdir(path.dirname(context.outputPath), { recursive: true });
    await mkdir(path.dirname(recordPath), { recursive: true });
    await writeFile(context.outputPath, 'stale video');
    await writeFile(recordPath, '{"stale":true}\n');

    const page = {
      setDefaultTimeout() {},
      async route() {},
      async goto() {},
      async evaluate(callback: Function) {
        if (callback.toString().includes('missingTargets')) {
          return {
            localName: 'svg', width: 1280, height: 704, prohibited: null,
            missingTargets: [], frameCount: 77, fps: 24, canPause: true, canSeek: true,
            expectedFrames: 77, expectedFps: 24, expectedWidth: 1280, expectedHeight: 704,
          };
        }
      },
      async screenshot({ path: framePath }: { path: string }) {
        await writeFile(framePath, 'frame');
      },
    };
    const browserType = {
      async launch() {
        return { async newPage() { return page; }, async close() {} };
      },
    };
    const spawnImpl = () => {
      const child = new EventEmitter() as EventEmitter & { kill: () => void };
      child.kill = () => {};
      queueMicrotask(async () => {
        await writeFile(context.outputPath, 'partial failed video');
        child.emit('exit', 1);
      });
      return child;
    };

    await expect(renderVectorCommand(context, { dryRun: false }, {
      browserType,
      spawnImpl,
      processTimeoutMs: 1_000,
    })).rejects.toThrow(/exited with code 1/);
    await expect(access(context.outputPath)).rejects.toThrow();
    await expect(access(recordPath)).rejects.toThrow();
  });
});

function makeManifest(overrides: Record<string, unknown> = {}) {
  const manifest = {
    schema_version: 1,
    id: 'bear-mixes-dough-vector-proof',
    proof_only: true,
    production_writes_allowed: false,
    source_svg: 'mix-dough-vector-animation.svg',
    source_sha256: '3fdf8aac7903e0c25478eb6c91eec6e53b618b791133fda20dc5c1a511f12984',
    width: 1280,
    height: 704,
    frames: 77,
    fps: 24,
    timeline_duration_seconds: 3.208333,
    frame_directory: 'vector-renders/bear-mixes-dough-vector-proof/frames',
    review_output: 'review/bear-mixes-dough-vector-proof.webm',
    browser: { engine: 'chromium', device_scale_factor: 1, network_allowed: false },
    encoding: {
      codec: 'libvpx-vp9', pixel_format: 'yuv420p', crf: 30, bitrate: '0',
      threads: 1, row_multithreading: false, audio: 'none', metadata: 'strip_source',
      bitexact: true,
    },
  };
  return { ...manifest, ...overrides } as any;
}

function validSource() {
  return `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="1280" height="704" viewBox="0 0 1280 704" data-duration-seconds="3.208333" data-fps="24" data-frame-count="77"><g id="mixing-arm"><animateTransform/></g><g id="spoon"><animateTransform/></g><g id="spoon-grip"><animateTransform/></g><path id="dough-swirl"><animateTransform/></path><g id="blink"><animate attributeName="opacity"/></g></svg>`;
}

function flagValue(args: string[], flag: string) {
  return args[args.indexOf(flag) + 1];
}
