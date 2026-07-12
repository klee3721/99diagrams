# Kế hoạch hoàn thiện 99draw v1.0

## Mục tiêu đã khóa

99draw v1.0 là trình vẽ flowchart/workflow mã nguồn mở, local-first và tự host
được. Đây **không** là bản sao hay cam kết tương thích hoàn toàn với draw.io.
V1 chỉ cần giúp một người dùng tạo, lưu, mở và xuất sơ đồ tin cậy trên desktop.

## Điểm xuất phát (11/07/2026)

Đã có một web editor chạy được: canvas React Flow, 9 shape, connector, undo/redo,
clipboard nội bộ, layer/trang, local persistence, 12 templates, Mermaid
flowchart, CSV import, auto-layout, export JSON/SVG/PNG/PDF, PWA và bộ tài liệu
OSS cơ bản. Unit test và production build hiện qua.

Các phần chưa đủ để gọi là v1 hoàn chỉnh: interaction edge đầy đủ, group/swimlane
đúng ngữ nghĩa, i18n Việt/Anh, kiểm thử UI/a11y/export trực quan, benchmark,
hardening/release artifacts và self-host guide có thể triển khai được.

Cập nhật 11/07/2026: M1 interaction core đã có context menu, edge inspector mở
rộng, reconnect, marker/dash/animation, copy image và fit selection; test/build
đều qua. M2/M3 đã có image node an toàn, group/swimlane semantics cơ bản,
swimlane lane editor, parent validation, container delete xóa descendants và
edge liên quan, auto reparent/detach node thường theo hình học group/swimlane,
lane membership derived từ vị trí node con trong swimlane và hiển thị trong
inspector, layer ordering, shape/edge round-trip fixtures,
drop-to-open, export current page/selection/full document và migration
registry. M3 đã có bộ 20 export fixtures deterministic phủ mọi node kind và
edge variants chính. M3/M5/M6 đã có SVG sanitizer, deterministic SVG model
exporter, PNG/PDF export dùng cùng nguồn SVG model, 20 SVG golden snapshots và
20 Chromium PNG visual snapshots từ export fixtures, self-host Docker/Nginx,
CSP mẫu và CI chạy test/build/audit. Chưa đóng M2/M3 chỉ ở mức muốn có PDF
golden pixel-perfect; semantics reparent container lồng nhau nâng cao để sau v1
nếu cộng đồng cần.

Cập nhật M2/M3: đã bổ sung container reparent reconciliation ở tầng model cho
node thường khi kéo vào/ra group hoặc swimlane. Helper giữ absolute position khi
detach, chọn container nhỏ nhất khi node nằm trong nhiều container lồng nhau và
được App dùng sau `applyNodeChanges`; unit/e2e test đã xác nhận không phá import
hoặc thao tác editor chính. Unit test cũng đã phủ case kéo node từ group này
sang group khác và kéo node từ nested group trở lại parent swimlane mà không mất
vị trí tuyệt đối.

Cập nhật M3: đã bổ sung PDF renderer verification cho 20 export fixtures. Test
e2e tạo PDF từ cùng nguồn SVG deterministic, chạy `pdfinfo`, render trang đầu
bằng Poppler `pdftoppm` sang PNG và kiểm tra trang render không hỏng/trắng với
fixture có nội dung. CI cài `poppler-utils` trước khi chạy Playwright để gate
này không phụ thuộc máy local.

