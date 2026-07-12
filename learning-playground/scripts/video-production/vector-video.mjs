#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import {
  access,
  lstat,
  mkdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const VECTOR_PROOF = Object.freeze({
  width: 1280,
  height: 704,
  frames: 77,
  fps: 24,
  timelineDurationSeconds: 3.208333,
  timeoutMs: 60_000,
});

export function parseCliArgs(argv) {
  const [command, ...rest] = argv;
  if (command !== 'render') throw new Error('command must be render');
  const options = { command, dryRun: false, manifest: undefined };

  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index];
    if (value === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (value === '--manifest') {
      const next = rest[index + 1];
      if (!next || next.startsWith('--')) throw new Error('--manifest requires a value');
      options.manifest = next;
      index += 1;
      continue;
    }
    throw new Error(`unknown argument: ${value}`);
  }

  if (!options.manifest) throw new Error('--manifest is required');
  return options;
}

export function validateManifest(value) {
  assertRecord(value, 'manifest');
  if (value.schema_version !== 1) throw new Error('schema_version must be 1');
  if (!safeId(value.id)) throw new Error('manifest id must be lowercase kebab-case');
  if (value.proof_only !== true) throw new Error('proof_only must remain true');
  if (value.production_writes_allowed !== false) {
    throw new Error('production_writes_allowed must remain false');
  }
  assertSafeRelativePath(value.source_svg, 'source_svg');
  if (!/^[a-f0-9]{64}$/.test(value.source_sha256)) {
    throw new Error('source_sha256 must be a lowercase SHA-256 value');
  }
  if (
    value.width !== VECTOR_PROOF.width
    || value.height !== VECTOR_PROOF.height
    || value.frames !== VECTOR_PROOF.frames
    || value.fps !== VECTOR_PROOF.fps
    || Math.abs(value.timeline_duration_seconds - VECTOR_PROOF.timelineDurationSeconds) > 0.000001
  ) {
    throw new Error('vector proof geometry and timeline must remain 1280x704, 77 frames, and 24 FPS');
  }
  assertSafeRelativePath(value.frame_directory, 'frame_directory');
  assertSafeRelativePath(value.review_output, 'review_output');
  if (!value.frame_directory.startsWith(`vector-renders/${value.id}/`)) {
    throw new Error('frame_directory must stay inside the manifest vector-render namespace');
  }
  if (!value.review_output.startsWith('review/') || !value.review_output.endsWith('.webm')) {
    throw new Error('review_output must be a WebM under review/');
  }

  assertRecord(value.browser, 'browser');
  if (
    value.browser.engine !== 'chromium'
    || value.browser.device_scale_factor !== 1
    || value.browser.network_allowed !== false
  ) {
    throw new Error('browser must remain local Chromium at device scale 1 with network disabled');
  }
  assertRecord(value.encoding, 'encoding');
  const expectedEncoding = {
    codec: 'libvpx-vp9',
    pixel_format: 'yuv420p',
    crf: 30,
    bitrate: '0',
    threads: 1,
    row_multithreading: false,
    bitexact: true,
    audio: 'none',
    metadata: 'strip_source',
  };
  for (const [key, expected] of Object.entries(expectedEncoding)) {
    if (value.encoding[key] !== expected) throw new Error(`encoding.${key} must remain ${expected}`);
  }
  return value;
}

