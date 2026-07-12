import { describe, expect, it } from 'vitest'
import { sanitizeSvgDataUrl, sanitizeSvgText } from './svg'

describe('svg sanitizer', () => {
  it('removes executable elements and event handlers', () => {
    const sanitized = sanitizeSvgText('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script><rect onclick="alert(2)" width="10" height="10"/></svg>')

    expect(sanitized).not.toContain('script')
    expect(sanitized).not.toContain('onload')
    expect(sanitized).not.toContain('onclick')
    expect(sanitized).toContain('<rect')
  })

  it('removes external and javascript references while keeping safe embedded images', () => {
    const sanitized = sanitizeSvgText('<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.com/a.png"/><a href="javascript:alert(1)"/><image href="data:image/png;base64,iVBORw0KGgo="/></svg>')

    expect(sanitized).not.toContain('https://example.com')
    expect(sanitized).not.toContain('javascript:')
    expect(sanitized).toContain('data:image/png;base64,iVBORw0KGgo=')
  })

  it('normalizes svg data urls after sanitizing', () => {
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"><rect onmouseover="alert(1)"/></svg>')}`
    const sanitized = sanitizeSvgDataUrl(dataUrl)

    expect(sanitized).toMatch(/^data:image\/svg\+xml;charset=utf-8,/)
    expect(decodeURIComponent(sanitized.split(',')[1])).not.toContain('onmouseover')
  })
})