Cập nhật M4/M5: đã có translation registry Việt/Anh, language toggle lưu trong
trình duyệt, `html.lang` theo ngôn ngữ chọn và ARIA label cho toolbar/layer icon
controls chính. Các workflow chính trong app gồm prompt, alert, status message,
context menu, template gallery, shortcut dialog, find/replace, recent dialog và
template-generated node labels đã đi qua i18n có interpolation. Playwright
smoke test đã chạy trên Chromium, Firefox và WebKit cho luồng tạo sơ đồ trống từ
template, thêm node bằng command palette, connect các node đã chọn,
autosave/reload, export JSON/SVG/PNG/PDF qua UI và kiểm tra chữ ký file tải về.
Đã có smoke riêng `tests/e2e/keyboard-flow.spec.ts` tạo flowchart 20 node bằng
command palette, connect 19 edge, reload và export JSON trên Chromium, Firefox
và WebKit. Đã có thêm `tests/e2e/mouse-flow.spec.ts` tạo 20 node bằng palette
drag/drop chuột, connect 19 edge, reload và export JSON trên cùng ba browser.
`tests/e2e/import-guard.spec.ts` xác nhận import `.99draw.json` hợp lệ, JSON sai
bị từ chối và file lớn hơn 5 MB không thay thế document hiện tại trên Chromium,
Firefox và WebKit. `tests/e2e/preferences.spec.ts` xác nhận chuyển Việt/Anh,
light/dark/high-contrast và persistence sau reload trên Chromium, Firefox và
WebKit.
`tests/e2e/workflow-regression.spec.ts` xác nhận recent documents mở lại đúng
tài liệu autosaved, pages/layers lưu qua reload với hidden/locked layer và layer
membership, find/replace lưu qua reload/export và outline navigation cho
hình/connector trên Chromium, Firefox và WebKit. Mermaid import qua dialog và
CSV import từ header `id,label,kind,next` cũng đã có unit/workflow regression
smoke. Test này
cũng phát hiện và đã đóng regression toolbar status che page tabs ở viewport
desktop mặc định.
ELK auto-layout đã chạy qua Web Worker asset của `elkjs`; nếu ELK lỗi trên graph
rất lớn thì app fallback sang grid layout có kiểm soát. Đã có benchmark CLI cho
thao tác model/file, benchmark browser Chromium cho render/pan/zoom/select và
workflow benchmark cho import/layout/export ở 200/1.000/5.000 node, cùng baseline trong
`docs/performance.md`. Lighthouse Accessibility gate đã được thêm vào CI với
ngưỡng >=90 và hiện đạt 100. Đã thêm Edge branded smoke dạng project opt-in
`PLAYWRIGHT_EDGE=1` và CI cài/chạy Microsoft Edge cho `editor-smoke`. E2E đã có
network smoke xác nhận load mặc định không gọi origin ngoài app. Dependency
audit hiện trả về 0 vulnerabilities nhờ override có phạm vi cho dependency
Sentry của Lighthouse lên nhánh OpenTelemetry 2.x; automated beta smoke đã phủ
bốn demo chính. Public technical release `v1.0.0` đã được publish trên GitHub
với CI và Release package xanh; khoảng trống còn lại là human beta/manual
feedback từ người dùng thật, nếu muốn chốt 100% theo nghĩa cộng đồng. Responsive
fallback đã có chế độ read-only rõ ràng cho viewport nhỏ, tắt sửa/kéo/nối/xóa
trên canvas và có Playwright smoke test.

Cập nhật P0 workflow regression: `tests/e2e/workflow-regression.spec.ts` đã
phủ recent documents, pages/layers reload, hidden/locked layer state, layer
membership, find/replace reload/export, localized default document/page/layer
names, export scope current page/selection và outline navigation cho
hình/connector, cùng Mermaid/CSV import qua command palette. Bộ targeted này pass trên
Chromium, Firefox và WebKit.

Cập nhật local RC 12/07/2026: `npm run rc:local` đã pass, gồm unit, production
build, Playwright E2E, Lighthouse accessibility 100, audit 0 vulnerabilities,
SBOM validity, OSS package readiness, model benchmark và workflow benchmark.
`tests/e2e/demo-gallery.spec.ts` cũng đã mở, chỉnh sửa và export cả bốn demo
chính trên Chromium, Firefox và WebKit.
`npm run test:static` đã được thêm để smoke production preview/static self-host
surface: app shell, PWA manifest, service worker, asset links, SPA fallback,
same-origin requests và storage backend. `npm run test:self-host` kiểm tra
Nginx CSP, SPA fallback, cache headers và Dockerfile wiring.