export function validateSourceText(source, manifest) {
  if (!/^<\?xml[\s\S]*?<svg\b/.test(source)) throw new Error('source must be an SVG document');
  const prohibited = /<(?:text|image|script|style|foreignObject|audio|video)\b/i;
  if (prohibited.test(source)) throw new Error('source contains a prohibited embedded-content element');
  if (/\son[a-z][a-z0-9:.-]*\s*=/i.test(source)) {
    throw new Error('source contains a prohibited event-handler attribute');
  }
  const externalUrl = /https?:\/\/(?!www\.w3\.org\/2000\/svg|www\.inkscape\.org\/namespaces\/inkscape)/i;
  if (externalUrl.test(source) || /\b(?:href|src)\s*=|url\s*\(/i.test(source)) {
    throw new Error('source contains an external or embedded resource reference');
  }
  const expectedRootValues = [
    `width="${manifest.width}"`,
    `height="${manifest.height}"`,
    `viewBox="0 0 ${manifest.width} ${manifest.height}"`,
    `data-duration-seconds="${manifest.timeline_duration_seconds}"`,
    `data-fps="${manifest.fps}"`,
    `data-frame-count="${manifest.frames}"`,
  ];
  for (const value of expectedRootValues) {
    if (!source.includes(value)) throw new Error(`source is missing pinned root value ${value}`);
  }
  for (const id of [
    'mixing-arm', 'mixing-hand', 'spoon', 'spoon-shaft', 'spoon-working-end',
    'spoon-grip', 'dough-surface', 'dough-swirl', 'blink',
  ]) {
    if (!source.includes(`id="${id}"`)) throw new Error(`source is missing animation target ${id}`);
  }
  const animationTags = [...source.matchAll(/<(animate[a-z]*|set|mpath|discard)\b/gi)]
    .map((match) => match[1].toLowerCase());
  if (
    animationTags.length !== 5
    || animationTags.filter((tag) => tag === 'animatetransform').length !== 4
    || animationTags.filter((tag) => tag === 'animate').length !== 1
  ) {
    throw new Error('source must contain only four motion transforms and one blink animation');
  }
  return source;
}

export function planFrameTimes(frames, fps) {
  if (frames !== VECTOR_PROOF.frames || fps !== VECTOR_PROOF.fps) {
    throw new Error('frame plan must use the pinned proof timeline');
  }
  return Array.from({ length: frames }, (_, index) => ({
    index,
    seconds: index / fps,
    filename: `frame-${String(index).padStart(5, '0')}.png`,
  }));
}

export function buildFfmpegArgs(manifest, frameRoot, outputPath) {
  return [
    '-y',
    '-framerate', String(manifest.fps),
    '-start_number', '0',
    '-i', path.join(frameRoot, 'frame-%05d.png'),
    '-frames:v', String(manifest.frames),
    '-an',
    '-map_metadata', '-1',
    '-metadata', 'encoder=',
    '-metadata:s:v', 'encoder=',
    '-fflags', '+bitexact',
    '-flags:v', '+bitexact',
    '-c:v', manifest.encoding.codec,
    '-pix_fmt', manifest.encoding.pixel_format,
    '-b:v', manifest.encoding.bitrate,
    '-crf', String(manifest.encoding.crf),
    '-threads', String(manifest.encoding.threads),
    '-row-mt', manifest.encoding.row_multithreading ? '1' : '0',
    outputPath,
  ];
}

export async function loadVectorContext(manifestArgument, environment = process.env) {
  const manifestPath = path.resolve(manifestArgument);
  const projectRoot = PROJECT_ROOT;
  assertWithin(manifestPath, projectRoot, 'manifest');
  await assertNoSymlinkSegments(manifestPath, 'manifest');
  const manifest = validateManifest(JSON.parse(await readFile(manifestPath, 'utf8')));
  const sourceRoot = path.dirname(manifestPath);
  const labRoot = path.resolve(
    environment.KENNEDI_VECTOR_VIDEO_LAB
      ?? path.join(homedir(), '.local', 'share', 'kennedi-vector-video-lab')
  );
  assertOutside(labRoot, projectRoot, 'vector lab root');
  await assertNoSymlinkSegments(labRoot, 'vector lab root');

  const sourcePath = resolveSourcePath(sourceRoot, manifest.source_svg, 'source SVG');
  assertWithin(sourcePath, projectRoot, 'source SVG');
  await assertNoSymlinkSegments(sourcePath, 'source SVG');
  await access(sourcePath);
  const source = validateSourceText(await readFile(sourcePath, 'utf8'), manifest);
  const sourceSha256 = await sha256File(sourcePath);
  assertSourceSha256(sourceSha256, manifest.source_sha256);

  const frameRoot = path.resolve(labRoot, manifest.frame_directory);
  const outputPath = path.resolve(labRoot, manifest.review_output);
  assertWithin(frameRoot, labRoot, 'frame directory');
  assertWithin(outputPath, labRoot, 'review output');
  assertOutside(frameRoot, projectRoot, 'frame directory');
  assertOutside(outputPath, projectRoot, 'review output');

  return {
    manifest,
    manifestPath,
    source,
    sourcePath,
    sourceSha256,
    sourceRoot,
    projectRoot,
    labRoot,
    frameRoot,
    outputPath,
  };
}

export async function renderVectorCommand(context, options, dependencies = {}) {
  const framePlan = planFrameTimes(context.manifest.frames, context.manifest.fps);
  const ffmpegArgs = buildFfmpegArgs(context.manifest, context.frameRoot, context.outputPath);
  if (options.dryRun) {
    return {
      dry_run: true,
      source: context.sourcePath,
      source_sha256: context.sourceSha256,
      frame_count: framePlan.length,
      first_frame_seconds: framePlan[0].seconds,
      last_frame_seconds: framePlan.at(-1).seconds,
      output: context.outputPath,
      ffmpeg: ffmpegArgs,
    };
  }

  await prepareCleanDirectory(context.labRoot, context.projectRoot, 'vector lab root');
  await prepareCleanFrameDirectory(context.frameRoot, context.labRoot, context.projectRoot);
  await prepareOutputPath(context.outputPath, context.labRoot, context.projectRoot);
  const recordPath = path.join(path.dirname(context.frameRoot), 'render-run.json');
  await assertNoSymlinkSegments(recordPath, 'render record');
  await rm(recordPath, { force: true });

  const browserType = dependencies.browserType ?? chromium;
  const browser = await browserType.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({
      viewport: { width: context.manifest.width, height: context.manifest.height },
      deviceScaleFactor: context.manifest.browser.device_scale_factor,
    });
    page.setDefaultTimeout(15_000);
    const sourceUrl = `data:image/svg+xml;base64,${Buffer.from(context.source, 'utf8').toString('base64')}`;
    await page.route('**/*', async (route) => {
      if (route.request().url() === sourceUrl) await route.continue();
      else await route.abort('blockedbyclient');
    });
    await page.goto(sourceUrl, { waitUntil: 'load' });
    await validateBrowserDocument(page, context.manifest);

    for (const frame of framePlan) {
      await page.evaluate((seconds) => {
        const svg = document.documentElement;
        svg.pauseAnimations();
        svg.setCurrentTime(seconds);
      }, frame.seconds);
      await page.evaluate(() => new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }));
      await validateMixingGeometry(page, frame.index);
      await page.screenshot({
        path: path.join(context.frameRoot, frame.filename),
        clip: { x: 0, y: 0, width: context.manifest.width, height: context.manifest.height },
        omitBackground: false,
      });
    }
  } finally {
    await browser.close();
  }

  const frameSetSha256 = await sha256FrameSet(context.frameRoot, framePlan);
  try {
    await runProcess(
      dependencies.ffmpegExecutable ?? 'ffmpeg',
      ffmpegArgs,
      dependencies.spawnImpl ?? spawn,
      dependencies.processTimeoutMs ?? VECTOR_PROOF.timeoutMs
    );
  } catch (error) {
    await rm(context.outputPath, { force: true });
    throw error;
  }
  const outputSha256 = await sha256File(context.outputPath);
  await writeFile(recordPath, `${JSON.stringify({
    manifest_id: context.manifest.id,
    source_sha256: context.sourceSha256,
    frame_set_sha256: frameSetSha256,
    output_sha256: outputSha256,
    frame_count: context.manifest.frames,
    fps: context.manifest.fps,
    output: context.outputPath,
  }, null, 2)}\n`, 'utf8');

  return {
    dry_run: false,
    source_sha256: context.sourceSha256,
    frame_set_sha256: frameSetSha256,
    output_sha256: outputSha256,
    frame_count: context.manifest.frames,
    output: context.outputPath,
    record: recordPath,
  };
}

