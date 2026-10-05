import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { alphabet } from '../src/content/alphabet-practice.mjs';
import { numbers } from '../src/content/numbers-practice.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const imported = {
  "animals/locked-poses/sloth-01-hanging.png": {
    "sloth-01-hanging.png": "ac7becdafcaa4a46c45246a515a61e7b492425c639dfc3e506ddfa690ef7c46b",
    "sloth-01-hanging.svg": "668ced69ce6db40fbb998358b8f21b1fa4de0c89b97b1512025a747d1da7db0d"
  },
  "animals/locked-poses/alligator-01-walking.png": {
    "alligator-01-walking.png": "c3e51dfd0ae6b4e39ab7149804afe65a37732227b41c2ad08923f990e1a7f135",
    "alligator-01-walking.svg": "7f37b48638d443506b1651e0dd9264690d0b3afea8b0ded206214d2a92fc9e80"
  },
  "animals/locked-poses/hippo-01-standing.png": {
    "hippo-01-standing.png": "ef1906b683ea11d3c39599bc3882cc05533ba3b296d13327507ec93d5cee8e14",
    "hippo-01-standing.svg": "80c3f0f103f8e882a1171ca3ddea471e56b899be265d43ff12b80a318e5b90c4"
  },
  "animals/locked-poses/iguana-01-standing.png": {
    "iguana-01-standing.png": "a7878d8dffeb187409da1b5b90ffa1746b3a332d656cdf9f712a4fc0c067ff18",
    "iguana-01-standing.svg": "ac55f463966729b11ab12006a1747b460bc69e590585aeeda3400eb867299875"
  },
  "animals/locked-poses/kangaroo-01-standing.png": {
    "kangaroo-01-standing.png": "0a29f1a37d8a04ea9328d06af256b8e91350129a709335f8ba8647ed24abc64f",
    "kangaroo-01-standing.svg": "294d6e4479b3314b179911a26b4fd9835dd57a73f1e0405db63ee8f7275b2a3f"
  },
  "animals/locked-poses/monkey-01-sitting.png": {
    "monkey-01-sitting.png": "ed4362c41901bebf51d3c14f72cd3ccbe766781576af94dce6fa25eb2c42c786",
    "monkey-01-sitting.svg": "3a7b141e4ec7c6f170ac543fca7a3be24d54b0f24c10032410142d2705657549"
  },
  "animals/locked-poses/narwhal-01-swimming.png": {
    "narwhal-01-swimming.png": "608a7dd401d8fed500c2b3a97607f85949313414c2cb2954af23915d1309f058",
    "narwhal-01-swimming.svg": "1abd67408590652d48fc13459990cfb79d7737c8fc6517e4e3f54e2d3c18e68c"
  },
  "animals/locked-poses/raccoon-01-sitting.png": {
    "raccoon-01-sitting.png": "ff3cce34c316afd687bcbfa464b3cae8db2efd7996fa26bb24583ab9bdd4fd1d",
    "raccoon-01-sitting.svg": "b36b65d3dd6455264257dfa0e0c6349933df4253530b05a73fc703ed1c1d13ee"
  },
  "animals/locked-poses/shark-01-swimming.png": {
    "shark-01-swimming.png": "2c2b33a315d55ba899caa19bd9bd07afe78c8eaf98fc1259f2a9809c319b2e23",
    "shark-01-swimming.svg": "75bfb99b967cf21e4ac9c3dfcfe50a88ce92ed47fee9e8f08bb671d3eaeb7519"
  },
  "animals/locked-poses/unicorn-01-standing.png": {
    "unicorn-01-standing.png": "15b80cfef3eaffc2156290d53e2d9b5b6a76859f74a2e01bebae16a24ad57256",
    "unicorn-01-standing.svg": "b3423310defd702e3fcd79e663d526d410bb41d4b7a187b3683558ec1b82d0ea"
  },
  "animals/locked-poses/vulture-01-perched.png": {
    "vulture-01-perched.png": "e66eae90563c18b6da09da65baca461ce54e54cb04abe4d31273801cececff0d",
    "vulture-01-perched.svg": "a6047172c05cc3933d89c16d375b3101ae62f334fab5ed68b87741e65924a243"
  },
  "animals/locked-poses/xrayfish-01-swimming.png": {
    "xrayfish-01-swimming.png": "d0ed711e069a3c44fd94b6b3b90a9a2bf1019af971f93e300d36e99811da1c63",
    "xrayfish-01-swimming.svg": "c628374895c9c81bb8ba510375f9d8d2b441a24cf1d91a4ea604bf2eb0f2df00"
  },
  "animals/locked-poses/yak-01-standing.png": {
    "yak-01-standing.png": "4871bfbe7c253dca0ce588161ba32d36f2719ba00f4bf772ea071475de8e9264",
    "yak-01-standing.svg": "f8d0cea105a4645e5d191f58d053f54dd53eb131c6ecd56a767b492bc62026bd"
  }
};
const digest = p => createHash('sha256').update(readFileSync(p)).digest('hex');

