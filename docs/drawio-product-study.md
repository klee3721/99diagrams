# Nghiên cứu tham chiếu draw.io

Ngày khảo sát: 2026-07-11. Nguồn mã được đọc: `jgraph/drawio` 30.3.6, commit
`43c1dfa7db49cca465312c00e9ed8b85b4195a7c`.

## Mục tiêu

99draw là một trình biên tập sơ đồ và whiteboard mã nguồn mở, lấy cảm hứng từ
độ hoàn thiện của draw.io nhưng có thương hiệu, tài sản, kiến trúc và cộng đồng
độc lập. Mục tiêu không phải sao chép giao diện hoặc tài sản của draw.io từng
pixel.

## Điều đã xác minh

* draw.io là editor JavaScript chạy phía khách; lõi là mxGraph với model, view,
  renderer, handlers, layouts và undo manager.
* Repo upstream chứa xấp xỉ 203 nghìn dòng JavaScript chỉ riêng hai lớp editor
  (`js/grapheditor` và `js/diagramly`), ngoài shape, stencil, template và các
  tích hợp lưu trữ. Đây là sản phẩm nhiều năm, không phải một canvas đơn giản.
* Upstream phát hành mã nguồn theo Apache-2.0, nhưng bộ icon, stencil và template
  có điều khoản riêng; không dùng nhãn hiệu hoặc logo draw.io cho 99draw.
* draw.io upstream nói rõ không nhận pull request. 99draw cần governance và
  quy trình đóng góp riêng nếu muốn trở thành dự án cộng đồng.

## Bố cục Classic cần học hỏi

Đây là theme phù hợp làm chuẩn cho 99draw MVP vì nó tối ưu cho tác vụ kỹ thuật
dày đặc thông tin.

```
Menubar: File | Edit | View | Arrange | Extras | Help | trạng thái lưu
Toolbar: undo/redo, zoom, style nhanh, insert, arrange và panel controls
| Shape libraries | Canvas / trang giấy / grid | Format inspector |
Page tabs, nút thêm trang, menu trang và zoom/status ở chân trang
```

Các thông số visual nổi bật trong stylesheet hiện tại của draw.io:

| Thành phần | Quy tắc quan sát được |
| --- | --- |
| Khung editor | CSS grid bốn cột: sidebar, splitter, canvas, format panel |
| Thanh menu / toolbar | 60px / 38px ở Classic; hệ thống font 14px |
| Sidebar / inspector | mặc định gần 232px / 240px, kéo thay đổi được |
| Canvas | nền workspace xám nhạt, trang vẽ trắng, grid và rulers tùy chọn |
| Control | cao 28px, icon 18px, bo góc 6px, hover nền xám nhạt |
| Màu light | panel `#f1f3f4`, canvas `#ececec`, viền `#dadada`, accent xanh |
| Dialog | padding 24px, section bo góc 8px, nội dung cuộn khi quá viewport |

99draw nên tiếp thu tính rõ ràng, mật độ, tính nhất quán của hệ này nhưng dùng
token màu, icon và thương hiệu riêng. MVP chỉ cần một theme desktop Classic,
sau đó mới mở rộng Simple, Minimal và Sketch.

## Các bề mặt chức năng

| Nhóm | Hành vi người dùng cần có |
| --- | --- |
| Vòng đời tài liệu | tạo, mở, recent, đổi tên, autosave, dirty state, lưu cục bộ, tải lên/tải xuống |
| Canvas | pan, zoom, fit, page view, grid, snap, guides, rulers, outline, chọn nhiều, marquee |
| Đối tượng | rectangle, ellipse, diamond, text, image, container/swimlane, group, table, note |
| Shape library | palette theo nhóm, tìm kiếm, drag-drop, template, custom library sau MVP |
| Connector | kéo từ handle, floating/fixed anchor, arrowhead, routing orthogonal/straight/curved, waypoint, label |
| Chỉnh sửa | double-click text, inspector theo selection, style mặc định, copy/paste style, keyboard shortcuts |
| Arrange | align, distribute, front/back, group, lock, resize, rotate, autosize, duplicate, clipboard |
| Tổ chức | pages, layers, tags, metadata, link/tooltip, visibility và lock theo layer |
| Diagrams from text | import Mermaid/CSV trước; SQL, AI và freehand là các giai đoạn sau |
| Layout | flow/tree/organic/radial; cấu hình spacing, direction và animation |
| I/O | `.99draw` native, import/export `.drawio` XML, PNG, SVG, PDF; export selection/page/document |
| Collaboration | share link, presence/cursor, realtime merge, comments và version history là giai đoạn sau |
| Extensibility | shape registry, command registry, importer/exporter, plugin API, configuration flags |