export async function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

export function assertSourceSha256(actual, expected) {
  if (actual !== expected) throw new Error('source SVG SHA-256 mismatch');
}

export async function sha256FrameSet(frameRoot, framePlan) {
  const hash = createHash('sha256');
  for (const frame of framePlan) {
    hash.update(frame.filename);
    hash.update(await readFile(path.join(frameRoot, frame.filename)));
  }
  return hash.digest('hex');
}

export async function assertNoSymlinkSegments(candidate, label) {
  const absolute = path.resolve(candidate);
  const parsed = path.parse(absolute);
  let current = parsed.root;
  const segments = absolute.slice(parsed.root.length).split(path.sep).filter(Boolean);
  for (const segment of segments) {
    current = path.join(current, segment);
    try {
      const stat = await lstat(current);
      if (stat.isSymbolicLink()) throw new Error(`${label} cannot contain symbolic links`);
    } catch (error) {
      if (error?.code === 'ENOENT') return;
      throw error;
    }
  }
}

async function validateBrowserDocument(page, manifest) {
  const result = await page.evaluate(({ width, height, frames, fps }) => {
    const svg = document.documentElement;
    const viewBox = svg.viewBox.baseVal;
    const prohibited = svg.querySelector('text,image,script,style,foreignObject,audio,video');
    const targets = [
      'mixing-arm', 'mixing-hand', 'spoon', 'spoon-shaft', 'spoon-working-end',
      'spoon-grip', 'dough-surface', 'dough-swirl', 'blink',
    ];
    const animations = [...svg.querySelectorAll(
      'animate,animateTransform,animateMotion,animateColor,set,mpath,discard'
    )]
      .map((element) => [
        element.parentElement?.id ?? '',
        element.localName.toLowerCase(),
        element.getAttribute('attributeName') ?? '',
      ].join(':'))
      .sort();
    return {
      localName: svg.localName,
      width: viewBox.width,
      height: viewBox.height,
      prohibited: prohibited?.localName ?? null,
      missingTargets: targets.filter((id) => !document.getElementById(id)),
      animations,
      frameCount: Number(svg.dataset.frameCount),
      fps: Number(svg.dataset.fps),
      canPause: typeof svg.pauseAnimations === 'function',
      canSeek: typeof svg.setCurrentTime === 'function',
      expectedFrames: frames,
      expectedFps: fps,
      expectedWidth: width,
      expectedHeight: height,
    };
  }, manifest);
  if (
    result.localName !== 'svg'
    || result.width !== result.expectedWidth
    || result.height !== result.expectedHeight
    || result.prohibited !== null
    || result.missingTargets.length > 0
    || result.animations.join('|') !== [
      'blink:animate:opacity',
      'dough-swirl:animatetransform:transform',
      'mixing-arm:animatetransform:transform',
      'spoon-grip:animatetransform:transform',
      'spoon:animatetransform:transform',
    ].join('|')
    || result.frameCount !== result.expectedFrames
    || result.fps !== result.expectedFps
    || !result.canPause
    || !result.canSeek
  ) {
    throw new Error(`browser SVG validation failed: ${JSON.stringify(result)}`);
  }
}

