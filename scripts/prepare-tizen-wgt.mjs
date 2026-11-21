import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const tizenConfigSrc = path.join(rootDir, 'public', 'tizen', 'config.xml');
const outDir = path.join(rootDir, 'dist-tizen');
const downloadsDir = path.join(rootDir, 'public', 'downloads');

if (!fs.existsSync(distDir)) {
  console.error('Error: dist/ not found. Run "npm run build" first.');
  process.exit(1);
}

if (!fs.existsSync(tizenConfigSrc)) {
  console.error('Error: public/tizen/config.xml not found.');
  process.exit(1);
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.cpSync(distDir, outDir, {
  recursive: true,
  filter: (src) => !src.includes(`${path.sep}downloads`),
});
fs.copyFileSync(tizenConfigSrc, path.join(outDir, 'config.xml'));

const requiredAssets = ['index.html', 'config.xml', 'pwa-512x512.png'];
for (const file of requiredAssets) {
  if (!fs.existsSync(path.join(outDir, file))) {
    console.error(`Error: missing ${file} in dist-tizen/`);
    process.exit(1);
  }
}

fs.mkdirSync(downloadsDir, { recursive: true });

const tizenZipPath = path.join(downloadsDir, 'lammet-elbeit-samsung-tv.zip');
const sourceZipPath = path.join(downloadsDir, 'lammet-elbeit-source.zip');

// Package dist-tizen/ -> public/downloads/lammet-elbeit-samsung-tv.zip
execFileSync('python3', [
  '-c',
  `
import os, zipfile, sys
src_dir, zip_path = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(src_dir):
        for f in files:
            full = os.path.join(root, f)
            rel = os.path.relpath(full, src_dir)
            zf.write(full, rel)
`,
  outDir,
  tizenZipPath,
]);

// Package clean project source -> public/downloads/lammet-elbeit-source.zip
execFileSync('python3', [
  '-c',
  `
import os, zipfile, sys
root_dir, zip_path = sys.argv[1], sys.argv[2]
exclude_dirs = {'node_modules', '.git', 'dist', 'dist-tizen', 'dev-dist', '.aistudio', '.playwright-cli'}
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(root_dir):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        rel_root = os.path.relpath(root, root_dir)
        if rel_root.startswith('public' + os.sep + 'downloads') or rel_root == 'public' + os.sep + 'downloads':
            continue
        for f in files:
            if f.endswith('.zip') or f.endswith('.wgt'):
                continue
            full = os.path.join(root, f)
            rel = os.path.relpath(full, root_dir)
            zf.write(full, rel)
`,
  rootDir,
  sourceZipPath,
]);

console.log('Ready:');
console.log(` - Folder: dist-tizen/`);
console.log(` - TV Bundle ZIP: public/downloads/lammet-elbeit-samsung-tv.zip`);
console.log(` - Full Source ZIP: public/downloads/lammet-elbeit-source.zip`);
