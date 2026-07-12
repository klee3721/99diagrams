# Contributing to 99draw

Cảm ơn bạn đã muốn đóng góp. Dự án ưu tiên thay đổi nhỏ, có kiểm thử và dễ review.

## Trước khi bắt đầu

1. Tìm issue hiện có; mở issue mới trước khi làm thay đổi lớn về schema, import,
   collaboration hoặc thư viện dependency.
2. Fork repo và tạo nhánh theo dạng `feature/ten-ngan` hoặc `fix/ten-ngan`.
3. Cài dependency bằng `npm install`.

## Tiêu chuẩn pull request

* Chạy `npm test` và `npm run build` trước khi gửi.
* Giữ UI có thể dùng bằng bàn phím và không chỉ truyền trạng thái qua màu.
* Không thêm telemetry, network call hay dependency nặng nếu chưa thảo luận.
* Mọi thay đổi format `.99draw.json` cần migration, fixture và test round-trip.
* Không đưa logo, stencil hoặc tài sản có giấy phép không rõ ràng vào repo.

## Giấy phép đóng góp

99draw dùng chính sách inbound-equals-outbound: đóng góp được gửi theo cùng
giấy phép MIT của dự án. Dự án không yêu cầu CLA riêng và không yêu cầu DCO
sign-off cho pull request thông thường. Khi gửi PR, bạn xác nhận bạn có quyền
đóng góp thay đổi đó và không đưa vào tài sản, stencil, template, văn bản hoặc
dependency có nguồn gốc/giấy phép không rõ ràng.

Chi tiết quyết định nằm trong
[ADR 0002](docs/adr/0002-inbound-contribution-license.md).

## Báo bug

Nêu phiên bản trình duyệt, các bước tái hiện tối thiểu, kỳ vọng, kết quả thực tế
và file `.99draw.json` đã được ẩn dữ liệu nhạy cảm khi có thể.

## Quy tắc ứng xử

Tham gia dự án đồng nghĩa với việc tuân theo [Code of Conduct](CODE_OF_CONDUCT.md).
