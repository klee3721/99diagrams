import { describe, expect, it } from 'vitest'
import { parseMermaidFlowchart } from './mermaid'
import { templateText, templates } from './templates'

describe('templates and Mermaid import', () => {
  it('ships twelve editable templates', () => {
    expect(templates).toHaveLength(12)
    expect(templates.every((template) => Array.isArray(template.snapshot().nodes))).toBe(true)
  })

  it('localizes template gallery text and generated node labels', () => {
    const approval = templates.find((template) => template.id === 'approval')!

    expect(templateText(approval, 'vi').name).toBe('Phê duyệt')
    expect(templateText(approval, 'en').name).toBe('Approval')
    expect(approval.snapshot().nodes[0].data.label).toBe('Gửi yêu cầu')
    expect(approval.snapshot('en').nodes[0].data.label).toBe('Submit request')
  })

  it('imports a basic Mermaid flowchart', () => {
    const diagram = parseMermaidFlowchart('flowchart TD\nA[Start] --> B{Ready?}\nB -->|Yes| C[Ship]')
    expect(diagram?.nodes).toHaveLength(3)
    expect(diagram?.edges).toHaveLength(2)
    expect(diagram?.nodes.find((node) => node.id === 'B')?.data.kind).toBe('decision')
  })
})
