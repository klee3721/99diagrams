# Plan hoàn thiện 99 Diagrams v1.0

Tài liệu này là bản kế hoạch hành động cuối cùng để đưa 99 Diagrams từ release
candidate hiện tại thành một bản v1.0 đủ tin cậy cho cộng đồng dùng, tự host và
đóng góp.

## Mục tiêu bản hoàn chỉnh

99 Diagrams v1.0 là trình vẽ flowchart/workflow mã nguồn mở, local-first, chạy được
như static web app/PWA, không cần tài khoản và không gửi nội dung sơ đồ ra mạng
mặc định.

V1.0 không cố sao chép toàn bộ draw.io. Các phần như realtime collaboration,
cloud storage, plugin marketplace, AI generation và tương thích `.drawio` đầy đủ
được đưa sang v1.1+ sau khi lõi editor ổn định.

## Trạng thái hiện tại

Đã có nền tảng đủ mạnh cho release candidate:

- Canvas React Flow với node, edge, pan/zoom, grid, minimap, selection và layout.
- Shape v1 gồm flowchart nodes, group, swimlane, image/note và edge variants.
- Undo/redo, command palette, template/demo gallery, Mermaid/CSV import,
  find/replace.
- Pages/layers, layer visibility/lock/order, outline navigation, local autosave
  và recent documents.
- Export JSON/SVG/PNG/PDF, copy image, export theo full document/current page/selection.
- i18n Việt/Anh, light/dark/high-contrast, responsive read-only fallback.
- PWA, Docker/static self-host docs, CSP sample, SBOM script và release checklist.
- Test gate đã có unit, Playwright đa trình duyệt, export snapshots, Lighthouse,
  audit, benchmark, workflow benchmark và network smoke.

Phần còn thiếu trước khi gọi v1.0 là hoàn chỉnh theo nghĩa cộng đồng chủ yếu là
đóng bằng chứng người dùng thật:

- Thực hiện beta/manual smoke với người dùng hoặc bộ sơ đồ thật.
- Sửa mọi blocker/data-loss bug phát hiện trong beta hoặc RC gate.
- Nếu phát hiện blocker sau public release, phát hành patch `v1.0.x` với SBOM,
  checksum và release notes cập nhật.

Cập nhật 11/07/2026: nhóm P0 workflow regression đã có Playwright coverage qua
`tests/e2e/workflow-regression.spec.ts` cho recent documents, pages/layers
reload, hidden/locked layer, layer membership, find/replace reload/export,
localized default document/page/layer names và export scope current
page/selection trên Chromium, Firefox và WebKit. Outline navigation cho hình và
connector cũng đã có coverage trong cùng file. Trong lúc thêm gate này,
regression toolbar status che page tabs đã được sửa ở CSS.

Cập nhật 12/07/2026: `npm run rc:local` đã pass trên máy hiện tại sau thay đổi
in-app Mermaid/CSV import dialog. Gate này bao gồm unit tests, production build,
static self-host smoke, self-host config validation, Playwright E2E đa trình
duyệt, Lighthouse accessibility 100, dependency audit 0 vulnerabilities, SBOM
validity, OSS package readiness, model benchmark và workflow benchmark.

Cập nhật demo smoke 12/07/2026: `tests/e2e/demo-gallery.spec.ts` đã mở, chỉnh
sửa và export cả bốn demo chính trên Chromium, Firefox và WebKit.
`tests/e2e/beta-smoke.spec.ts` cũng đã tự động hóa phần machine-checkable của
beta runbook trên Chromium: mở demo, thêm/nối node, sửa nhãn node/connector,
undo/redo, reload, export visual/JSON, import lại JSON và đổi theme/ngôn ngữ.

Cập nhật full RC 12/07/2026: đã pass `npm run rc:full` trên máy hiện tại. Gate
này bao gồm `rc:local`, browser benchmark, Microsoft Edge branded smoke và
Docker self-host smoke.

Cập nhật release package 12/07/2026: package metadata và lockfile đã nâng lên
`1.0.0`, badge trong app hiển thị `v1.0`, changelog/release notes/checklist đã
chốt cho ngày release, `docs/performance.md` đã cập nhật baseline mới nhất và
SBOM CycloneDX đã được sinh lại cho `99-diagrams@1.0.0` với 536 components.

Cập nhật GitHub release automation 12/07/2026: đã thêm release workflow cho
tag `v*` để build, smoke, package artifact và upload bundle `release/`; đồng
thời thêm issue template `beta_feedback.yml` để thu beta/manual feedback đúng
severity cho giai đoạn public beta/manual sau release.

