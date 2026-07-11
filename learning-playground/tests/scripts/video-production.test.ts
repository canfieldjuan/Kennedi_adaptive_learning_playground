// @ts-expect-error Vitest runs in Node; the app intentionally does not ship Node typings.
import { createHash } from 'node:crypto';
// @ts-expect-error Vitest runs in Node; the app intentionally does not ship Node typings.
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
// @ts-expect-error Vitest runs in Node; the app intentionally does not ship Node typings.
import { tmpdir } from 'node:os';
// @ts-expect-error Vitest runs in Node; the app intentionally does not ship Node typings.
import path from 'node:path';
// @ts-expect-error Vitest runs in Node; the app intentionally does not ship Node typings.
import process from 'node:process';
import { describe, expect, test, vi } from 'vitest';
// @ts-expect-error The repository-owned Node CLI is intentionally plain JavaScript.
import * as videoProduction from '../../scripts/video-production/video-production.mjs';

const {
  applyShotToWorkflow,
  assembleCommand,
  extractSavedOutput,
  parseCliArgs,
  validateLoopbackUrl,
  validateManifest,
  validateObjectInfo,
  validateSystemStats,
  validateWorkflow,
  verifyFilesAgainstHashes,
  waitForHistory,
} = videoProduction;

const HASH = (value: string) => createHash('sha256').update(value).digest('hex');

