#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import {
  access,
  copyFile,
  mkdir,
  readFile,
  writeFile,
} from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PROOF_LIMITS = Object.freeze({
  width: 1280,
  height: 704,
  frames: 77,
  fps: 24,
  maxSeeds: 4,
  maxShots: 1,
  timeoutMs: 45 * 60 * 1000,
  comfyuiVersion: '0.25.0',
  deviceName: 'NVIDIA GeForce RTX 3090',
});

export const EXPECTED_MODELS = Object.freeze([
  {
    role: 'diffusion',
    relative_path: 'models/diffusion_models/wan2.2_ti2v_5B_fp16.safetensors',
    sha256: '456f901338bd9eadbded3828b819109a9b68e8a525ca5cf8d0049a69fcfeca1e',
  },
  {
    role: 'vae',
    relative_path: 'models/vae/wan2.2_vae.safetensors',
    sha256: 'e40321bd36b9709991dae2530eb4ac303dd168276980d3e9bc4b6e2b75fed156',
  },
  {
    role: 'text_encoder',
    relative_path: 'models/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors',
    sha256: 'c3355d30191f1f066b26d93fba017ae9809dce6c627dda5f6a66eaa651204f68',
  },
]);

const ALLOWED_COMMANDS = new Set(['render', 'assemble']);
const REQUIRED_BINDINGS = Object.freeze({
  diffusion_model: 'UNETLoader',
  text_encoder: 'CLIPLoader',
  vae: 'VAELoader',
  positive_prompt: 'CLIPTextEncode',
  negative_prompt: 'CLIPTextEncode',
  source_image: 'LoadImage',
  video_latent: 'Wan22ImageToVideoLatent',
  sampling_shift: 'ModelSamplingSD3',
  sampler: 'KSampler',
  decode: 'VAEDecode',
  create_video: 'CreateVideo',
  save_video: 'SaveVideo',
});