Cập nhật M6: đã có demo gallery trong app với bốn sơ đồ gốc của dự án
(product flow, release checklist, architecture map và bug triage swimlane),
đều có copy Việt/Anh và test round-trip qua parser document v2. Release package
đã có ADR nền tảng, demo gallery docs và release-candidate notes để chuẩn bị
beta/manual smoke. Đã thêm `docs/beta-feedback.md` làm runbook cho 10 beta
participants, severity và task theo từng demo. CI đã có Docker self-host smoke
qua `npm run test:docker`. OSS package gate `npm run test:oss` đã kiểm tra
license, community docs, local docs links và third-party notices cho runtime
dependencies. ADR 0002 đã chốt inbound-equals-outbound MIT, không yêu cầu CLA
hoặc DCO sign-off cho PR thông thường, và PR template đã có checkbox quyền đóng
góp/provenance.

## Definition of done

Chỉ phát hành v1.0 khi tất cả điều kiện sau đều đúng:

- Tạo flowchart 20 node bằng chuột **và** bàn phím; lưu/reload/import/export không mất dữ liệu. Đường keyboard và palette drag/drop bằng chuột đã có E2E tự động.
- Mọi shape và edge trong bảng phạm vi có fixture round-trip và test.
- Keyboard-only smoke test `create → connect → save → reopen → export` qua trên Chrome, Firefox, Safari và Edge hiện hành.
- Không có network request mặc định; import bị giới hạn 5 MB và dữ liệu không hợp lệ không vào renderer.
- 1.000 node đạt mục tiêu tương tác đã công bố, hoặc giới hạn được ghi rõ trong README.
- CI bắt buộc test, typecheck/build, dependency audit; static build có hướng dẫn self-host và checklist phát hành.

## Plan đóng v1 từ trạng thái hiện tại

Thứ tự dưới đây là plan thực thi để biến bản hiện có thành một bản v1 hoàn
chỉnh. Mỗi chặng phải có bằng chứng nghiệm thu trước khi chuyển sang chặng tiếp
theo; không đánh dấu hoàn thành chỉ vì giao diện “có vẻ chạy”.

### Chặng 0 — Khóa phạm vi release

Mục tiêu: tránh mở rộng vô hạn theo draw.io.

- Khóa phạm vi v1 là flowchart/workflow editor local-first, không có realtime
  collaboration, cloud account, plugin runtime, `.drawio` compatibility hay
  stencil marketplace.
- Chốt danh sách node/edge chính thức của v1 và đảm bảo mọi shape đều có
  fixture round-trip.
- Viết release checklist một trang: cách build, test, self-host, rollback và
  tiêu chí chặn release.

Nghiệm thu: tài liệu release scope rõ ràng; issue ngoài phạm vi được đưa sang
v1.1+ thay vì chen vào v1.

### Chặng 1 — Hoàn thiện trải nghiệm editor lõi

Mục tiêu: người dùng có thể tạo sơ đồ thật mà không gặp thao tác cụt.

- Hoàn thiện các thao tác node/edge: keyboard create/connect/delete/duplicate,
  context menu, reconnect, edge type, arrow marker, dashed/animated line và fit
  selection.
- Siết group/swimlane: lane membership, parent validation, không tạo edge hoặc
  node mồ côi khi move/resize/delete.
- Chuẩn hóa command/undo/redo cho mọi mutation chính.
- Bổ sung test model cho các case delete/group/swimlane/reconnect.

Nghiệm thu: tạo flowchart 20 node bằng chuột và bằng bàn phím; undo/redo không
làm mất edge; reload vẫn giữ đúng sơ đồ.

### Chặng 2 — Hoàn thiện file, import/export và golden output

Mục tiêu: file `.99draw.json` đáng tin và output mở được ở nơi khác.

- Hoàn thiện open/save/drop-to-open/recent documents, giới hạn import 5 MB và
  error path thân thiện.
- Giữ export JSON/SVG/PNG/PDF theo scope: selection, current page và full
  document.
- Tạo golden fixtures cho SVG/PNG/PDF từ bộ 20 export fixtures hiện có; SVG đã
  có golden snapshot deterministic, PNG đã có Chromium visual snapshot đủ 20
  fixtures, PDF đã có UI smoke và renderer verification qua Poppler cho đủ 20
  fixtures.
