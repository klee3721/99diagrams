# Roadmap 99draw

Kế hoạch thực thi chi tiết cho bản v1 nằm tại
[v1-execution-plan.md](v1-execution-plan.md).

Kế hoạch phần việc còn lại, tiêu chí phát hành và trạng thái nền hiện tại nằm tại
[v1-completion-plan.md](v1-completion-plan.md).

Plan đóng gói cuối để đi từ release candidate tới bản v1.0 hoàn chỉnh nằm tại
[v1-finalization-plan.md](v1-finalization-plan.md).

Audit bằng chứng hoàn thành theo từng nhóm yêu cầu nằm tại
[v1-completion-audit.md](v1-completion-audit.md).

## Plan đưa 99draw tới bản hoàn chỉnh

Mục tiêu của bản hoàn chỉnh đầu tiên là **99draw v1.0**: một web app vẽ
flowchart/workflow local-first, mã nguồn mở, tự host được, có import/export an
toàn và tài liệu đủ để cộng đồng clone, chạy, test, đóng góp.

Không đặt mục tiêu feature parity với draw.io trong v1.0. Các phần nặng như
collaboration realtime, cloud account, plugin marketplace, `.drawio`
compatibility đầy đủ và AI generation để sau khi core ổn định.

### Trạng thái hiện tại

99draw hiện đã có public technical release `v1.0.0`: editor chạy được, có nhiều
shape cơ bản, connector, undo/redo, command palette, templates/demo gallery,
Mermaid import, CSV import, auto-layout, pages/layers, local autosave, recent
documents, outline navigation, JSON/SVG/PNG/PDF export, i18n Việt/Anh, theme
sáng/tối/tương phản cao, PWA, self-host docs, Docker/Nginx config và bộ test tự
động khá rộng.

Phần còn lại để gọi là bản hoàn chỉnh theo nghĩa cộng đồng không phải là thêm
thật nhiều chức năng mới, mà là **đóng bằng chứng beta/manual thật**: người dùng
ngoài dự án thử trên sơ đồ thật, ghi nhận blocker/data-loss/export regression nếu
có, rồi phát hành patch nếu cần.

### Giai đoạn A — Khóa phạm vi v1.0

Mục tiêu: ngăn scope phình ra trước release.

- Khóa v1.0 là flowchart/workflow editor local-first.
- Không thêm collaboration, cloud save, plugin runtime, `.drawio` import hoặc AI
  vào nhánh v1.0.x nếu chưa qua fixture, test và review scope.
- Đưa mọi ý tưởng lớn sang milestone v1.1+ hoặc v2.
- Công bố rõ known limitations: mobile chỉ read-only/fallback, routing chưa sâu
  như draw.io, large diagram có giới hạn đo được.

Done khi: `docs/release-candidate.md`, `docs/release-notes-v1.0.0.md` và
`CHANGELOG.md` thống nhất phạm vi.

### Giai đoạn B — Đóng local release gate

Mục tiêu: chứng minh code hiện tại build/test ổn trên máy dev sạch.

- Chạy `npm ci`.
- Chạy `npm run rc:local`.
- Chạy `npm run benchmark:browser`.
- Sinh SBOM bằng `npm run --silent sbom > 99draw-sbom.cdx.json`.
- Nếu benchmark mới lệch đáng kể, cập nhật `docs/performance.md`.

Done khi: unit, build, static smoke, self-host config check, Playwright đa trình
duyệt, Lighthouse accessibility, audit, SBOM check, OSS package check và
benchmark đều pass.

### Giai đoạn C — Đóng external gate

Mục tiêu: xác nhận bản release không chỉ chạy tốt trên máy hiện tại.

- Chạy `npm run test:e2e:edge` trên máy có Microsoft Edge.
- Chạy `npm run test:docker` trên máy có Docker.
- Hoặc chạy gộp `npm run rc:full`.
- Nếu lỗi do môi trường, ghi rõ trong release candidate notes; nếu lỗi do app,
  sửa trong patch `v1.0.x` trước khi khuyến nghị bản đó.

Done khi: Edge branded smoke pass và Docker image build/run/serve static app ổn.

### Giai đoạn D — Manual/beta smoke với người dùng thật

Mục tiêu: bắt lỗi UX và lỗi mất dữ liệu mà test tự động khó thấy.

