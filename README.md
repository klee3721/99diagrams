# 99 Diagrams

99 Diagrams là flowchart và workflow editor mã nguồn mở, chạy hoàn toàn trong trình
duyệt. Mục tiêu của dự án là một công cụ vẽ đơn giản, local-first và dễ tự host;
không hướng tới sao chép toàn bộ draw.io.

## Hiện có

* Canvas node/edge với pan, zoom, grid và minimap.
* Kéo-thả Start/End, Process, Decision, Input/Output, Document, Database, Note,
  Group, Swimlane và Image.
* Tạo connector từ bốn cạnh của node; chỉnh label, màu, nét, kiểu đường,
  marker, dash, animation và reconnect.
* Di chuyển, resize, nhân bản, xóa, multi-select, context menu, fit selection,
  align/distribute/z-order, group/ungroup, undo/redo.
* Pages, layer ordering/visibility/lock, recent documents, autosave cục bộ và
  import bằng nút mở hoặc kéo file vào canvas.
* Xuất toàn bộ document, trang hiện tại hoặc phần chọn sang `.99diagrams.json`; xuất
  SVG/PNG/PDF và sao chép PNG vào clipboard.
* Command palette, template gallery, Mermaid flowchart import, CSV import,
  demo gallery, outline điều hướng hình/connector, ELK auto-layout qua Web
  Worker với grid fallback cho graph rất lớn, language toggle Việt/Anh cho
  editor chrome, dark mode, high-contrast mode và
  PWA/offline shell.
* Không có tài khoản, backend hoặc telemetry.

## Chạy local

Yêu cầu Node.js 20 trở lên.

```bash
npm install
npm run dev
```

Mở địa chỉ Vite in ra, mặc định là `http://127.0.0.1:5173/`.

Các lệnh hữu ích:

```bash
npm test
npm run build
npm run preview
npm run benchmark
npm run benchmark:browser
npm run benchmark:workflow
npm run rc:full
npm run package:release
```

Tự host bằng static files hoặc Docker: xem
[docs/self-host.md](docs/self-host.md).

Benchmark nền hiện tại: xem [docs/performance.md](docs/performance.md).

Checklist phát hành v1: xem
[docs/release-checklist.md](docs/release-checklist.md). Demo gallery: xem
[docs/demo-gallery.md](docs/demo-gallery.md). Ghi chú release candidate: xem
[docs/release-candidate.md](docs/release-candidate.md). Runbook beta: xem
[docs/beta-feedback.md](docs/beta-feedback.md). Danh sách việc nhỏ cho người
mới đóng góp: xem [docs/good-first-issues.md](docs/good-first-issues.md).
Định dạng Mermaid import: xem [docs/mermaid-import.md](docs/mermaid-import.md).
Định dạng CSV import: xem [docs/csv-import.md](docs/csv-import.md).

## Định dạng tệp

99 Diagrams dùng JSON versioned. Tệp xuất có phần mở rộng đề xuất
`.99diagrams.json`, gồm metadata document, pages, layers, nodes và edges. Parser có
migration registry cho snapshot legacy v1 và document v2. Các thuộc tính UI tạm
thời như trạng thái chọn/kéo không được lưu.

Định dạng này còn ở giai đoạn đầu. Chỉ cam kết tương thích ngược trong cùng
phiên bản 1.x; thay đổi breaking sẽ có migration rõ ràng.

## Kiến trúc

* `src/App.tsx`: editor shell và tích hợp React Flow.
* `src/diagram.ts`: schema, factory, clone/sanitize và parser tài liệu.
* `src/demoGallery.ts`: demo gallery tự tạo cho beta/manual smoke.
* `src/diagram.test.ts`: test model và tệp.
* `src/styles.css`: hệ giao diện Classic cho MVP.

Quyết định kiến trúc nền tảng được ghi trong
[docs/adr/0001-local-first-react-flow.md](docs/adr/0001-local-first-react-flow.md).
Chính sách giấy phép đóng góp nằm trong
[docs/adr/0002-inbound-contribution-license.md](docs/adr/0002-inbound-contribution-license.md).

99 Diagrams dựa trên [React Flow](https://reactflow.dev/) (MIT). Tất cả icon hiện
dùng từ Lucide (ISC); xem [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) trước
khi phân phối bundle.

## Đóng góp

Đọc [CONTRIBUTING.md](CONTRIBUTING.md) trước khi mở issue hoặc pull request.
Ưu tiên issue có reproduction nhỏ, screenshot và kỳ vọng rõ ràng. Những thay
đổi lớn về schema hoặc interaction cần issue thảo luận trước.

## Bảo mật và giấy phép

Xem [SECURITY.md](SECURITY.md) để báo lỗ hổng riêng tư. Mã nguồn 99 Diagrams được
phát hành theo [GNU GPLv3](LICENSE).
