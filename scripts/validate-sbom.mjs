import { execFileSync } from 'node:child_process'

const output = execFileSync('npm', ['sbom', '--sbom-format', 'cyclonedx', '--json'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
})

const sbom = JSON.parse(output)

if (sbom.bomFormat !== 'CycloneDX') {
  throw new Error(`Expected CycloneDX SBOM, received ${String(sbom.bomFormat)}`)
}

if (sbom.metadata?.component?.name !== '99draw') {
  throw new Error('SBOM metadata does not describe the 99draw package')
}

const components = Array.isArray(sbom.components) ? sbom.components.length : 0
if (components < 1) throw new Error('SBOM did not include dependency components')

console.log(`SBOM valid: ${sbom.bomFormat} with ${components} components`)
