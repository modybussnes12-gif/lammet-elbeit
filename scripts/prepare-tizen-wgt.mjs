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
  filter: (src) => {
    const normalized = src.split(path.sep).join('/');
    return !normalized.includes('/downloads') && !normalized.includes('/assets/aistudio');
  },
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
const githubZipPath = path.join(downloadsDir, 'lammet-elbeit-github.zip');
const sourceZipPath = path.join(downloadsDir, 'lammet-elbeit-source.zip');

// Package dist-tizen/ -> public/downloads/lammet-elbeit-samsung-tv.zip
execFileSync('python3', [
  '-c',
  `
import os, zipfile, sys
src_dir, zip_path = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(src_dir):
        for f in sorted(files):
            full = os.path.join(root, f)
            rel = os.path.relpath(full, src_dir)
            zf.write(full, rel)
`,
  outDir,
  tizenZipPath,
]);

// Package ONLY clean GitHub-ready files -> public/downloads/lammet-elbeit-github.zip (+ legacy alias lammet-elbeit-source.zip)
execFileSync('python3', [
  '-c',
  `
import os, shutil, zipfile, sys
root_dir, github_zip, source_zip = sys.argv[1], sys.argv[2], sys.argv[3]
exclude_dirs = {'node_modules', '.git', 'dist', 'dist-tizen', 'dev-dist', '.aistudio', '.playwright-cli'}
exclude_rel_prefixes = {'public/downloads', 'public/assets/aistudio'}
exclude_root_files = {'firestore.rules', 'firebase-blueprint.json', 'security_spec.md', 'bun.lock'}
with zipfile.ZipFile(github_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(root_dir):
        dirs[:] = sorted(d for d in dirs if d not in exclude_dirs)
        rel_root = os.path.relpath(root, root_dir).replace(os.sep, '/')
        if any(rel_root == p or rel_root.startswith(p + '/') for p in exclude_rel_prefixes):
            dirs[:] = []
            continue
        for f in sorted(files):
            if f.endswith('.zip') or f.endswith('.wgt') or f == '.DS_Store':
                continue
            rel_path = f if rel_root == '.' else f'{rel_root}/{f}'
            if rel_path in exclude_root_files:
                continue
            zf.write(os.path.join(root, f), rel_path)
shutil.copyfile(github_zip, source_zip)
`,
  rootDir,
  githubZipPath,
  sourceZipPath,
]);

console.log('Ready:');
console.log(` - Folder: dist-tizen/`);
console.log(` - TV Bundle ZIP: public/downloads/lammet-elbeit-samsung-tv.zip`);
console.log(` - GitHub Clean ZIP: public/downloads/lammet-elbeit-github.zip`);
console.log(` - Source Alias ZIP: public/downloads/lammet-elbeit-source.zip`);
