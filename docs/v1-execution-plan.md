# Kế hoạch thực thi 99 Diagrams v1.0

## Mục tiêu phát hành

99 Diagrams v1.0 là flowchart và workflow editor mã nguồn mở, local-first, tự host
được và không bắt buộc tài khoản. Người dùng phải có thể tạo, chỉnh sửa, lưu,
mở và xuất sơ đồ một cách đáng tin cậy.

V1 không phải bản sao draw.io. Collaboration, cloud storage, AI, marketplace,
plugin API và tương thích `.drawio` đầy đủ được hoãn sang các phiên bản sau.

## Tiêu chí hoàn thành

| Nhóm | Bắt buộc trong v1.0 |
| --- | --- |
| Canvas | pan/zoom, grid, snap, minimap, marquee, keyboard navigation |
| Nodes | start/end, process, decision, input/output, document, database, note, group, swimlane |
| Edges | straight, smoothstep, orthogonal, reconnect, marker, label, color, width, dash, animation |
| Editing | text edit, resize, duplicate, delete, copy/paste, multi-select, align, distribute, z-order, group |
| Files | autosave, recent files, validated `.99diagrams.json`, migration, drag-drop open |
| Output | JSON, SVG, PNG, PDF, copy image |
| Productivity | keyboard shortcuts, command palette, templates, auto-layout, Mermaid/CSV import |
| Product quality | PWA/offline, Việt/Anh, WCAG AA desktop, dark/high contrast, documentation |
| OSS | CI, GPL-3.0-only, security policy, contribution guide, issue templates, self-host guide |

## Kiến trúc bắt buộc

```text
React UI -> document commands -> React Flow adapter -> persistence/import/export
```

* React Flow chỉ render và xử lý tương tác; format `.99diagrams` không bị khóa vào API của nó.
* Mọi mutation là command transaction để undo/redo, autosave và collaboration tương lai cùng dùng.
* Mọi file import phải validate/sanitize trước khi vào state.
* Tính năng mới phải có fixture, test và đường keyboard tương đương thao tác chuột.

## Mốc thực hiện

Mỗi sprint là hai tuần với một developer toàn thời gian.

### Sprint 0: Foundation

Khóa branding độc lập, browser support, schema v1, GitHub Actions, release checklist,
issue/PR templates và preview deployment.

Done: clone mới chạy được dưới 10 phút; CI chặn test/build lỗi.

### Sprint 1: Document core

Tạo persistence service: Local Storage fallback, IndexedDB cho draft/recent files.
Thêm metadata, migration registry, command bus và history cho node, edge, style,
group và page. Thêm property test cho undo/redo và parser.

Done: 100 lần undo/redo không mất dữ liệu; file sai không làm app crash.

### Sprint 2: Editor fundamentals

Thêm multi-select, marquee, nudge bằng keyboard, copy/paste, select all, context
menu, command palette, rename và tooltip/disabled states đúng ngữ cảnh.

Done: tạo flowchart 20 node chỉ bằng palette và keyboard.

### Sprint 3: Shape và connector library

Thêm shape registry v1, image node, group, swimlane, edge reconnect, handle,
marker, dash, mixed-state format inspector và reconnect edge.

Done: workflow, basic UML activity và architecture diagram đơn giản hoạt động;
move/resize/group không tạo edge dangling.
Trạng thái hiện tại: node thường đã được reconcile parent theo hình học khi
kéo vào/ra group hoặc swimlane; container delete xóa descendants và edge liên
quan; reparent node thường giữa sibling group và từ nested group về parent
swimlane đã có unit test; reparent container lồng nhau nâng cao được hoãn sau v1
nếu cần.

### Sprint 4: Arrange, layout và templates

Thêm align, distribute, z-order, lock, group/ungroup, fit selection. Tích hợp
ELK.js trong web worker cho layered/tree/radial layouts. Ship 12 templates.

Done: layout 200 node không khóa UI; template mở/chỉnh/lưu như document thường.

### Sprint 5: File workflows và export

Thêm rename, recent files, drag-drop import, SVG lossless, PNG, PDF, copy image,
Mermaid/CSV import và export selection/current page/full document.

Done: 20 export fixtures có visual snapshot; SVG/PNG/PDF mở đúng trong app phổ biến.
Trạng thái hiện tại: SVG đã có deterministic model exporter và golden snapshots;
PNG export dùng cùng nguồn SVG model và đã có Chromium visual snapshot đủ 20
fixtures; PDF export đã có UI smoke kiểm tra file tải về và renderer
verification qua Poppler cho đủ 20 fixtures.
Import guard UI đã có E2E trên Chromium, Firefox và WebKit cho file hợp lệ,
malformed JSON và file vượt giới hạn 5 MB.

### Sprint 6: Pages, layers và navigation

Thêm multi-page, page menu/tab, layer visibility/lock/order, outline và find/replace.