export function parseCliArgs(argv) {
  const [command, ...rest] = argv;
  if (!ALLOWED_COMMANDS.has(command)) {
    throw new Error('command must be render or assemble');
  }

  const options = {
    command,
    dryRun: false,
    seed: undefined,
    shot: undefined,
    manifest: undefined,
  };

  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index];
    if (value === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (value === '--manifest' || value === '--shot' || value === '--seed') {
      const next = rest[index + 1];
      if (!next || next.startsWith('--')) {
        throw new Error(`${value} requires a value`);
      }
      index += 1;
      if (value === '--manifest') options.manifest = next;
      if (value === '--shot') options.shot = next;
      if (value === '--seed') {
        options.seed = next === 'all' ? 'all' : parseSafeInteger(next, '--seed');
      }
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

  assertRecord(value.comfyui, 'comfyui');
  if (value.comfyui.version !== PROOF_LIMITS.comfyuiVersion) {
    throw new Error(`ComfyUI version must be ${PROOF_LIMITS.comfyuiVersion}`);
  }
  if (value.comfyui.device_name !== PROOF_LIMITS.deviceName) {
    throw new Error(`device_name must be ${PROOF_LIMITS.deviceName}`);
  }
  if (value.comfyui.custom_nodes_allowed !== false) {
    throw new Error('custom_nodes_allowed must remain false');
  }
  validateLoopbackUrl(value.comfyui.url);

  if (!Array.isArray(value.models) || value.models.length !== EXPECTED_MODELS.length) {
    throw new Error('manifest must declare the exact three-model set');
  }
  for (const expected of EXPECTED_MODELS) {
    const actual = value.models.find((model) => model?.role === expected.role);
    if (
      !actual
      || actual.relative_path !== expected.relative_path
      || actual.sha256 !== expected.sha256
    ) {
      throw new Error(`model declaration mismatch for ${expected.role}`);
    }
  }

  assertSafeRelativePath(value.workflow_api, 'workflow_api');
  assertSafeRelativePath(value.workflow_ui, 'workflow_ui');
  assertSafeRelativePath(value.output_subdirectory, 'output_subdirectory');
  if (!value.output_subdirectory.startsWith('candidates/')) {
    throw new Error('output_subdirectory must stay under candidates/');
  }

  assertRecord(value.bindings, 'bindings');
  const boundNodeIds = new Set();
  for (const [name, classType] of Object.entries(REQUIRED_BINDINGS)) {
    const binding = value.bindings[name];
    assertRecord(binding, `binding ${name}`);
    if (!/^\d+$/.test(binding.node_id) || binding.class_type !== classType) {
      throw new Error(`binding ${name} must target ${classType}`);
    }
    if (boundNodeIds.has(binding.node_id)) throw new Error('workflow binding node ids must be unique');
    boundNodeIds.add(binding.node_id);
  }

  if (!Array.isArray(value.shots) || value.shots.length !== PROOF_LIMITS.maxShots) {
    throw new Error('proof manifest must contain exactly one shot');
  }
  const shot = value.shots[0];
  assertRecord(shot, 'shot');
  if (!safeId(shot.id)) throw new Error('shot id must be lowercase kebab-case');
  assertSafeRelativePath(shot.input_image, 'shot input_image');
  if (!shot.input_image.startsWith('inputs/')) {
    throw new Error('shot input_image must stay under inputs/');
  }
  if (
    shot.width !== PROOF_LIMITS.width
    || shot.height !== PROOF_LIMITS.height
    || shot.frames !== PROOF_LIMITS.frames
    || shot.fps !== PROOF_LIMITS.fps
  ) {
    throw new Error('shot geometry must remain 1280x704, 77 frames, and 24 FPS');
  }
  if (!nonEmptyString(shot.positive_prompt) || !nonEmptyString(shot.negative_prompt)) {
    throw new Error('shot prompts must be non-empty strings');
  }
  assertPromptPolicy(shot.positive_prompt);
  assertPromptPolicy(shot.negative_prompt);
  if (!Array.isArray(shot.seeds) || shot.seeds.length < 1 || shot.seeds.length > 4) {
    throw new Error('shot must declare one to four seeds');
  }
  const uniqueSeeds = new Set();
  for (const seed of shot.seeds) {
    if (!Number.isSafeInteger(seed) || seed < 0) throw new Error('seeds must be non-negative safe integers');
    uniqueSeeds.add(seed);
  }
  if (uniqueSeeds.size !== shot.seeds.length) throw new Error('seeds must be unique');

  assertRecord(shot.sampling, 'shot sampling');
  if (
    shot.sampling.steps !== 20
    || shot.sampling.cfg !== 5
    || shot.sampling.sampler_name !== 'uni_pc'
    || shot.sampling.scheduler !== 'simple'
    || shot.sampling.denoise !== 1
    || shot.sampling.shift !== 8
  ) {
    throw new Error('sampling settings do not match the approved proof baseline');
  }

  assertRecord(value.assembly, 'assembly');
  if (value.assembly.enabled !== false && value.assembly.enabled !== true) {
    throw new Error('assembly.enabled must be boolean');
  }
  if (value.assembly.enabled === true) {
    if (!shot.seeds.includes(value.assembly.selected_seed)) {
      throw new Error('assembly.selected_seed must be one of the approved candidates');
    }
    assertSafeRelativePath(value.assembly.output, 'assembly output');
    if (!value.assembly.output.startsWith('review/')) {
      throw new Error('assembly output must stay under review/');
    }
    if (value.assembly.audio !== 'none') throw new Error('proof assembly cannot include audio');
  }

  return value;
}

export function validateLoopbackUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('ComfyUI URL must be a valid URL');
  }
  const allowedHosts = new Set(['127.0.0.1', 'localhost', '[::1]']);
  if (parsed.protocol !== 'http:' || !allowedHosts.has(parsed.hostname)) {
    throw new Error('ComfyUI URL must use HTTP on a loopback host');
  }
  if (parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('ComfyUI URL cannot contain credentials, paths, query, or fragment');
  }
  return parsed;
}