test('every workbook catalog resolves a real tracked illustration', () => {
  for (const cue of [...alphabet, ...numbers]) {
    const p = path.join(root, cue.illustrationPath);
    assert.ok(lstatSync(p).isFile(), cue.illustrationPath);
    assert.ok(!lstatSync(p).isSymbolicLink(), cue.illustrationPath);
    assert.match(readFileSync(p, 'utf8'), /<svg\b/);
  }
});

test('imported dependencies preserve their original bytes and each has one legacy owner', () => {
  const legacy = JSON.parse(readFileSync(path.join(root, 'design-source/legacy-locked-assets.json')));
  assert.equal(Object.keys(imported).length, 13);
  for (const [key, files] of Object.entries(imported)) {
    assert.deepEqual(legacy[key], { files, rebuild: 'reproduce' });
    const svg = 'design-source/' + key.replace(/\.png$/, '.svg');
    assert.ok([...alphabet, ...numbers].some(cue => cue.illustrationPath === svg), 'only required workbook dependencies');
    for (const [name, hash] of Object.entries(files)) {
      const p = path.join(root, 'design-source', path.dirname(key), name);
      assert.equal(digest(p), hash, name);
      assert.ok(!lstatSync(p).isSymbolicLink(), name);
      assert.ok(!Object.keys(legacy).some(other => other !== key
        && path.dirname(other) === path.dirname(key) && Object.hasOwn(legacy[other].files, name)), name);
    }
  }
});

test('the existing art guard accepts each import and rejects changed or missing SVGs', () => {
  const probe = spawnSync('python3', ['-B', '-c', `
import importlib.util, json, pathlib, shutil, sys, tempfile
root=pathlib.Path.cwd()
spec=importlib.util.spec_from_file_location('recipe_guard', root/'tools/illustration-recipe.py')
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
entries=json.loads((root/'design-source/legacy-locked-assets.json').read_text())
keys=json.loads(sys.argv[1])
for key in keys:
    entry=entries[key]
    with tempfile.TemporaryDirectory(prefix='kennedi-import-proof-') as tmp:
        target=pathlib.Path(tmp)
        folder=target/'design-source'/pathlib.Path(key).parent
        folder.mkdir(parents=True)
        for name in entry['files']:
            shutil.copyfile(root/'design-source'/pathlib.Path(key).parent/name, folder/name)
        module.WORKBOOK=target
        assert module.legacy_problems(key, entry)==[], key
        svg=folder/pathlib.Path(key).with_suffix('.svg').name
        svg.write_bytes(svg.read_bytes()+b'\\n<!-- altered -->')
        assert any('sha256 differs' in p for p in module.legacy_problems(key, entry)), key
        svg.unlink()
        assert any('not on disk' in p for p in module.legacy_problems(key, entry)), key
print('PASS: all imported pairs accepted; changed and missing SVGs rejected')
`, JSON.stringify(Object.keys(imported))], { cwd: root, encoding: 'utf8' });
  assert.equal(probe.status, 0, probe.stderr || probe.stdout);
  assert.match(probe.stdout, /PASS: all imported pairs accepted/);
});