describe('ComfyUI video-production proof boundary', () => {
  test('parses the bounded render CLI', () => {
    expect(parseCliArgs([
      'render', '--manifest', 'proof.json', '--shot', 'mix-dough', '--seed', '11235813', '--dry-run',
    ])).toEqual({
      command: 'render',
      manifest: 'proof.json',
      shot: 'mix-dough',
      seed: 11235813,
      dryRun: true,
    });
    expect(() => parseCliArgs(['render', '--manifest', 'proof.json', '--seed', '-1'])).toThrow();
    expect(() => parseCliArgs(['publish', '--manifest', 'proof.json'])).toThrow();
  });

  test('accepts only a plain loopback HTTP endpoint', () => {
    expect(validateLoopbackUrl('http://127.0.0.1:8188').hostname).toBe('127.0.0.1');
    expect(validateLoopbackUrl('http://localhost:8188').hostname).toBe('localhost');
    expect(() => validateLoopbackUrl('https://127.0.0.1:8188')).toThrow(/HTTP/);
    expect(() => validateLoopbackUrl('http://0.0.0.0:8188')).toThrow(/loopback/);
    expect(() => validateLoopbackUrl('http://example.com')).toThrow(/loopback/);
    expect(() => validateLoopbackUrl('http://127.0.0.1:8188/prompt')).toThrow(/paths/);
  });

  test('pins the approved model, prompt, geometry, seed, and no-production-write contract', () => {
    expect(validateManifest(makeManifest())).toBeDefined();
    expect(() => validateManifest(makeManifest({ production_writes_allowed: true }))).toThrow();
    expect(() => validateManifest(makeManifest({
      comfyui: { ...makeManifest().comfyui, url: 'http://example.com' },
    }))).toThrow(/loopback/);
    expect(() => validateManifest(makeManifest({
      models: makeManifest().models.map((model: Record<string, unknown>, index: number) => (
        index === 0 ? { ...model, sha256: '0'.repeat(64) } : model
      )),
    }))).toThrow(/diffusion/);
    expect(() => validateManifest(makeManifest({
      shots: [{ ...makeManifest().shots[0], width: 0 }],
    }))).toThrow(/geometry/);
    expect(() => validateManifest(makeManifest({
      shots: [{ ...makeManifest().shots[0], seeds: [1, 2, 3, 4, 5] }],
    }))).toThrow(/one to four/);
    expect(() => validateManifest(makeManifest({
      shots: [{ ...makeManifest().shots[0], positive_prompt: 'in the style of Disney' }],
    }))).toThrow(/protected/);
    expect(() => validateManifest(makeManifest({ output_subdirectory: '../public' }))).toThrow();
  });

  test('validates the committed one-beat manifest and API workflow', async () => {
    const sourceRoot = path.join(process.cwd(), 'design-source/video/bear-bakes-bread');
    const manifest = validateManifest(JSON.parse(
      await readFile(path.join(sourceRoot, 'render-manifest.json'), 'utf8')
    ));
    const workflow = JSON.parse(await readFile(path.join(sourceRoot, manifest.workflow_api), 'utf8'));

    expect(validateWorkflow(workflow, manifest.bindings)).toBe(workflow);
    expect(manifest.shots[0].seeds).toEqual([11235813, 27182818, 31415926, 16180339]);
    expect(manifest.assembly).toMatchObject({
      enabled: true,
      selected_seed: 31415926,
      output: 'review/bear-mixes-dough-proof.webm',
      audio: 'none',
    });
  });

  test('requires ComfyUI 0.25.0 on the RTX 3090 with custom nodes disabled', () => {
    expect(validateSystemStats(makeStats())).toBeDefined();
    expect(() => validateSystemStats(makeStats({ comfyui_version: '0.24.0' }))).toThrow(/0.25.0/);
    expect(() => validateSystemStats(makeStats({}, [{ name: 'NVIDIA RTX 4060 Ti' }]))).toThrow(/3090/);
    expect(() => validateSystemStats(makeStats({ argv: ['main.py'] }))).toThrow(/custom/);
    expect(() => validateSystemStats(makeStats({
      argv: ['main.py', '--disable-all-custom-nodes', '--listen', '0.0.0.0'],
    }))).toThrow(/127.0.0.1/);
    expect(() => validateSystemStats(makeStats(), '/tmp/lab')).toThrow(/input-directory/);
  });

  test('checks every workflow binding before applying the shot', () => {
    const manifest = makeManifest();
    const workflow = makeWorkflow(manifest.bindings);
    expect(validateWorkflow(workflow, manifest.bindings)).toBe(workflow);
    const changed = applyShotToWorkflow(
      workflow,
      manifest,
      manifest.shots[0],
      11235813,
      'mix.png'
    );
    expect(changed['56'].inputs.image).toBe('mix.png');
    expect(changed['3'].inputs.seed).toBe(11235813);
    expect(changed['58'].inputs.filename_prefix).toContain('seed-11235813');
    expect(changed['58'].inputs).toMatchObject({ format: 'mp4', codec: 'h264' });
    const broken = structuredClone(workflow);
    broken['55'].class_type = 'EmptyLatentImage';
    expect(() => validateWorkflow(broken, manifest.bindings)).toThrow(/video_latent/);
    const wrongModel = structuredClone(workflow);
    wrongModel['37'].inputs.unet_name = 'unverified-model.safetensors';
    expect(() => validateWorkflow(wrongModel, manifest.bindings, manifest.models)).toThrow(/hashed/);
    const rewired = structuredClone(workflow);
    rewired['3'].inputs.model = ['37', 0];
    expect(() => validateWorkflow(rewired, manifest.bindings, manifest.models)).toThrow(/sampler model/);
    const objectInfo = Object.fromEntries(Object.values(workflow).map((node: any) => [
      node.class_type,
      {},
    ]));
    expect(validateObjectInfo(objectInfo, workflow)).toBe(objectInfo);
    delete objectInfo.SaveVideo;
    expect(() => validateObjectInfo(objectInfo, workflow)).toThrow(/SaveVideo/);
  });

  test('verifies content hashes and rejects a mismatch', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'kennedi-model-test-'));
    await mkdir(path.join(root, 'models'), { recursive: true });
    await writeFile(path.join(root, 'models', 'one.bin'), 'one');
    const files = [{ role: 'test', relative_path: 'models/one.bin', sha256: HASH('one') }];
    await expect(verifyFilesAgainstHashes(root, files)).resolves.toBeUndefined();
    await expect(verifyFilesAgainstHashes(root, [{ ...files[0], sha256: HASH('two') }]))
      .rejects.toThrow(/mismatch/);
    await expect(verifyFilesAgainstHashes(root, [{ ...files[0], relative_path: '../one.bin' }]))
      .rejects.toThrow();
  });

  test('polls a completed job and fails closed on error or timeout', async () => {
    const successFetch = vi.fn()
      .mockResolvedValueOnce(response({}))
      .mockResolvedValueOnce(response({ job: { status: { completed: false }, outputs: {} } }))
      .mockResolvedValueOnce(response({ job: { status: { completed: true }, outputs: {} } }));
    await expect(waitForHistory({
      baseUrl: 'http://127.0.0.1:8188/',
      promptId: 'job',
      timeoutMs: 10,
      pollMs: 0,
      fetchImpl: successFetch,
      now: sequence([0, 1, 2, 3]),
      sleep: async () => {},
    })).resolves.toMatchObject({ status: { completed: true } });

    const failureFetch = vi.fn().mockResolvedValue(response({
      job: { status: { status_str: 'error', completed: false } },
    }));
    await expect(waitForHistory({
      baseUrl: 'http://127.0.0.1:8188/', promptId: 'job', fetchImpl: failureFetch,
    })).rejects.toThrow(/failed/);

    const waitingFetch = vi.fn().mockResolvedValue(response({}));
    await expect(waitForHistory({
      baseUrl: 'http://127.0.0.1:8188/',
      promptId: 'job',
      timeoutMs: 1,
      pollMs: 0,
      fetchImpl: waitingFetch,
      now: sequence([0, 0, 2]),
      sleep: async () => {},
    })).rejects.toThrow(/timed out/);
  });

  test('requires exactly one safe output file', () => {
    expect(extractSavedOutput({
      outputs: { '58': { videos: [{ filename: 'mix.mp4', subfolder: 'video', type: 'output' }] } },
    }, '58')).toEqual({ filename: 'mix.mp4', subfolder: 'video' });
    expect(() => extractSavedOutput({ outputs: { '58': { videos: [] } } }, '58')).toThrow();
    expect(() => extractSavedOutput({
      outputs: { '58': { videos: [{ filename: 'mix.webm', subfolder: 'video', type: 'output' }] } },
    }, '58')).toThrow(/MP4/);
    expect(() => extractSavedOutput({
      outputs: { '58': { videos: [{ filename: 'mix.webm', subfolder: '../escape', type: 'output' }] } },
    }, '58')).toThrow(/unsafe/);
  });

  test('assemble remains disabled until an owner-selected seed is recorded', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'kennedi-assembly-test-'));
    const context = {
      manifest: makeManifest(),
      labRoot: path.join(root, 'lab'),
      projectRoot: path.join(root, 'repo'),
    };
    await expect(assembleCommand(context, { dryRun: true })).rejects.toThrow(/disabled/);
  });

  test('assembles only the selected external candidate without audio or inherited metadata', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'kennedi-assembly-selected-test-'));
    const labRoot = path.join(root, 'lab');
    const manifest = makeManifest({
      assembly: {
        enabled: true,
        selected_seed: 31415926,
        output: 'review/bear-mixes-dough-proof.webm',
        audio: 'none',
      },
    });
    const candidateRoot = path.join(labRoot, manifest.output_subdirectory);
    await mkdir(candidateRoot, { recursive: true });
    await writeFile(path.join(candidateRoot, 'mix-dough-seed-31415926.mp4'), 'candidate');

    const result = await assembleCommand({
      manifest,
      labRoot,
      projectRoot: path.join(root, 'repo'),
    }, { dryRun: true });

    expect(result.args).toContain('-an');
    expect(result.args).toContain('-map_metadata');
    expect(result.args.at(-1)).toBe(path.join(labRoot, 'review/bear-mixes-dough-proof.webm'));
  });
});

