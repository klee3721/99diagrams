import { execFileSync } from 'node:child_process'

const explicitRepo = process.argv[2] ?? process.env.GITHUB_REPOSITORY ?? ''
const repo = explicitRepo || inferRepoFromGitRemote()

if (!repo) {
  console.error('Could not infer GitHub repository. Pass owner/name or set GITHUB_REPOSITORY.')
  process.exit(2)
}

let issues
try {
  const output = execFileSync('gh', [
    'issue',
    'list',
    '--repo',
    repo,
    '--state',
    'open',
    '--limit',
    '200',
    '--json',
    'number,title,url,labels,body',
  ], { encoding: 'utf8' })
  issues = JSON.parse(output)
} catch (error) {
  console.error('Could not read GitHub issues through the gh CLI.')
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(2)
}

const blockers = issues.filter((issue) => {
  const labels = new Set((issue.labels ?? []).map((label) => String(label.name).toLocaleLowerCase('en-US')))
  if (labels.has('blocker') || labels.has('data-loss') || labels.has('severity:blocker')) return true

  const body = String(issue.body ?? '')
  return hasIssueFormBlockerSeverity(body)
})

if (blockers.length) {
  console.error(`Release blocked by ${blockers.length} open blocker/data-loss issue(s):`)
  for (const issue of blockers) {
    console.error(`- #${issue.number} ${issue.title} ${issue.url}`)
  }
  process.exit(1)
}

console.log(`No open blocker/data-loss GitHub issues found for ${repo}.`)

function inferRepoFromGitRemote() {
  try {
    const remote = execFileSync('git', ['config', '--get', 'remote.origin.url'], { encoding: 'utf8' }).trim()
    const match = remote.match(/github\.com[:/]([^/]+\/[^/.]+)(?:\.git)?$/i)
    return match?.[1] ?? ''
  } catch {
    return ''
  }
}

function hasIssueFormBlockerSeverity(body) {
  const severityHeadings = ['Mức độ', 'Severity']
  for (const heading of severityHeadings) {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const match = body.match(new RegExp(`###\\s*${escaped}\\s*\\n+([\\s\\S]*?)(?:\\n###\\s|$)`, 'i'))
    if (match && /^\s*blocker\b/i.test(match[1])) return true
  }
  return false
}