Done: document ba trang, bốn layers/trang lưu/mở không mất state; hidden layer không xóa cell.
Trạng thái hiện tại: `tests/e2e/workflow-regression.spec.ts` đã xác nhận recent
documents, pages/layers hidden+locked reload, layer membership, Mermaid/CSV import,
find/replace reload/export và outline navigation cho hình/connector trên
Chromium, Firefox và WebKit. Toolbar page tabs cũng đã được chỉnh để status
không che vùng click ở viewport desktop.

### Sprint 7: Accessibility, i18n và PWA

Thêm focus order, ARIA labels, keyboard help, dark/high contrast, i18n Việt/Anh,
manifest, service worker, offline page và storage recovery.

Done: keyboard-only smoke test qua create -> save -> export; Lighthouse accessibility >= 90.
Trạng thái hiện tại: keyboard smoke đã pass trên Chromium, Firefox và WebKit;
20-node keyboard flowchart smoke đã pass trên Chromium, Firefox và WebKit;
20-node palette drag/drop mouse flowchart smoke cũng đã pass trên Chromium,
Firefox và WebKit;
Lighthouse accessibility gate đã pass ở mức 100; Edge branded smoke đã có
project opt-in và CI step riêng; viewport nhỏ có read-only mode với smoke test;
language/theme persistence smoke đã pass cho Việt/Anh và
light/dark/high-contrast trên Chromium, Firefox và WebKit;
workflow benchmark đã đo import/layout/export thật; dependency audit hiện trả
về 0 vulnerabilities sau khi override dependency Sentry của Lighthouse lên nhánh
OpenTelemetry 2.x; E2E network smoke đã xác nhận app không gọi origin ngoài khi
load mặc định. Default document/page/layer names đã đi qua i18n Việt/Anh, và
workflow regression đã chứng minh export current page/selection chỉ xuất đúng
phạm vi được chọn.

### Sprint 8: Performance, security và beta

Benchmark 100/1.000/5.000 node; LOD/virtualization nếu cần. Hardening JSON/SVG,
CSP, size limits, dependency audit, error boundaries và public beta feedback.

Done: 1.000 node pan/zoom mượt; không có network call mặc định; 10 beta users hoàn thành task cốt lõi.

### Sprint 9: Release v1.0

Đóng regression, viết user/developer/self-host docs, demo gallery, changelog,
SBOM, release tag và rollback plan.

Done: người dùng mới dùng được static build; contributor mới mở được PR đầu tiên.
Trạng thái hiện tại: release package đã có changelog, SBOM script, OSS package
gate cho license/notices/docs links, release checklist, PR/issue templates,
good-first-issues, ADR nền tảng, demo gallery trong app và release-candidate
notes. Full RC gate, Edge smoke, Docker self-host smoke, annotated tag
`v1.0.0`, release packaging, checksum manifest, GitHub release và GitHub Actions
CI/Release package đều đã xanh trên commit phát hành. Phần còn lại để tăng độ
tin cậy cộng đồng là đóng beta/manual feedback trên sơ đồ thật và phát hành
patch nếu phát hiện blocker.

## Backlog theo ưu tiên

| Ưu tiên | Hạng mục |
| --- | --- |
| P0 | document core, history, node/edge, persistence, JSON import/export, a11y cơ bản, tests, CI |
| P1 | arrange, group/swimlane, templates, layouts, SVG/PNG/PDF, pages/layers, PWA, i18n |
| P2 | Mermaid/CSV import, command palette, find/replace, high contrast, performance 5.000 nodes |
| v1.1+ | collaboration, cloud storage, comments, `.drawio` import, plugin API, AI |

## Chỉ số release

| Nhóm | Ngưỡng v1.0 |
| --- | --- |
| Correctness | command/model coverage >= 85%; fixture cho mọi shape/edge |
| Performance | 1.000 node đạt 45+ FPS khi pan/zoom; load file 5 MB dưới 3 giây |
| Reliability | reload không mất draft; import/export có error boundary |
| Accessibility | luồng core dùng bằng keyboard; WCAG AA cho control và text |
| Security | validate/sanitize input, CSP, dependency audit không còn high severity |

## Quyết định cần khóa ngay

1. Browser support: hai phiên bản mới nhất của Chrome, Edge, Firefox và Safari.
2. V1 chỉ local-first, không backend bắt buộc.
3. `.99diagrams.json` là format canonical; không hứa `.drawio` cho v1.
4. Branding, logo và shape assets phải độc lập với draw.io.
5. Một maintainer cuối cùng duyệt schema/architecture; thay đổi lớn dùng ADR công khai.

## Sau v1.0

v1.1 bắt đầu với Yjs collaboration self-hosted, cursor presence và share links.
V2 chỉ xem xét `.drawio` import, plugin API và AI sau khi core v1 đã ổn định.