- Thêm visual hoặc snapshot checks để phát hiện export lệch layout, thiếu font,
  thiếu marker hoặc sai màu.
- Mở rộng malformed corpus cho JSON/SVG/image data URL.

Nghiệm thu: round-trip JSON ổn định; SVG/PNG/PDF từ fixture mở đúng trên browser
và PDF viewer phổ biến; dữ liệu độc hại không vào renderer.

### Chặng 3 — Product readiness: i18n, accessibility và responsive

Mục tiêu: app dùng được như sản phẩm công khai, không chỉ là prototype.

- Hoàn tất i18n Việt/Anh cho toàn bộ toolbar, inspector, dialog, prompt, alert,
  status message, template/recent/shortcut/find-replace UI.
- Thêm interpolation cho message có biến như tên file, số lượng node và format
  export.
- Chạy keyboard-only smoke test bằng Playwright cho luồng `create → connect →
  save → reopen → export`.
- Chạy Lighthouse Accessibility và sửa focus order, ARIA label, contrast,
  focus-visible, trạng thái disabled.
- Kiểm tra responsive ở desktop nhỏ/tablet; nếu mobile chưa edit tốt thì cung
  cấp chế độ read-only rõ ràng. Đã có small-screen read-only mode.

Nghiệm thu: Lighthouse Accessibility >= 90; luồng keyboard-only pass; chuyển
ngôn ngữ không còn text hard-code trong các workflow chính.

### Chặng 4 — Performance và hardening bảo mật

Mục tiêu: công bố giới hạn hiệu năng có bằng chứng, không đoán mò.

- Giữ benchmark CLI cho 100/1.000/5.000 node, browser benchmark cho render,
  pan, zoom, select và workflow benchmark cho import/layout/export.
- Đặt performance budget: thời gian mở file, thời gian autosave, FPS pan/zoom và
  kích thước bundle.
- Đảm bảo ELK layout chạy trong Web Worker, có timeout/fallback khi layout lỗi.
- Bổ sung CSP self-host, dependency audit, sanitizer regression và error
  boundary paths.
- Nếu 1.000 node không đạt 45+ FPS, ghi rõ giới hạn trong README thay vì hứa quá
  sức.

Nghiệm thu: có `docs/performance.md` cập nhật từ benchmark thật; CI chặn high
severity audit; app không gửi network request mặc định, được kiểm bằng
`tests/e2e/network.spec.ts`.

### Chặng 5 — OSS release package

Mục tiêu: người khác clone, chạy, đóng góp và tự host được.

- Hoàn thiện README quickstart, architecture notes, CONTRIBUTING,
  CODE_OF_CONDUCT, SECURITY, CHANGELOG và ADR nền tảng.
- Thêm SBOM, license/asset manifest và checklist phát hành.
- Hoàn thiện Docker/static self-host guide, Nginx CSP mẫu và rollback path.
- Tạo demo gallery bằng fixture/tự tạo, không dùng asset hoặc stencil của
  draw.io. Đã có in-app demo gallery với test round-trip.
- Tạo issue templates, PR template và danh sách `good first issue` thật sự nhỏ.

Nghiệm thu: người mới clone → install → test → build → self-host trong dưới 10
phút; release tag có changelog, SBOM và hướng dẫn rollback.

### Chặng 6 — Release candidate và beta feedback

Mục tiêu: kiểm tra bản gần phát hành bằng người dùng thật.

- Đóng feature freeze cho v1.0, chỉ nhận bugfix/documentation.
- Chạy full gate: test, build, audit, benchmark, Playwright, Lighthouse,
  export-golden, Docker smoke.
- Mở beta nhỏ với một số sơ đồ thật: flowchart sản phẩm, checklist release,
  architecture diagram và swimlane process.
- Ghi lại bug/regression theo severity; chỉ release khi không còn blocker hoặc
  data-loss bug.

Nghiệm thu: tạo GitHub release `v1.0.0` kèm known limitations rõ ràng và không
có lỗi mất dữ liệu đã biết.

## Thứ tự code ngay tiếp theo

Nếu tiếp tục code từ trạng thái hiện tại, thứ tự ưu tiên nên là:

1. Chạy beta/manual feedback trên bốn demo thật hoặc sơ đồ thực tế.
2. Xử lý regression/blocker nếu beta/manual feedback phát hiện, rồi phát hành
   patch `v1.0.x` nếu cần.

## Lộ trình còn lại

| Mốc | Nội dung giao | Nghiệm thu |
| --- | --- | --- |
| M1 — Interaction core | Context menu; multi-select rõ ràng; edge type/marker/dash/animation; reconnect; fit selection; rename tài liệu; tooltips/disabled state | Không có edge mồ côi sau move/resize/group; tất cả thao tác lõi có shortcut hoặc đường keyboard |
| M2 — Diagram semantics | Shape registry có fixture; image node; group chứa node đúng; swimlane có lane/header; layer ordering; selection/current-page/full-document export | Flowchart, basic UML activity và architecture diagram cùng thao tác/lưu được |
| M3 — File & output quality | Migration registry; drop-to-open; export scope; copy image; SVG sanitizer; 20 golden export fixtures | Round-trip JSON; SVG/PNG/PDF mở đúng trên browser/PDF viewer phổ biến |
| M4 — Product readiness | Việt/Anh; shortcut help; focus/ARIA audit; dark/high-contrast; offline/recovery; responsive read-only | Lighthouse Accessibility >=90 và keyboard-only smoke test qua |
| M5 — Performance & security | Benchmark 100/1.000/5.000 node; Web Worker ELK; load budget; CSP; dependency audit; malformed corpus; error paths | Đạt 45+ FPS pan/zoom ở 1.000 node hoặc công bố giới hạn có bằng chứng |
| M6 — OSS release | Docker/static self-host; demo gallery; architecture/ADR; changelog; SBOM; release/rollback checklist; issue triage | Người mới clone, test, build, self-host và mở PR đầu tiên dưới 10 phút |

## Thứ tự thực hiện

1. Hoàn thiện M1 trước: đây là các thao tác người dùng chạm nhiều nhất và quyết định model có ổn định hay không.
2. Làm M2 và M3 ngay sau đó, dùng fixture chung để tránh export/model bị lệch.
3. Thực hiện M4 cùng M3: mọi control mới phải có text tiếng Việt/Anh, nhãn ARIA và shortcut ngay từ lúc thêm vào.
4. M5 chỉ đo sau khi interaction/model ổn định; tối ưu dựa vào benchmark, không tối ưu đoán mò.
5. M6 là release gate, không phải việc để sau khi đã gắn tag.

## Phân chia sprint đề xuất

Mỗi sprint tương đương hai tuần cho một developer toàn thời gian.

| Sprint | Mốc | Kết quả cụ thể |
| --- | --- | --- |
| 1 | M1 | Context menu, edge inspector hoàn chỉnh, reconnect, keyboard coverage, document rename |
| 2 | M2 | Image/group/swimlane semantics, arrange đầy đủ, fixture cho shape/edge |
| 3 | M3 | Import/drop/migration, export scopes, copy image, golden-file/export tests |
| 4 | M4 | i18n, focus/ARIA, contrast, offline/recovery, Playwright keyboard smoke |
| 5 | M5 | Benchmarks, Web Worker layout, CSP/audit/sanitization, error/recovery tests |
| 6 | M6 | Docker, demo/docs, SBOM, release candidate, beta feedback và regression closure |

## Ngoài phạm vi v1.0

Không mở rộng phạm vi trong lúc thực hiện: realtime collaboration, cloud accounts,
comments, AI generation, marketplace/plugin API, `.drawio`/VSDX/Lucidchart
compatibility và router tránh va chạm nâng cao. Những việc này thuộc v1.1+.

## Quy tắc triển khai

- Format canonical là `.99draw.json`; UI adapter không quyết định schema file.
- Mỗi thay đổi state đi qua command/transaction, có undo/redo và test inverse.
- Mỗi tính năng mới bổ sung fixture, test và đường thao tác bàn phím cùng lúc.
- Không sao chép brand, template hoặc stencil của draw.io.
- Không gắn nhãn “complete” cho mốc nếu chưa có bằng chứng nghiệm thu tương ứng.
