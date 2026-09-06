#!/usr/bin/env node
/**
 * Discover every `assets/source/*.blend` and run the headless exporter
 * (`blender/export.py`) for each, producing `public/assets/models/<name>.glb`.
 *
 * Skips files whose output already exists and is newer than the source.
 *
 * Env:
 *   BLENDER_BIN  — path to the `blender` executable. Defaults to "blender" on PATH.
 *   BASISU_PATH  — path to a `basisu` binary. Enables KTX2 texture compression.
 */

import { spawn } from 'node:child_process';
import { mkdir, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SOURCE_DIR = join(ROOT, 'assets', 'source');
const OUTPUT_DIR = join(ROOT, 'public', 'assets', 'models');
const BLENDER_BIN = process.env.BLENDER_BIN || 'blender';

async function listBlendFiles() {
  if (!existsSync(SOURCE_DIR)) return [];
  const entries = await readdir(SOURCE_DIR);
  return entries.filter((f) => f.toLowerCase().endsWith('.blend')).sort();
}

function runBlender(input, output) {
  return new Promise((resolveRun, rejectRun) => {
    const args = [
      '--background',
      '--factory-startup',
      '--python',
      join(__dirname, 'export.py'),
      '--',
      input,
      output,
    ];
    const child = spawn(BLENDER_BIN, args, { stdio: 'inherit' });
    child.on('exit', (code) => {
      if (code === 0) resolveRun(code);
      else rejectRun(new Error(`blender exited with code ${code}`));
    });
    child.on('error', rejectRun);
  });
}

async function newerThan(src, dst) {
  if (!existsSync(dst)) return true;
  const [a, b] = await Promise.all([stat(src), stat(dst)]);
  return a.mtimeMs > b.mtimeMs;
}

async function main() {
  const files = await listBlendFiles();
  if (files.length === 0) {
    console.log(
      `[blender] No .blend files found in ${SOURCE_DIR}. Drop one in and re-run.`,
    );
    return;
  }
  await mkdir(OUTPUT_DIR, { recursive: true });

  let exported = 0;
  let skipped = 0;
  let failed = 0;

  for (const name of files) {
    const src = join(SOURCE_DIR, name);
    const outName = name.replace(/\.blend$/i, '.glb');
    const dst = join(OUTPUT_DIR, outName);

    if (!(await newerThan(src, dst))) {
      console.log(`[blender] up-to-date: ${outName}`);
      skipped++;
      continue;
    }

    console.log(`[blender] exporting: ${name}`);
    try {
      await runBlender(src, dst);
      exported++;
    } catch (err) {
      console.error(`[blender] FAILED: ${name} (${err.message})`);
      failed++;
    }
  }

  console.log(`[blender] done: ${exported} exported, ${skipped} skipped, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(`[blender] fatal: ${err.message}`);
  process.exit(1);
});
