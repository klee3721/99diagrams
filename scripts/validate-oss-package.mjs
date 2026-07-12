import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const failures = []

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), 'utf8'))
}

function readText(path) {
  return readFileSync(join(root, path), 'utf8')
}

function requireFile(path) {
  if (!existsSync(join(root, path))) failures.push(`Missing required OSS file: ${path}`)
}

const requiredFiles = [
  'README.md',
  'LICENSE',
  'THIRD_PARTY_NOTICES.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'SECURITY.md',
  '.github/pull_request_template.md',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/feature_request.yml',
  '.github/ISSUE_TEMPLATE/beta_feedback.yml',
  '.github/workflows/ci.yml',
  '.github/workflows/release.yml',
  'docs/adr/0001-local-first-react-flow.md',
  'docs/adr/0002-inbound-contribution-license.md',
  'docs/release-checklist.md',
  'docs/release-candidate.md',
  'docs/release-notes-v1.0.0.md',
  'docs/self-host.md',
]

for (const file of requiredFiles) requireFile(file)

const packageJson = readJson('package.json')
const packageLock = readJson('package-lock.json')
const license = readText('LICENSE')
const notices = readText('THIRD_PARTY_NOTICES.md')

if (packageJson.license !== 'MIT') failures.push(`package.json license must be MIT, received ${String(packageJson.license)}`)
if (!license.startsWith('MIT License')) failures.push('LICENSE must contain the MIT License text')
if (!notices.includes('99draw is released under MIT')) failures.push('THIRD_PARTY_NOTICES.md must state the project license')

const runtimeDeps = Object.keys(packageJson.dependencies ?? {})
for (const dependency of runtimeDeps) {
  const packagePath = `node_modules/${dependency}`
  const lockEntry = packageLock.packages?.[packagePath]
  if (!lockEntry) {
    failures.push(`Missing package-lock entry for runtime dependency: ${dependency}`)
    continue
  }
  if (!notices.includes(`\`${dependency}\``)) failures.push(`THIRD_PARTY_NOTICES.md is missing runtime dependency: ${dependency}`)
  if (!notices.includes(`| ${lockEntry.version} |`)) failures.push(`THIRD_PARTY_NOTICES.md version for ${dependency} should include ${lockEntry.version}`)
  if (lockEntry.license && !notices.includes(`| ${lockEntry.license} |`)) failures.push(`THIRD_PARTY_NOTICES.md license for ${dependency} should include ${lockEntry.license}`)
}

const localLinkPattern = /\[[^\]]+\]\((?!https?:\/\/|mailto:|#)([^)\s]+)(?:\s+"[^"]*")?\)/g
const markdownFiles = [
  'README.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'CHANGELOG.md',
]

const docsFiles = [
  'docs/roadmap.md',
  'docs/v1-execution-plan.md',
  'docs/v1-completion-plan.md',
  'docs/v1-finalization-plan.md',
  'docs/release-checklist.md',
  'docs/release-candidate.md',
  'docs/release-notes-v1.0.0.md',
  'docs/self-host.md',
  'docs/demo-gallery.md',
  'docs/beta-feedback.md',
  'docs/good-first-issues.md',
  'docs/performance.md',
  'docs/adr/0001-local-first-react-flow.md',
  'docs/adr/0002-inbound-contribution-license.md',
]

for (const file of [...markdownFiles, ...docsFiles]) {
  if (!existsSync(join(root, file))) continue
  const directory = dirname(file)
  const contents = readText(file)
  for (const match of contents.matchAll(localLinkPattern)) {
    const target = decodeURIComponent(match[1].split('#')[0])
    if (!target) continue
    const resolved = normalize(join(directory, target))
    if (resolved.startsWith('..')) {
      failures.push(`${file} links outside the repository: ${match[1]}`)
    } else if (!existsSync(join(root, resolved))) {
      failures.push(`${file} has a broken local link: ${match[1]}`)
    }
  }
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'))
  process.exit(1)
}

console.log(`OSS package valid: ${requiredFiles.length} required files, ${runtimeDeps.length} runtime notices, local docs links checked`)