export function validateSystemStats(stats, labRoot) {
  assertRecord(stats, 'system stats');
  assertRecord(stats.system, 'system stats.system');
  if (stats.system.comfyui_version !== PROOF_LIMITS.comfyuiVersion) {
    throw new Error(`running ComfyUI must be ${PROOF_LIMITS.comfyuiVersion}`);
  }
  if (!Array.isArray(stats.devices) || stats.devices.length < 1) {
    throw new Error('ComfyUI did not report a primary device');
  }
  if (!String(stats.devices[0]?.name ?? '').includes('RTX 3090')) {
    throw new Error('ComfyUI primary device must be the RTX 3090');
  }
  const argv = Array.isArray(stats.system.argv) ? stats.system.argv.map(String) : [];
  if (!argv.includes('--disable-all-custom-nodes')) {
    throw new Error('ComfyUI must start with --disable-all-custom-nodes');
  }
  const listenIndex = argv.indexOf('--listen');
  if (listenIndex >= 0 && argv[listenIndex + 1] !== '127.0.0.1') {
    throw new Error('ComfyUI --listen must be 127.0.0.1');
  }
  if (labRoot !== undefined) {
    const expectedDirectories = {
      '--input-directory': path.join(labRoot, 'input'),
      '--output-directory': path.join(labRoot, 'output'),
      '--temp-directory': path.join(labRoot, 'temp'),
      '--user-directory': path.join(labRoot, 'user'),
    };
    for (const [flag, expected] of Object.entries(expectedDirectories)) {
      const index = argv.indexOf(flag);
      if (index < 0 || path.resolve(argv[index + 1] ?? '') !== path.resolve(expected)) {
        throw new Error(`ComfyUI ${flag} must target the isolated video lab`);
      }
    }
  }
  return stats;
}

export function validateObjectInfo(objectInfo, workflow) {
  assertRecord(objectInfo, 'ComfyUI object info');
  const classTypes = new Set(Object.values(workflow).map((node) => node.class_type));
  for (const classType of classTypes) {
    if (!objectInfo[classType]) throw new Error(`running ComfyUI is missing core node ${classType}`);
  }
  return objectInfo;
}

export function validateWorkflow(workflow, bindings, models = EXPECTED_MODELS) {
  assertRecord(workflow, 'workflow');
  for (const [name, expectedClass] of Object.entries(REQUIRED_BINDINGS)) {
    const binding = bindings[name];
    const node = workflow[binding.node_id];
    assertRecord(node, `workflow node ${binding.node_id}`);
    if (node.class_type !== expectedClass || binding.class_type !== expectedClass) {
      throw new Error(`workflow binding ${name} must resolve to ${expectedClass}`);
    }
    assertRecord(node.inputs, `workflow node ${binding.node_id}.inputs`);
  }

  const node = (bindingName) => workflow[bindings[bindingName].node_id].inputs;
  const modelName = (role) => path.basename(models.find((model) => model.role === role)?.relative_path ?? '');
  if (node('diffusion_model').unet_name !== modelName('diffusion')) {
    throw new Error('workflow diffusion loader must name the hashed diffusion model');
  }
  if (node('text_encoder').clip_name !== modelName('text_encoder')) {
    throw new Error('workflow text encoder loader must name the hashed text encoder');
  }
  if (node('vae').vae_name !== modelName('vae')) {
    throw new Error('workflow VAE loader must name the hashed VAE');
  }

  assertLink(node('positive_prompt').clip, bindings.text_encoder.node_id, 'positive prompt CLIP');
  assertLink(node('negative_prompt').clip, bindings.text_encoder.node_id, 'negative prompt CLIP');
  assertLink(node('video_latent').vae, bindings.vae.node_id, 'video latent VAE');
  assertLink(node('video_latent').start_image, bindings.source_image.node_id, 'video latent source image');
  assertLink(node('sampling_shift').model, bindings.diffusion_model.node_id, 'sampling model');
  assertLink(node('sampler').model, bindings.sampling_shift.node_id, 'sampler model');
  assertLink(node('sampler').positive, bindings.positive_prompt.node_id, 'sampler positive prompt');
  assertLink(node('sampler').negative, bindings.negative_prompt.node_id, 'sampler negative prompt');
  assertLink(node('sampler').latent_image, bindings.video_latent.node_id, 'sampler video latent');
  assertLink(node('decode').samples, bindings.sampler.node_id, 'decoder samples');
  assertLink(node('decode').vae, bindings.vae.node_id, 'decoder VAE');
  assertLink(node('create_video').images, bindings.decode.node_id, 'video frames');
  assertLink(node('save_video').video, bindings.create_video.node_id, 'saved video');
  return workflow;
}