Không đưa toàn bộ danh sách trên vào MVP. Các nhóm được đánh dấu "sau" cần có
điểm mở rộng trong kiến trúc ngay từ đầu, không phải xây UI giả.

## Logic tương tác cốt lõi

### Mô hình tài liệu

```
Document
  pages[]
    layers[]
      cells[] (vertex | edge | group | container)
        geometry, style, label, metadata, z-index
        edge: sourceId, targetId, sourceAnchor, targetAnchor, waypoints[]
```

Cell là cây để group/container hoạt động, nhưng edge được phép tham chiếu cell
ở layer khác. Mỗi mutation phải là một command có thể đảo ngược và được gói vào
transaction: một thao tác kéo nhiều shape chỉ tạo một mục undo.

### Luồng tạo và nối shape

1. Kéo một shape từ palette vào canvas; snap/grid/guides tính vị trí cuối.
2. Tạo `InsertNodeCommand`, chọn cell mới, hiển thị handles và directional
   connection affordances.
3. Kéo connector từ handle hoặc thả shape lên directional affordance để vừa tạo
   shape vừa nối edge.
4. Hit-test xác định target và anchor: floating chọn perimeter gần nhất; fixed
   lưu anchor chuẩn hóa trên biên shape.
5. Router tạo path mặc định. Kéo một segment sẽ thêm/cập nhật waypoint; kéo về
   đường ngắn nhất sẽ xóa waypoint thừa.

### Luồng chọn và format

* Không chọn gì: inspector điều khiển canvas/page (grid, background, paper,
  scale).
* Chọn node: Style, Text, Arrange; thay đổi được áp vào selection trong một
  transaction.
* Chọn edge: thêm routing, marker, line-jump, source/middle/target labels.
* Chọn nhiều kiểu khác nhau: chỉ hiện thuộc tính giao nhau; trạng thái mixed
  phải rõ ràng.

### Undo, persistence và đồng bộ

* Command bus phát model events; undo manager lưu inverse command theo
  transaction; redo bị xóa sau mutation mới.
* Local draft được debounce, nhưng explicit save phải flush ngay và báo trạng
  thái. Không được mất dữ liệu khi tab đóng.
* Collaboration sau này gửi operation/CRDT update, không gửi ảnh canvas. View
  state, selection và con trỏ là presence tạm thời, không nằm trong document.

## Khả năng tương thích tệp

Định dạng `.drawio` là XML: `mxfile` chứa nhiều `diagram`, mỗi diagram là
`mxGraphModel`; cell có id, parent, geometry, style, `vertex` hoặc `edge`.
Nội dung diagram cũng có thể deflate raw + Base64. 99draw nên:

1. Có native schema JSON versioned (`.99draw`) dễ migrate và validate.
2. Import `.drawio` plain/compressed vào normalized model; giữ thuộc tính chưa
   hiểu trong `extensions.drawio` để round-trip tốt hơn.
3. Xuất `.drawio` plain XML trước, rồi bổ sung compressed export để tương thích
   URL và kích thước tệp.
4. Có fixtures từ sơ đồ thật và kiểm thử import -> edit -> export -> import.

## Kiến trúc tham chiếu của draw.io

| Lớp upstream | Bài học cho 99draw |
| --- | --- |
| `mxGraphModel` / `mxCell` | model cây, geometry và changes nguyên tử |
| `mxGraph` / `Graph` | kết hợp model, renderer, selection, interaction và stylesheet |
| handlers | tách hit-test, drag, resize, edge, connection, keyboard, marquee, panning |
| `mxUndoManager` | undo/redo ở mức transaction, không lưu snapshot canvas cho mọi thao tác |
| `EditorUi`, Menus, Toolbar, Sidebar, Format | chrome editor tách khỏi graph engine |
| DrawioFile + storage clients | một interface file thống nhất, adapter theo local/cloud |
| Pages, layouts, routing, plugins | các module tùy chọn; không để làm phình core MVP |

## Giới hạn khảo sát

Đã đọc trang công khai, tài liệu và source. Không thể chạy thao tác trực tiếp
trong app.diagrams.net do kết nối điều khiển Chrome của phiên Codex chưa hoạt
động; mọi luồng tương tác ở trên được đối chiếu với tài liệu chính thức và source,
không phải quan sát thủ công từng pixel.

## Nguồn chính

* [draw.io feature overview](https://www.drawio.com/docs/features/)
* [Menus](https://www.drawio.com/docs/manual/editor/menus/)
* [Panels and dialogs](https://www.drawio.com/docs/manual/editor/panels/)
* [Connectors](https://www.drawio.com/docs/manual/connectors/)
* [draw.io file format and validation](https://www.drawio.com/docs/reference/diagram-generation/)
* [jgraph/drawio README and license](https://github.com/jgraph/drawio)