function makeManifest(overrides: Record<string, unknown> = {}) {
  const manifest = {
    schema_version: 1,
    id: 'bear-bakes-bread-mix-proof',
    proof_only: true,
    production_writes_allowed: false,
    comfyui: {
      version: '0.25.0',
      url: 'http://127.0.0.1:8188',
      device_name: 'NVIDIA GeForce RTX 3090',
      custom_nodes_allowed: false,
    },
    models: [
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
    ],
    workflow_api: 'workflow-api.json',
    workflow_ui: 'workflow.json',
    output_subdirectory: 'candidates/bear-bakes-bread-mix-proof',
    bindings: {
      diffusion_model: { node_id: '37', class_type: 'UNETLoader' },
      text_encoder: { node_id: '38', class_type: 'CLIPLoader' },
      vae: { node_id: '39', class_type: 'VAELoader' },
      positive_prompt: { node_id: '6', class_type: 'CLIPTextEncode' },
      negative_prompt: { node_id: '7', class_type: 'CLIPTextEncode' },
      source_image: { node_id: '56', class_type: 'LoadImage' },
      video_latent: { node_id: '55', class_type: 'Wan22ImageToVideoLatent' },
      sampling_shift: { node_id: '48', class_type: 'ModelSamplingSD3' },
      sampler: { node_id: '3', class_type: 'KSampler' },
      decode: { node_id: '8', class_type: 'VAEDecode' },
      create_video: { node_id: '57', class_type: 'CreateVideo' },
      save_video: { node_id: '58', class_type: 'SaveVideo' },
    },
    shots: [{
      id: 'mix-dough',
      input_image: 'inputs/mix-dough-1280x704.png',
      width: 1280,
      height: 704,
      frames: 77,
      fps: 24,
      seeds: [11235813, 27182818, 31415926, 16180339],
      positive_prompt: 'Original flat vector children\'s story illustration. Bear slowly stirs dough.',
      negative_prompt: 'photorealistic, 3d render, text, logo, flashing',
      sampling: {
        steps: 20, cfg: 5, sampler_name: 'uni_pc', scheduler: 'simple', denoise: 1, shift: 8,
      },
    }],
    assembly: { enabled: false },
  };
  return { ...manifest, ...overrides } as any;
}

