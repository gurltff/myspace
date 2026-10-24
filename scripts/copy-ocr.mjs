// Copies the Tesseract OCR worker, wasm core and English data into public/ so OCR works without any CDN.
import { cpSync, mkdirSync, existsSync } from 'node:fs';

const out = 'public/tesseract';
mkdirSync(out, { recursive: true });
const files = [
  ['node_modules/tesseract.js/dist/worker.min.js', 'worker.min.js'],
  ...['tesseract-core-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js', 'tesseract-core-lstm.wasm', 'tesseract-core-simd-lstm.wasm'].map((f) => [`node_modules/tesseract.js-core/${f}`, f]),
  ['node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'eng.traineddata.gz'],
];
for (const [from, to] of files) {
  if (!existsSync(`${out}/${to}`)) cpSync(from, `${out}/${to}`);
}
console.log('OCR assets ready in', out);
