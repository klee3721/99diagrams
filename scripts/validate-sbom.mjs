import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const expectedRef = `${packageJson.name}@${packageJson.version}`
const expectedPurl = `pkg:npm/${packageJson.name}@${packageJson.version}`

const output = execFileSync('npm', ['sbom', '--sbom-format', 'cyclonedx', '--json'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
})

const sbom = JSON.parse(output)

if (sbom.bomFormat !== 'CycloneDX') {
  throw new Error(`Expected CycloneDX SBOM, received ${String(sbom.bomFormat)}`)
}

const component = sbom.metadata?.component
if (component?.['bom-ref'] !== expectedRef || component?.purl !== expectedPurl || component?.version !== packageJson.version) {
  throw new Error('SBOM metadata does not describe the 99 Diagrams package')
}

const components = Array.isArray(sbom.components) ? sbom.components.length : 0
if (components < 1) throw new Error('SBOM did not include dependency components')

console.log(`SBOM valid: ${sbom.bomFormat} with ${components} components`)