function makeWorkflow(bindings: Record<string, { node_id: string; class_type: string }>) {
  const workflow = Object.fromEntries(Object.values(bindings).map(({ node_id, class_type }) => [
    node_id,
    { class_type, inputs: {} },
  ])) as Record<string, any>;
  const inputs = (name: string) => workflow[bindings[name].node_id].inputs;
  inputs('diffusion_model').unet_name = 'wan2.2_ti2v_5B_fp16.safetensors';
  inputs('text_encoder').clip_name = 'umt5_xxl_fp8_e4m3fn_scaled.safetensors';
  inputs('vae').vae_name = 'wan2.2_vae.safetensors';
  inputs('positive_prompt').clip = [bindings.text_encoder.node_id, 0];
  inputs('negative_prompt').clip = [bindings.text_encoder.node_id, 0];
  inputs('video_latent').vae = [bindings.vae.node_id, 0];
  inputs('video_latent').start_image = [bindings.source_image.node_id, 0];
  inputs('sampling_shift').model = [bindings.diffusion_model.node_id, 0];
  inputs('sampler').model = [bindings.sampling_shift.node_id, 0];
  inputs('sampler').positive = [bindings.positive_prompt.node_id, 0];
  inputs('sampler').negative = [bindings.negative_prompt.node_id, 0];
  inputs('sampler').latent_image = [bindings.video_latent.node_id, 0];
  inputs('decode').samples = [bindings.sampler.node_id, 0];
  inputs('decode').vae = [bindings.vae.node_id, 0];
  inputs('create_video').images = [bindings.decode.node_id, 0];
  inputs('save_video').video = [bindings.create_video.node_id, 0];
  return workflow;
}

function makeStats(
  systemOverrides: Record<string, unknown> = {},
  devices: Array<Record<string, unknown>> = [{ name: 'NVIDIA GeForce RTX 3090' }]
) {
  return {
    system: {
      comfyui_version: '0.25.0',
      argv: ['main.py', '--disable-all-custom-nodes', '--listen', '127.0.0.1'],
      ...systemOverrides,
    },
    devices,
  };
}

function response(value: unknown) {
  return { ok: true, json: async () => value } as Response;
}

function sequence(values: number[]) {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}