async function validateMixingGeometry(page, frameIndex) {
  const geometry = await page.evaluate((sampledFrame) => {
    const rect = (id) => {
      const bounds = document.getElementById(id)?.getBoundingClientRect();
      if (!bounds) return null;
      return {
        left: bounds.left,
        right: bounds.right,
        top: bounds.top,
        bottom: bounds.bottom,
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
      };
    };
    return {
      frame: sampledFrame,
      dough: rect('dough-surface'),
      hand: rect('mixing-hand'),
      grip: rect('spoon-grip'),
      shaft: rect('spoon-shaft'),
      workingEnd: rect('spoon-working-end'),
    };
  }, frameIndex);
  const { dough, hand, grip, shaft, workingEnd } = geometry;
  if (!dough || !hand || !grip || !shaft || !workingEnd) {
    throw new Error(`mixing geometry missing at frame ${frameIndex}`);
  }
  const handGripDistance = Math.hypot(hand.x - grip.x, hand.y - grip.y);
  const workingEndInsideDough = (
    workingEnd.x >= dough.left + 20
    && workingEnd.x <= dough.right - 20
    && workingEnd.y >= dough.top + 20
    && workingEnd.y <= dough.bottom + 2
  );
  const gripTouchesShaft = (
    grip.x >= shaft.left - 8
    && grip.x <= shaft.right + 8
    && grip.y >= shaft.top - 8
    && grip.y <= shaft.bottom + 8
  );
  if (!workingEndInsideDough || handGripDistance > 45 || !gripTouchesShaft) {
    throw new Error(`mixing geometry escaped at frame ${frameIndex}: ${JSON.stringify(geometry)}`);
  }
}

