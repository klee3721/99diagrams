import { createEdge, createNode, type DiagramSnapshot, type NodeKind } from './diagram'
import type { Language } from './i18n'

type TemplateCopy = {
  name: string
  description: string
  labels: string[]
}

export type DiagramTemplate = {
  id: string
  name: string
  description: string
  copy: Record<Language, TemplateCopy>
  snapshot: (language?: Language) => DiagramSnapshot
}

function linear(id: string, labels: string[], kinds: NodeKind[] = []): DiagramSnapshot {
  const nodes = labels.map((label, index) => createNode(kinds[index] ?? 'process', { x: 280, y: 70 + index * 120 }, label, `${id}-${index}`))
  return { nodes, edges: nodes.slice(1).map((node, index) => createEdge(nodes[index].id, node.id, `${id}-edge-${index}`)) }
}

function makeTemplate(
  id: string,
  kinds: NodeKind[],
  vi: TemplateCopy,
  en: TemplateCopy,
): DiagramTemplate {
  return {
    id,
    name: vi.name,
    description: vi.description,
    copy: { vi, en },
    snapshot: (language = 'vi') => linear(id, (language === 'en' ? en : vi).labels, kinds),
  }
}

export function templateText(template: DiagramTemplate, language: Language) {
  return template.copy[language]
}

export const templates: DiagramTemplate[] = [
  {
    id: 'blank',
    name: 'Sơ đồ trống',
    description: 'Bắt đầu với canvas trống',
    copy: {
      vi: { name: 'Sơ đồ trống', description: 'Bắt đầu với canvas trống', labels: [] },
      en: { name: 'Blank diagram', description: 'Start with an empty canvas', labels: [] },
    },
    snapshot: () => ({ nodes: [], edges: [] }),
  },
  makeTemplate(
    'basic-flow',
    ['start', 'process', 'decision', 'start'],
    { name: 'Flowchart cơ bản', description: 'Bắt đầu, xử lý, điều kiện, kết thúc', labels: ['Bắt đầu', 'Xử lý yêu cầu', 'Hợp lệ?', 'Kết thúc'] },
    { name: 'Basic flowchart', description: 'Start, process, condition, finish', labels: ['Start', 'Process request', 'Valid?', 'Finish'] },
  ),
  makeTemplate(
    'approval',
    ['start', 'process', 'decision', 'process'],
    { name: 'Phê duyệt', description: 'Luồng duyệt yêu cầu', labels: ['Gửi yêu cầu', 'Kiểm tra', 'Phê duyệt?', 'Thông báo kết quả'] },
    { name: 'Approval', description: 'Request approval workflow', labels: ['Submit request', 'Review', 'Approved?', 'Notify result'] },
  ),
  makeTemplate(
    'incident',
    ['start', 'decision', 'process', 'document'],
    { name: 'Xử lý sự cố', description: 'Phát hiện đến đóng sự cố', labels: ['Phát hiện', 'Phân loại', 'Giảm thiểu', 'Postmortem'] },
    { name: 'Incident response', description: 'From detection to closure', labels: ['Detect', 'Classify', 'Mitigate', 'Postmortem'] },
  ),
  makeTemplate(
    'cicd',
    ['start', 'process', 'decision', 'process'],
    { name: 'CI/CD', description: 'Build, test và deploy', labels: ['Push code', 'Build', 'Test', 'Deploy'] },
    { name: 'CI/CD', description: 'Build, test, and deploy', labels: ['Push code', 'Build', 'Test', 'Deploy'] },
  ),
  makeTemplate(
    'onboarding',
    ['start', 'process', 'swimlane', 'document'],
    { name: 'Onboarding', description: 'Quy trình nhân sự mới', labels: ['Nhận offer', 'Chuẩn bị thiết bị', 'Ngày đầu', 'Đánh giá tuần 1'] },
    { name: 'Onboarding', description: 'New hire workflow', labels: ['Accept offer', 'Prepare equipment', 'First day', 'Week 1 review'] },
  ),
  makeTemplate(
    'support',
    ['start', 'decision', 'process', 'start'],
    { name: 'Hỗ trợ khách hàng', description: 'Tiếp nhận và giải quyết ticket', labels: ['Ticket mới', 'Phân loại', 'Giải quyết', 'Đóng ticket'] },
    { name: 'Customer support', description: 'Intake and resolve tickets', labels: ['New ticket', 'Triage', 'Resolve', 'Close ticket'] },
  ),
  makeTemplate(
    'release',
    ['process', 'process', 'decision', 'document'],
    { name: 'Phát hành', description: 'Checklist release phần mềm', labels: ['Đóng tính năng', 'QA', 'Release?', 'Theo dõi'] },
    { name: 'Release', description: 'Software release checklist', labels: ['Feature freeze', 'QA', 'Release?', 'Monitor'] },
  ),
  makeTemplate(
    'research',
    ['note', 'database', 'process', 'document'],
    { name: 'Nghiên cứu', description: 'Giả thuyết đến kết luận', labels: ['Giả thuyết', 'Thu thập dữ liệu', 'Phân tích', 'Kết luận'] },
    { name: 'Research', description: 'From hypothesis to conclusion', labels: ['Hypothesis', 'Collect data', 'Analyze', 'Conclusion'] },
  ),
  makeTemplate(
    'order',
    ['start', 'decision', 'process', 'process'],
    { name: 'Xử lý đơn hàng', description: 'Thanh toán và giao hàng', labels: ['Đơn mới', 'Thanh toán?', 'Đóng gói', 'Giao hàng'] },
    { name: 'Order processing', description: 'Payment and delivery', labels: ['New order', 'Paid?', 'Pack', 'Ship'] },
  ),
  makeTemplate(
    'system',
    ['input', 'process', 'process', 'database'],
    { name: 'System map', description: 'Client, API và database', labels: ['Client', 'API', 'Service', 'Database'] },
    { name: 'System map', description: 'Client, API, and database', labels: ['Client', 'API', 'Service', 'Database'] },
  ),
  makeTemplate(
    'retro',
    ['note', 'group', 'decision', 'document'],
    { name: 'Retrospective', description: 'Thu thập và hành động', labels: ['Thu thập', 'Nhóm chủ đề', 'Chọn hành động', 'Theo dõi'] },
    { name: 'Retrospective', description: 'Collect insights and actions', labels: ['Collect', 'Group themes', 'Choose action', 'Follow up'] },
  ),
]