export function applyShotToWorkflow(workflow, manifest, shot, seed, inputName) {
  const next = structuredClone(workflow);
  validateWorkflow(next, manifest.bindings, manifest.models);
  const node = (bindingName) => next[manifest.bindings[bindingName].node_id].inputs;

  node('source_image').image = inputName;
  node('positive_prompt').text = shot.positive_prompt;
  node('negative_prompt').text = shot.negative_prompt;
  node('video_latent').width = shot.width;
  node('video_latent').height = shot.height;
  node('video_latent').length = shot.frames;
  node('video_latent').batch_size = 1;
  node('sampling_shift').shift = shot.sampling.shift;
  node('sampler').seed = seed;
  node('sampler').steps = shot.sampling.steps;
  node('sampler').cfg = shot.sampling.cfg;
  node('sampler').sampler_name = shot.sampling.sampler_name;
  node('sampler').scheduler = shot.sampling.scheduler;
  node('sampler').denoise = shot.sampling.denoise;
  node('create_video').fps = shot.fps;
  node('save_video').filename_prefix = `${manifest.id}/${shot.id}-seed-${seed}`;
  node('save_video').format = 'mp4';
  node('save_video').codec = 'h264';

  return next;
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

export async function verifyFilesAgainstHashes(baseDirectory, files, hashFile = sha256File) {
  for (const file of files) {
    assertSafeRelativePath(file.relative_path, `${file.role} model path`);
    const absolutePath = path.resolve(baseDirectory, file.relative_path);
    assertWithin(absolutePath, baseDirectory, `${file.role} model path`);
    await access(absolutePath);
    const actual = await hashFile(absolutePath);
    if (actual !== file.sha256) throw new Error(`${file.role} model SHA-256 mismatch`);
  }
}

export async function fetchJson(url, init = {}, fetchImpl = fetch, timeoutMs = 15_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { ...init, signal: init.signal ?? controller.signal });
    if (!response.ok) throw new Error(`ComfyUI request failed with HTTP ${response.status}`);
    return response.json();
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`ComfyUI request timed out after ${timeoutMs}ms`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function waitForHistory({
  baseUrl,
  promptId,
  timeoutMs = PROOF_LIMITS.timeoutMs,
  pollMs = 2000,
  fetchImpl = fetch,
  now = () => Date.now(),
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  const startedAt = now();
  while (now() - startedAt <= timeoutMs) {
    const history = await fetchJson(`${baseUrl}history/${encodeURIComponent(promptId)}`, {}, fetchImpl);
    if (history[promptId]) {
      const entry = history[promptId];
      const status = entry.status;
      if (status?.status_str === 'error') {
        throw new Error(`ComfyUI job ${promptId} failed`);
      }
      if (status?.completed === true || status === undefined) return entry;
    }
    await sleep(pollMs);
  }
  throw new Error(`ComfyUI job ${promptId} timed out`);
}

export function extractSavedOutput(historyEntry, saveNodeId) {
  const output = historyEntry?.outputs?.[saveNodeId];
  const candidates = output?.videos ?? output?.images ?? output?.gifs;
  if (!Array.isArray(candidates) || candidates.length !== 1) {
    throw new Error('ComfyUI SaveVideo must return exactly one output');
  }
  const file = candidates[0];
  if (!nonEmptyString(file.filename) || file.type !== 'output') {
    throw new Error('ComfyUI returned an invalid output file');
  }
  const subfolder = file.subfolder ?? '';
  if (
    path.basename(file.filename) !== file.filename
    || (subfolder !== '' && (path.isAbsolute(subfolder) || subfolder.split(/[\\/]/).includes('..')))
  ) {
    throw new Error('ComfyUI returned an unsafe output subfolder');
  }
  if (!/\.mp4$/i.test(file.filename)) throw new Error('ComfyUI candidate output must be MP4');
  return { filename: file.filename, subfolder };
}

export async function loadManifestContext(manifestArgument, environment = process.env) {
  const manifestPath = path.resolve(manifestArgument);
  const manifest = validateManifest(JSON.parse(await readFile(manifestPath, 'utf8')));
  const sourceRoot = path.dirname(manifestPath);
  const projectRoot = await findProjectRoot(sourceRoot);
  const comfyuiHome = path.resolve(environment.COMFYUI_HOME ?? path.join(homedir(), 'Desktop', 'ComfyUI-master'));
  const labRoot = path.resolve(environment.KENNEDI_VIDEO_LAB ?? path.join(homedir(), '.local', 'share', 'kennedi-video-lab'));
  const comfyUrl = environment.COMFYUI_URL ?? manifest.comfyui.url;
  validateLoopbackUrl(comfyUrl);
  assertOutside(labRoot, projectRoot, 'video lab root');

  const workflowApiPath = resolveSourcePath(sourceRoot, manifest.workflow_api, 'workflow_api');
  const workflowUiPath = resolveSourcePath(sourceRoot, manifest.workflow_ui, 'workflow_ui');
  const inputPath = resolveSourcePath(sourceRoot, manifest.shots[0].input_image, 'input image');
  await Promise.all([access(workflowApiPath), access(workflowUiPath), access(inputPath)]);
  const workflow = JSON.parse(await readFile(workflowApiPath, 'utf8'));
  validateWorkflow(workflow, manifest.bindings, manifest.models);

  return {
    manifest,
    manifestPath,
    sourceRoot,
    projectRoot,
    comfyuiHome,
    labRoot,
    comfyUrl: comfyUrl.endsWith('/') ? comfyUrl : `${comfyUrl}/`,
    workflow,
    inputPath,
  };
}

export async function renderCommand(context, options, dependencies = {}) {
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const hashFile = dependencies.hashFile ?? sha256File;
  await verifyFilesAgainstHashes(context.comfyuiHome, context.manifest.models, hashFile);

  const shot = selectShot(context.manifest, options.shot);
  const seeds = selectSeeds(shot, options.seed);
  const inputName = `${context.manifest.id}-${path.basename(shot.input_image)}`;
  const plan = seeds.map((seed) => ({ shot: shot.id, seed, input: inputName }));
  if (options.dryRun) return { dry_run: true, plan };

  const stats = await fetchJson(`${context.comfyUrl}system_stats`, {}, fetchImpl);
  validateSystemStats(stats, context.labRoot);
  const objectInfo = await fetchJson(`${context.comfyUrl}object_info`, {}, fetchImpl);
  validateObjectInfo(objectInfo, context.workflow);

  const labInput = path.join(context.labRoot, 'input');
  const comfyOutput = path.join(context.labRoot, 'output');
  const candidateRoot = path.join(context.labRoot, context.manifest.output_subdirectory);
  for (const directory of [labInput, comfyOutput, candidateRoot]) {
    assertOutside(directory, context.projectRoot, 'authoring output directory');
    await mkdir(directory, { recursive: true });
  }
  await copyFile(context.inputPath, path.join(labInput, inputName));

  const results = [];
  for (const seed of seeds) {
    const prompt = applyShotToWorkflow(
      context.workflow,
      context.manifest,
      shot,
      seed,
      inputName
    );
    const request = await fetchJson(`${context.comfyUrl}prompt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt, client_id: `kennedi-video-${randomUUID()}` }),
    }, fetchImpl);
    if (!nonEmptyString(request.prompt_id)) throw new Error('ComfyUI did not return prompt_id');

    const history = await waitForHistory({
      baseUrl: context.comfyUrl,
      promptId: request.prompt_id,
      fetchImpl,
      ...(dependencies.waitOptions ?? {}),
    });
    const saved = extractSavedOutput(
      history,
      context.manifest.bindings.save_video.node_id
    );
    const generatedPath = path.resolve(comfyOutput, saved.subfolder, saved.filename);
    assertWithin(generatedPath, comfyOutput, 'ComfyUI generated output');
    const candidatePath = path.join(candidateRoot, `${shot.id}-seed-${seed}.mp4`);
    assertWithin(candidatePath, candidateRoot, 'candidate output');
    await copyFile(generatedPath, candidatePath);
    results.push({ seed, prompt_id: request.prompt_id, candidate: candidatePath });
  }

  const recordPath = path.join(candidateRoot, 'render-run.json');
  await writeFile(recordPath, `${JSON.stringify({
    manifest_id: context.manifest.id,
    rendered_at: new Date().toISOString(),
    comfyui_version: stats.system.comfyui_version,
    device: stats.devices[0].name,
    results,
  }, null, 2)}\n`, 'utf8');
  return { dry_run: false, plan, results, record: recordPath };
}

export async function assembleCommand(context, options, dependencies = {}) {
  const assembly = context.manifest.assembly;
  if (assembly.enabled !== true) throw new Error('assembly is disabled pending owner candidate selection');
  const shot = context.manifest.shots[0];
  const candidateRoot = path.join(context.labRoot, context.manifest.output_subdirectory);
  const input = path.join(candidateRoot, `${shot.id}-seed-${assembly.selected_seed}.mp4`);
  const output = path.join(context.labRoot, assembly.output);
  assertOutside(output, context.projectRoot, 'review output');
  assertWithin(input, candidateRoot, 'assembly input');
  assertWithin(output, context.labRoot, 'assembly output');
  await access(input);
  await mkdir(path.dirname(output), { recursive: true });

  const args = [
    '-y', '-i', input, '-map_metadata', '-1', '-an', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '30',
    '-row-mt', '1', output,
  ];
  if (options.dryRun) return { dry_run: true, executable: 'ffmpeg', args };
  await runProcess('ffmpeg', args, dependencies.spawnImpl ?? spawn);
  return { dry_run: false, output };
}

async function main() {
  try {
    const options = parseCliArgs(process.argv.slice(2));
    const context = await loadManifestContext(options.manifest);
    const result = options.command === 'render'
      ? await renderCommand(context, options)
      : await assembleCommand(context, options);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

function selectShot(manifest, requestedId) {
  const shot = requestedId
    ? manifest.shots.find((candidate) => candidate.id === requestedId)
    : manifest.shots[0];
  if (!shot) throw new Error(`unknown shot: ${requestedId}`);
  return shot;
}

function selectSeeds(shot, requestedSeed) {
  if (requestedSeed === undefined || requestedSeed === 'all') return [...shot.seeds];
  if (!shot.seeds.includes(requestedSeed)) throw new Error('requested seed is not approved by the manifest');
  return [requestedSeed];
}

function assertPromptPolicy(prompt) {
  if (prompt.length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(prompt)) {
    throw new Error('prompt is too long or contains control characters');
  }
  const forbidden = /\b(?:disney|pixar|bluey|marvel|dc comics|dreamworks|style of|in the style)\b/i;
  if (forbidden.test(prompt)) throw new Error('prompt contains a protected style, studio, or franchise term');
}

function assertSafeRelativePath(value, label) {
  if (!nonEmptyString(value) || path.isAbsolute(value) || value.includes('\\')) {
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

async function findProjectRoot(start) {
  let current = path.resolve(start);
  while (true) {
    try {
      const packageValue = JSON.parse(await readFile(path.join(current, 'package.json'), 'utf8'));
      if (packageValue.name === 'learning-playground') return current;
    } catch {
      // Keep walking toward the filesystem root.
    }
    const parent = path.dirname(current);
    if (parent === current) throw new Error('could not locate learning-playground project root');
    current = parent;
  }
}

function runProcess(executable, args, spawnImpl) {
  return new Promise((resolve, reject) => {
    const child = spawnImpl(executable, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${executable} exited with code ${code}`));
    });
  });
}

function assertRecord(value, label) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function assertLink(value, expectedNodeId, label) {
  if (!Array.isArray(value) || value.length !== 2 || value[0] !== expectedNodeId || value[1] !== 0) {
    throw new Error(`workflow ${label} must link to node ${expectedNodeId} output 0`);
  }
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim() === value && value.length > 0;
}

function safeId(value) {
  return nonEmptyString(value) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function parseSafeInteger(value, label) {
  if (!/^\d+$/.test(value)) throw new Error(`${label} must be a non-negative integer or all`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error(`${label} is outside the safe integer range`);
  return parsed;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (invokedPath === import.meta.url) await main();