- Dùng bốn demo chính: Product flow, Release checklist, Architecture map, Bug
  triage swimlane.
- Với mỗi demo: mở, chỉnh text, thêm node, nối/reconnect edge, undo/redo,
  group/swimlane, reload, đổi theme/ngôn ngữ, export JSON/SVG/PNG/PDF.
- Mời 5-10 người dùng thử theo `docs/beta-feedback.md`.
- Phân loại lỗi: blocker, data-loss, export regression, UX issue, nice-to-have.

Done khi: không còn blocker, data-loss bug hoặc export file hỏng.

### Giai đoạn E — Release polish

Mục tiêu: người ngoài clone, chạy, hiểu giới hạn và đóng góp được.

- Cập nhật `CHANGELOG.md` với ngày release và thay đổi chính.
- Chốt `docs/release-notes-v1.0.0.md`.
- Đính kèm hoặc lưu SBOM CycloneDX.
- Kiểm tra README quickstart, self-host guide, security policy, contributing,
  ADR và good-first-issues.
- Chạy `npm run test:oss`.
- Kiểm tra lại không có logo, stencil, template hoặc asset lấy từ draw.io.

Done khi: release package đủ README, LICENSE, THIRD_PARTY_NOTICES, changelog,
security, contributing, ADR, release notes, SBOM và self-host docs.

### Giai đoạn F — Tag và publish v1.0.0

Mục tiêu: phát hành bản ổn định có đường rollback.

- Set version lên `1.0.0`.
- Build từ checkout sạch.
- Tag `v1.0.0`.
- Tạo GitHub release với changelog, known limitations, SBOM và self-host guide.
- Nếu có site demo/public deployment, giữ artifact hoặc Docker image cũ để
  rollback.

Done khi: người dùng có thể tải source, chạy local, build static/Docker và mở
release notes để biết chính xác bản này làm được gì.

### Sau v1.0

Ưu tiên sau khi release:

1. v1.1: collaboration self-hosted bằng Yjs, presence/cursor và share links.
2. v1.2: cải thiện routing, stencil/shape registry và importers.
3. v2: cân nhắc `.drawio` compatibility, plugin API và AI nếu cộng đồng thật sự
   cần.

## Quyết định kiến trúc