Cập nhật static self-host 12/07/2026: `npm run test:static` đã pass, xác nhận
production preview phục vụ app shell, PWA manifest, service worker, asset links,
SPA fallback route, same-origin asset requests và storage backend.
`npm run test:self-host` cũng đã pass, xác nhận Nginx CSP, SPA fallback, cache
headers và Dockerfile wiring.

## Definition of Done cho v1.0

Chỉ gọi là hoàn chỉnh khi tất cả điều kiện sau đều đạt:

| Nhóm | Điều kiện bắt buộc |
| --- | --- |
| Core editor | Tạo, sửa, nối, duplicate, delete, undo/redo sơ đồ 20 node bằng chuột và bàn phím |
| File safety | Reload/autosave/import/export không mất dữ liệu; file sai hoặc >5 MB bị từ chối an toàn |
| Export | JSON/SVG/PNG/PDF mở được và có snapshot/render verification cho fixture chính |
| Product UX | Việt/Anh, theme sáng/tối/tương phản cao, keyboard flow và focus state hoạt động |
| Security | Không gọi mạng ngoài mặc định, input được validate/sanitize, audit không có high severity |
| Performance | Benchmark 1.000 node đạt ngưỡng công bố hoặc giới hạn được ghi rõ |
| Self-host | Static build và Docker image chạy được, PWA metadata và CSP không phá app |
| OSS | README, CONTRIBUTING, SECURITY, ADR, changelog, good first issues, SBOM và release notes sẵn sàng |

## Plan thực hiện còn lại

### Giai đoạn 1 — Audit scope và test coverage

Mục tiêu: biết chính xác còn lỗ hổng nào trước release.

- Đối chiếu `docs/v1-completion-plan.md`, `docs/v1-execution-plan.md` và code
  hiện tại.
- Liệt kê các workflow chưa có E2E trực tiếp, ưu tiên:
  - recent documents mở lại tài liệu;
  - pages/layers lưu, ẩn, khóa và reload;
  - find/replace;
  - export theo selection/current page;
  - container group/swimlane edge cases.
- Với mỗi gap, chọn một trong hai hướng: viết test tự động hoặc ghi vào manual
  smoke nếu không tự động hóa đáng tiền.

Kết quả cần có: danh sách gap P0/P1/P2 và test/manual owner rõ ràng.

### Giai đoạn 2 — Đóng P0 regression tests

Mục tiêu: mọi thao tác có nguy cơ mất dữ liệu đều có bằng chứng.

- Đã thêm Playwright E2E cho recent documents.
- Đã thêm Playwright E2E cho pages/layers: tạo nhiều page, khóa/ẩn layer, reload
  và xác nhận state không mất.
- Đã thêm Playwright E2E cho find/replace reload/export.
- Đã thêm Playwright E2E cho export scope current page/selection qua command
  palette và xác nhận JSON tải về chỉ chứa đúng phạm vi.
- Chạy lại unit, build và targeted E2E sau từng nhóm thay đổi.

Kết quả cần có: toàn bộ P0 workflow pass trên Chromium, Firefox và WebKit.

### Giai đoạn 3 — Full local RC gate

Mục tiêu: chứng minh máy dev sạch có thể build/test release candidate.

Trạng thái 12/07/2026: đã pass `npm run rc:local` trên máy hiện tại. Sau đó đã
thêm `npm run test:static` vào local gate để kiểm tra static self-host surface.

Chạy:

```bash
npm ci
npm run rc:local
npm run benchmark:browser
npm run --silent sbom > 99-diagrams-sbom.cdx.json
```

Nếu lỗi:

- Phân loại blocker, regression, flaky test hoặc environment issue.
- Sửa blocker/regression trước.
- Chỉ cập nhật snapshot/baseline khi đã kiểm tra bằng mắt và có lý do rõ ràng.

Kết quả cần có: `rc:local`, browser benchmark và SBOM artifact đều pass.

### Giai đoạn 4 — Full external gate: Edge và Docker

Mục tiêu: xác nhận bản v1 không chỉ chạy trên môi trường dev hiện tại.

Chạy trên máy có Microsoft Edge và Docker:

```bash
npm run test:e2e:edge
npm run test:docker
```

Hoặc chạy một lần toàn bộ:

```bash
npm run rc:full
```

Kết quả cần có:

- Edge branded smoke pass.
- Docker image build được, serve static app được và PWA metadata hợp lệ.

Trạng thái 12/07/2026: đã pass qua `npm run rc:full`.

### Giai đoạn 5 — Beta/manual smoke với sơ đồ thật

