import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const releaseDir = path.join(root, 'release');
const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = packageJson.version;
const tagName = `v${version}`;
const artifactBase = `99-diagrams-${tagName}`;
const allowDirty = process.argv.includes('--allow-dirty');

function run(command, args) {
  return execFileSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function requireFile(filePath, label) {
  if (!existsSync(filePath)) {
    throw new Error(`${label} is missing: ${path.relative(root, filePath)}`);
  }
}

function sha256(filePath) {
  const hash = createHash('sha256');
  hash.update(readFileSync(filePath));
  return hash.digest('hex');
}

const dirty = run('git', ['status', '--short']);
if (dirty && !allowDirty) {
  throw new Error(
    `Release packaging requires a clean git tree. Commit or stash these changes first:\n${dirty}`,
  );
}

const head = run('git', ['rev-parse', 'HEAD']);
const exactTag = run('git', ['describe', '--tags', '--exact-match', 'HEAD']);
if (exactTag !== tagName) {
  throw new Error(`HEAD must be tagged ${tagName}; current exact tag is ${exactTag}`);
}

const distDir = path.join(root, 'dist');
const releaseNotesFile = path.join(root, 'docs/release-notes-v1.0.0.md');

requireFile(path.join(distDir, 'index.html'), 'Production build');
requireFile(releaseNotesFile, 'Release notes');

const releaseSbomText = run('npm', ['sbom', '--sbom-format', 'cyclonedx', '--json']);
const sbom = JSON.parse(releaseSbomText);
const sbomComponent = sbom.metadata?.component;
const sbomRef = sbomComponent?.['bom-ref'];
const sbomPurl = sbomComponent?.purl;
const sbomVersion = sbom.metadata?.component?.version;
if (sbomRef !== `${packageJson.name}@${version}` || sbomPurl !== `pkg:npm/${packageJson.name}@${version}` || sbomVersion !== version) {
  throw new Error(
    `SBOM metadata mismatch: expected ${packageJson.name}@${version}, got ${
      sbomRef ?? sbomPurl ?? 'unknown'
    }`,
  );
}
sbom.metadata.component.name = packageJson.name;

mkdirSync(releaseDir, { recursive: true });

const artifacts = [
  {
    label: 'source',
    file: path.join(releaseDir, `${artifactBase}-source.tar.gz`),
    create() {
      run('git', [
        'archive',
        '--format=tar.gz',
        `--prefix=${artifactBase}/`,
        '-o',
        this.file,
        'HEAD',
      ]);
    },
  },
  {
    label: 'dist',
    file: path.join(releaseDir, `${artifactBase}-dist.tar.gz`),
    create() {
      run('tar', ['-czf', this.file, '-C', root, 'dist']);
    },
  },
  {
    label: 'sbom',
    file: path.join(releaseDir, `${artifactBase}-sbom.cdx.json`),
    create() {
      writeFileSync(this.file, `${JSON.stringify(sbom, null, 2)}\n`);
    },
  },
  {
    label: 'release-notes',
    file: path.join(releaseDir, `${artifactBase}-release-notes.md`),
    create() {
      copyFileSync(releaseNotesFile, this.file);
    },
  },
];

for (const artifact of artifacts) {
  artifact.create();
}

const manifest = {
  name: packageJson.name,
  version,
  tag: tagName,
  commit: head,
  generatedAt: new Date().toISOString(),
  sbom: {
    bomFormat: sbom.bomFormat,
    specVersion: sbom.specVersion,
    components: sbom.components?.length ?? 0,
  },
  artifacts: artifacts.map((artifact) => ({
    label: artifact.label,
    file: path.basename(artifact.file),
    sha256: sha256(artifact.file),
  })),
};

const manifestFile = path.join(releaseDir, `${artifactBase}-manifest.json`);
writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);

const checksumLines = [
  ...artifacts.map((artifact) => `${sha256(artifact.file)}  ${path.basename(artifact.file)}`),
  `${sha256(manifestFile)}  ${path.basename(manifestFile)}`,
];
const checksumFile = path.join(releaseDir, 'SHA256SUMS');
writeFileSync(checksumFile, `${checksumLines.join('\n')}\n`);

console.log(`Release package ready in ${path.relative(root, releaseDir)}`);
for (const line of checksumLines) {
  console.log(line);
}