Xây một flowchart/workflow editor nhẹ trên TypeScript và
[React Flow](https://reactflow.dev/), thay vì fork hoặc tái tạo draw.io. React
Flow có giấy phép MIT và đã xử lý canvas, pan/zoom, node, edge, connector,
selection và minimap. 99draw sẽ tập trung vào trải nghiệm vẽ đơn giản, local-first
và cộng đồng mở.

Không dùng tldraw SDK làm lõi: SDK này không phải giấy phép open-source cho
production mặc định. Không copy logo, icon, stencil hay template của draw.io;
dùng bộ shape và asset có giấy phép độc lập, có manifest nguồn gốc.

## Kiến trúc đích

```
apps/web                 React + Vite PWA, editor shell và React Flow canvas
packages/core            document schema, commands, transactions, history
packages/editor-ui       palette, toolbar, inspector, dialogs, shortcuts
packages/format-99draw   schema, migrations, validation, fixtures
packages/importers       Mermaid, CSV, SVG/image (sau beta)
packages/exporters       JSON, SVG, PNG, PDF theo từng giai đoạn
packages/collaboration   Yjs adapter, awareness, permissions (giai đoạn sau)
packages/plugin-sdk      typed extension points và sandbox policy (sau beta)
packages/test-fixtures   flows, snapshots và malformed-file corpus
```

Lựa chọn nền tảng:

* React + TypeScript + Vite: shell UI nhanh, typed, test-friendly.
* React Flow: node/edge canvas, handles, selection, pan/zoom, minimap và custom
  React node components; bọc qua adapter để model sản phẩm không phụ thuộc API UI.
* Zod hoặc JSON Schema: validate `.99draw` và migration rõ ràng.
* Local Storage cho draft/offline ở MVP; IndexedDB và File System Access API khi
  có nhu cầu file lớn hoặc nhiều tài liệu.
* Yjs: chỉ thêm khi collaboration là mục tiêu đã cam kết. CRDT và presence là
  năng lực riêng, không cài vào MVP chỉ để có "share".
* ELK.js: layout sau MVP, chạy trong web worker để không chặn interaction.

## Phạm vi MVP

MVP chứng minh một editor thực dụng, local-first, không yêu cầu tài khoản.

| Có trong MVP | Không có trong MVP |
| --- | --- |
| Canvas SVG, pan/zoom, grid, snap, marquee, selection | Realtime collaboration, comments, AI generation |
| 12-16 shape cơ bản, text, image, group, swimlane | Marketplace/plugin runtime, custom stencil designer |
| Connector straight/orthogonal, arrows, fixed/floating anchor, waypoint | Advanced routing avoidance, line jumps, animation |
| Drag/drop, double-click text, inspector Style/Text/Arrange | Table designer, freehand, math, SQL import |
| Undo/redo, copy/paste, shortcuts, align/distribute/order | Cloud providers, GitHub save, SSO |
| Pages, layer visibility/lock, local autosave | Tags, advanced metadata, presentation mode |
| `.99draw` JSON save/open và export JSON, SVG/PNG export sau đó | `.drawio` compatibility, VSDX/Lucidchart/Gliffy/PDF import |
| Classic light/dark, responsive read-only fallback | Simple/Minimal/Sketch themes |

## Lộ trình triển khai

### Giai đoạn 0 — Foundation và governance

Tạo monorepo pnpm, CI, lint/format/typecheck/test, preview deployment và package
boundaries. Viết `LICENSE` MIT, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`,
`SECURITY.md`, inbound contribution license decision, issue/PR templates và ADR
đầu tiên.

Nghiệm thu: clone -> install -> test -> build chạy được trên CI; contributor mới
biết cách chạy project trong dưới 10 phút; asset manifest không có nguồn mơ hồ.

### Giai đoạn 1 — Document core và canvas

Định nghĩa schema v1, UUID, node/edge/geometry/style, migration layer và command
bus. Tích hợp React Flow qua adapter: viewport, selection, marquee, pan, zoom,
grid, snap, text label và custom node components. Ghi draft vào Local Storage,
hiển thị dirty/saved state.

Nghiệm thu: 1.000 node vẫn pan/zoom mượt trên máy desktop phổ biến; reload không
mất draft; mọi mutation được undo/redo chính xác.

### Giai đoạn 2 — Diagramming interaction

Xây palette General và drag/drop, resize/rotate/duplicate/delete, group/
ungroup, context menu, keyboard shortcuts, text editing. Thêm connector từ
directional handles, floating/fixed anchors, reroute orthogonal và waypoints.

Nghiệm thu: tạo flowchart 20 node bằng chuột lẫn keyboard; di chuyển node giữ
edge hợp lệ; kéo edge thêm/xóa waypoint không làm hỏng model.

### Giai đoạn 3 — Editor chrome và format

Xây layout Classic: menubar, toolbar, sidebar 232px, inspector 240px, page tab
bar; panel kéo rộng; inspector theo ngữ cảnh. Hỗ trợ màu, stroke, fill, font,
alignment, opacity, rounded, shadows, geometry, arrange, layer lock/visibility.
Thêm light/dark và dialog chuẩn.

Nghiệm thu: UI keyboard-accessible, focus visible, responsive ở 1024px; visual
regression cho editor light/dark và ba trạng thái selection.

### Giai đoạn 4 — Tệp và khả năng tương thích

Hoàn thiện native `.99draw` JSON, migration, open/save/download, autosave và
recent documents. Xuất SVG/PNG, sau đó PDF. Parser/serializer `.drawio` chỉ được
xem lại nếu cộng đồng chứng minh đây là nhu cầu thực sự.

Nghiệm thu: round-trip fixture `.99draw`; SVG/PNG export có visual regression
(hiện đã có golden snapshot cho SVG, Chromium visual snapshot cho PNG và UI
smoke cho SVG/PNG/PDF); JSON và SVG độc hại bị sanitize.

### Giai đoạn 5 — Beta cộng đồng

Mở issue board công khai, template gallery tự tạo, import Mermaid và CSV,
automatic layouts qua ELK web worker, custom shape registry v1. Ra bản beta
self-hostable/PWA, telemetry chỉ opt-in và không gửi nội dung diagram.

Nghiệm thu: có Docker/static deployment guide, changelog, demo diagrams, docs
API và 20 `good first issue` thật sự độc lập.

### Giai đoạn 6 — Collaboration và extensibility

Chỉ bắt đầu sau khi core ổn định. Mô hình hóa operations trong Yjs, awareness
(cursor/selection), WebSocket provider self-hostable, quyền read/write, snapshots
và conflict UX. Công bố Plugin SDK với capability permissions; plugin không được
truy cập file/network nếu chưa được cấp quyền.

Nghiệm thu: hai client chỉnh sửa offline rồi reconnect vẫn hội tụ; history và
undo local không phá mutation remote; backend có rate limit và document quota.

## Kế hoạch kiểm thử

| Lớp | Kiểm thử bắt buộc |
| --- | --- |
| Core | unit + property tests cho command inverse, transaction, migration, schema |
| Graph | fixtures cho shape, edge, anchor, group, layer, router và hit-test |
| I/O | golden files `.99draw`, round-trip, fuzz JSON/SVG và giới hạn tệp lớn |
| UI | Playwright cho keyboard, mouse, touch cơ bản; visual snapshots light/dark |
| Performance | benchmark 100/1.000/10.000 cells, load/save/render/pan/zoom memory budgets |
| Collaboration | multi-client deterministic simulations, reconnect, permission và presence tests |
| Security | sanitizer regression, CSP, URL scheme allowlist, dependency audit, SBOM |

## Mục tiêu hiệu năng và an toàn

* Không gửi diagram ra mạng mặc định; local-first là nguyên tắc sản phẩm.
* Autosave sau 1-2 giây idle và trước unload khi có thể; explicit save luôn báo
  thành công/thất bại.
* Render/pan/zoom hướng đến 60 FPS với 1.000 primitive cells; dùng progressive
  rendering/LOD trước khi tuyên bố hỗ trợ 10.000+ cells.
* Không render HTML label hoặc SVG import không sanitize. Không cho plugin nạp
  arbitrary remote script mặc định.
* Accessibility: keyboard-first, shortcut discoverability, ARIA labels cho
  toolbar, không chỉ truyền trạng thái qua màu.

## Phân nhánh quyết định

| Lựa chọn | Khi phù hợp | Hệ quả |
| --- | --- | --- |
| Fork draw.io | cần tương thích rộng ngay và chấp nhận duy trì legacy JS | nhanh có feature, chậm đổi kiến trúc; cần audit asset/trademark kỹ |
| 99draw + React Flow (khuyến nghị) | muốn flowchart/workflow editor gọn, TypeScript và cộng đồng đóng góp | MVP nhanh, nhưng không hướng tới feature parity draw.io |
| 99draw + maxGraph | cần ports, layers, swimlane, routing kỹ thuật sâu | khả năng diagram mạnh hơn nhưng phức tạp đáng kể |
| Tự viết canvas engine | chỉ khi có yêu cầu renderer rất khác | rủi ro cao nhất; không phù hợp giai đoạn đầu |

## Quyết định đã chốt cho Giai đoạn 0

1. Tên thương hiệu và domain độc lập, không chứa `draw.io` hoặc logo/tài sản của
   draw.io.
2. Code 99draw phát hành theo MIT, được khai báo trong `LICENSE`,
   `package.json` và `THIRD_PARTY_NOTICES.md`.
3. Đóng góp dùng chính sách inbound-equals-outbound theo MIT; không yêu cầu CLA
   hoặc DCO sign-off cho PR thông thường.
4. MVP có ưu tiên flowchart, UML, network diagram hay whiteboard. Mặc định kế
   hoạch chọn flowchart + workflow cơ bản.
5. Bản beta chỉ local files/PWA, hay phải có self-hosted collaboration ngay.
   Mặc định chọn local-first để giảm đáng kể rủi ro.

## Nguồn kỹ thuật

* [React Flow](https://reactflow.dev/)
* [React Flow source and MIT license](https://github.com/xyflow/xyflow)
* [Yjs introduction](https://docs.yjs.dev/)
* [draw.io upstream repository](https://github.com/jgraph/drawio)
* [draw.io editor configuration](https://www.drawio.com/docs/reference/configure-diagram-editor/)