Mục tiêu: bắt lỗi sản phẩm mà test tự động dễ bỏ sót.

Dùng bốn demo chính:

- product flow;
- release checklist;
- architecture map;
- bug triage swimlane.

Checklist beta:

- Mở từng demo, chỉnh text, thêm node, nối edge, undo/redo.
- Automated demo gallery smoke đã xác nhận bốn demo mở, chỉnh sửa và export
  được; beta/manual còn cần kiểm tra layout bằng mắt và thao tác tự do.
- Tạo group/swimlane, kéo node vào/ra, reload lại.
- Đổi Việt/Anh và các theme.
- Export JSON/SVG/PNG/PDF rồi mở file xuất ra bằng app/viewer ngoài.
- Ghi lại mọi lỗi theo severity trong `docs/beta-feedback.md`.

Kết quả cần có: không còn blocker hoặc data-loss bug trước release.

### Giai đoạn 6 — Release polish và tài liệu cuối

Mục tiêu: người ngoài clone, chạy, hiểu giới hạn và đóng góp được.

- Cập nhật `CHANGELOG.md` với ngày release, tính năng chính và known limitations.
- Cập nhật `docs/performance.md` nếu benchmark mới lệch đáng kể.
- Cập nhật `docs/release-candidate.md` và `docs/release-notes-v1.0.0.md`.
- Sinh SBOM CycloneDX cho release.
- Chạy `npm run test:oss` để xác nhận license, community docs, link nội bộ và
  third-party notices cho runtime dependencies.
- Kiểm tra ADR 0002 và PR template để bảo đảm chính sách inbound contribution
  license rõ ràng trước khi nhận PR cộng đồng.
- Kiểm tra README quickstart, self-host guide, rollback và security policy.
- Đảm bảo không có asset, logo, stencil hoặc template lấy từ draw.io.

Kết quả cần có: release package đầy đủ, không còn TODO mơ hồ trong docs release.

### Giai đoạn 7 — Tag v1.0.0

Mục tiêu: xuất bản bản hoàn chỉnh có thể rollback.

- Set version package/release thành `1.0.0`. Trạng thái: package metadata đã
  được nâng lên `1.0.0`.
- Build từ checkout sạch.
- Attach SBOM và release notes.
- Ghi known limitations rõ ràng.
- Tag `v1.0.0`. Trạng thái: annotated tag đã được push lên remote và release
  workflow đã upload artifacts thành công trên GitHub Actions.
- Nếu deploy production/static demo thì giữ lại artifact hoặc Docker image cũ để rollback.

Kết quả cần có: GitHub release `v1.0.0` có changelog, SBOM, self-host guide và
rollback path.

## Ưu tiên thực hiện ngay

| Ưu tiên | Việc nên làm trước | Lý do |
| --- | --- | --- |
| Done | E2E recent documents | File workflow là lõi local-first |
| Done | E2E pages/layers reload | Dễ gây mất state nếu regression |
| Done | Full `rc:local` | Local release-candidate gate đã pass |
| Done | Edge + Docker gate | Full `rc:full` đã pass trên máy hiện tại |
| P1 | Human beta/manual smoke bốn demo | Automated beta smoke đã pass; vẫn cần UX/manual thật |
| Done | Changelog/SBOM/release notes | Package release đã chốt; còn attach khi tạo GitHub release |
| P2 | Polish UI nhỏ, copy, tooltip | Làm sau khi không còn bug mất dữ liệu |

## Nguyên tắc không mở rộng scope

- Không thêm collaboration trước v1.0.
- Không thêm backend/cloud account trước v1.0.
- Không hứa `.drawio` compatibility trước v1.0.
- Không thêm plugin runtime trước v1.0.
- Không thêm shape/stencil phức tạp nếu chưa có fixture và test.
- Không release nếu còn lỗi mất dữ liệu, import độc hại vào renderer hoặc export
  file hỏng.

## Lệnh kiểm tra chuẩn trước release

```bash
npm ci
npm run rc:full
npm run --silent sbom > 99-diagrams-sbom.cdx.json
npm run package:release
```

Trạng thái hiện tại: automated full RC gate đã pass, package release artifact đã
sẵn sàng, annotated tag `v1.0.0` đã được publish, GitHub release công khai đã có
đủ asset/SBOM/checksum và GitHub Actions CI/Release package đều xanh trên commit
phát hành. Việc còn lại là human beta/manual smoke để bắt lỗi UX/data-loss/export
mà automation khó nhìn thấy; nếu có blocker thì phát hành patch `v1.0.x`.
