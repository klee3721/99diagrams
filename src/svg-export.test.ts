import { describe, expect, it } from 'vitest'
import { exportFixtures } from './export-fixtures'
import { exportSnapshotToSvg } from './svg'

describe('deterministic SVG export', () => {
  it('renders every export fixture to stable SVG', () => {
    for (const fixture of exportFixtures) {
      const svg = exportSnapshotToSvg(fixture.snapshot, { title: fixture.name })

      expect(svg, fixture.id).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)
      expect(svg, fixture.id).toContain(`<title>${fixture.name}`)
      expect(svg, fixture.id).not.toContain('<script')
      expect(svg, fixture.id).not.toContain('onload=')
      expect(svg, fixture.id).toMatchSnapshot(fixture.id)
    }
  })
})
