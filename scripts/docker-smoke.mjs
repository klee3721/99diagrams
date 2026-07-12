import { execFileSync } from 'node:child_process'

const tag = `99draw:smoke-${Date.now()}`
let containerId = ''

function run(command, args, options = {}) {
  const output = execFileSync(command, args, { encoding: 'utf8', stdio: options.stdio ?? 'pipe' })
  return typeof output === 'string' ? output.trim() : ''
}

async function waitFor(url, description) {
  const deadline = Date.now() + 20_000
  let lastError = null

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return response
      lastError = new Error(`${description} returned ${response.status}`)
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  throw lastError ?? new Error(`${description} did not respond`)
}

async function main() {
  try {
    run('docker', ['version'])
  } catch (error) {
    if (error?.code === 'ENOENT') throw new Error('Docker CLI is not available. Install/start Docker before running npm run test:docker.')
    throw error
  }

  run('docker', ['build', '-t', tag, '.'], { stdio: 'inherit' })
  containerId = run('docker', ['run', '--rm', '-d', '-p', '127.0.0.1::8080', tag])

  const portOutput = run('docker', ['port', containerId, '8080/tcp'])
  const port = portOutput.match(/127\.0\.0\.1:(\d+)/)?.[1] ?? portOutput.match(/0\.0\.0\.0:(\d+)/)?.[1]
  if (!port) throw new Error(`Could not determine mapped port from: ${portOutput}`)

  const root = await waitFor(`http://127.0.0.1:${port}/`, 'root page')
  const html = await root.text()
  if (!html.includes('<div id="root"></div>')) throw new Error('Root page did not include the app mount node')

  const manifest = await waitFor(`http://127.0.0.1:${port}/manifest.webmanifest`, 'manifest')
  const manifestText = await manifest.text()
  if (!manifestText.includes('99draw')) throw new Error('Manifest did not include 99draw metadata')

  console.log(`Docker smoke passed on http://127.0.0.1:${port}`)
}

try {
  await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  if (containerId) {
    try {
      run('docker', ['rm', '-f', containerId])
    } catch {
      // Best-effort cleanup.
    }
  }
  try {
    run('docker', ['image', 'rm', tag])
  } catch {
    // Best-effort cleanup.
  }
}
