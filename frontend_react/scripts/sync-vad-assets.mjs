import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(projectRoot, 'public', 'vad');
const vadDist = join(projectRoot, 'node_modules', '@ricky0123', 'vad-web', 'dist');
const ortDist = join(projectRoot, 'node_modules', 'onnxruntime-web', 'dist');

const fixedAssets = [
  [vadDist, 'silero_vad_v5.onnx'],
  [vadDist, 'silero_vad_legacy.onnx'],
  [vadDist, 'vad.worklet.bundle.min.js'],
];

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });

for (const [sourceDir, filename] of fixedAssets) {
  await cp(join(sourceDir, filename), join(target, filename));
}

const ortAssets = (await readdir(ortDist))
  .filter(filename => filename.endsWith('.wasm') || filename.endsWith('.mjs'))
  .sort();
for (const filename of ortAssets) {
  await cp(join(ortDist, filename), join(target, filename));
}

console.log(`已同步 ${fixedAssets.length + ortAssets.length} 个本地 VAD 资源到 public/vad`);