async function prepareCleanDirectory(directory, projectRoot, label) {
  assertOutside(directory, projectRoot, label);
  await assertNoSymlinkSegments(directory, label);
  await mkdir(directory, { recursive: true });
  await assertNoSymlinkSegments(directory, label);
  const [actualDirectory, actualProject] = await Promise.all([realpath(directory), realpath(projectRoot)]);
  assertOutside(actualDirectory, actualProject, label);
}

async function prepareCleanFrameDirectory(frameRoot, labRoot, projectRoot) {
  assertWithin(frameRoot, labRoot, 'frame directory');
  assertOutside(frameRoot, projectRoot, 'frame directory');
  await assertNoSymlinkSegments(frameRoot, 'frame directory');
  await rm(frameRoot, { recursive: true, force: true });
  await mkdir(frameRoot, { recursive: true });
  await assertNoSymlinkSegments(frameRoot, 'frame directory');
  const [actualFrames, actualLab] = await Promise.all([realpath(frameRoot), realpath(labRoot)]);
  assertWithin(actualFrames, actualLab, 'frame directory');
}

async function prepareOutputPath(outputPath, labRoot, projectRoot) {
  assertWithin(outputPath, labRoot, 'review output');
  assertOutside(outputPath, projectRoot, 'review output');
  await assertNoSymlinkSegments(outputPath, 'review output');
  await mkdir(path.dirname(outputPath), { recursive: true });
  await assertNoSymlinkSegments(path.dirname(outputPath), 'review output directory');
  try {
    const stat = await lstat(outputPath);
    if (stat.isSymbolicLink()) throw new Error('review output cannot be a symbolic link');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  await rm(outputPath, { force: true });
}

function runProcess(executable, args, spawnImpl, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawnImpl(executable, args, { stdio: 'inherit' });
    let settled = false;
    let timeoutError;
    let killGrace;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      clearTimeout(killGrace);
      if (error) reject(error);
      else resolve();
    };
    const timeout = setTimeout(() => {
      if (settled) return;
      timeoutError = new Error(`${executable} timed out after ${timeoutMs}ms`);
      child.kill('SIGKILL');
      killGrace = setTimeout(() => finish(timeoutError), 5_000);
    }, timeoutMs);
    child.on('error', (error) => {
      finish(timeoutError ?? error);
    });
    child.on('exit', (code) => {
      if (timeoutError) finish(timeoutError);
      else if (code === 0) finish();
      else finish(new Error(`${executable} exited with code ${code}`));
    });
  });
}

function assertSafeRelativePath(value, label) {
  if (typeof value !== 'string' || value.trim() !== value || value.length === 0) {
    throw new Error(`${label} must be a non-empty relative path`);
  }
  if (path.isAbsolute(value) || value.includes('\\')) {
    throw new Error(`${label} must be a safe relative POSIX path`);
  }
  const segments = value.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    throw new Error(`${label} must not contain empty, dot, or parent segments`);
  }
  if (value.includes('%') || value.includes('?') || value.includes('#') || value.includes('://')) {
    throw new Error(`${label} must not contain encoded, query, fragment, or URL syntax`);
  }
}

function resolveSourcePath(sourceRoot, relativePath, label) {
  assertSafeRelativePath(relativePath, label);
  const resolved = path.resolve(sourceRoot, relativePath);
  assertWithin(resolved, sourceRoot, label);
  return resolved;
}

function assertWithin(candidate, root, label) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) return;
  throw new Error(`${label} escapes its allowed root`);
}

function assertOutside(candidate, root, label) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    throw new Error(`${label} cannot be inside the repository`);
  }
}

function assertRecord(value, label) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function safeId(value) {
  return typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

async function main() {
  try {
    const options = parseCliArgs(process.argv.slice(2));
    const context = await loadVectorContext(options.manifest);
    const result = await renderVectorCommand(context, options);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (invokedPath === import.meta.url) await main();
