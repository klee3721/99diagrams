# Security policy

Không báo lỗ hổng bảo mật nhạy cảm qua issue công khai. Hãy liên hệ riêng với
maintainers của repository, mô tả tác động, các bước tái hiện tối thiểu và bản
vá/biện pháp giảm thiểu nếu có.

Phạm vi quan tâm đặc biệt gồm parser tệp, import/export SVG/JSON, XSS trong nhãn
hoặc URL, dependency supply-chain và bất kỳ dữ liệu nào rời trình duyệt ngoài ý
muốn của người dùng.

Static self-host mặc định nên dùng CSP tương đương `nginx.conf`: `connect-src`
giới hạn ở `'self'`, `object-src 'none'`, `frame-ancestors 'none'`, và chỉ cho
ảnh `self`, `data:` hoặc `blob:`. Xem [docs/self-host.md](docs/self-host.md).

99 Diagrams đang ở trạng thái beta; chỉ nhánh `main` được hỗ trợ.
