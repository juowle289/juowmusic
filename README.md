# Juowle Fav Music Web — bản chuyển sang Vite + React

Bản build lại từ project HTML/CSS/JS thuần sang **Vite + React 19 + React Router**.

## Cài đặt & chạy

```bash
npm install
npm run dev       # chạy dev server
npm run build     # build production vào dist/
```

## Cấu trúc chính

```
src/
  components/   Header, SearchBox, AudioPlayer, Comments, QASection, Loader, SiteFooter...
  hooks/        useHamburger, useEffHeader/useScrollSpy, useLoader, usePageStyles...
  pages/        HomePage, LoginPage, SignupPage, ArtistPage, LyricPage
  data/
    songs.js            danh sách bài hát/nghệ sĩ dùng cho ô tìm kiếm
    lyrics/*.json        nội dung 8 trang lyric (trích tự động từ HTML gốc)
    artists/*.json       nội dung 2 trang nghệ sĩ (trích tự động từ HTML gốc)
public/
  styles/       toàn bộ file .css gốc (common/home/artist/lyrics/register), được
                nạp động theo từng route qua hook usePageStyles — giữ đúng hành vi
                "mỗi trang chỉ load CSS của chính nó" như bản HTML gốc, tránh xung
                đột class trùng tên (#header, .bars,...) giữa các trang.
```

## Asset hosting

Tất cả ảnh, nhạc và video hiện được phục vụ qua URL Vercel Blob.

## Những thay đổi/điều chỉnh so với bản gốc

1. **Trang lyric**: gộp thành 1 component `LyricPage` dùng chung, dữ liệu (lời bài
   hát, About, Q&A, ảnh bìa, audio...) được trích tự động từ 8 file HTML gốc sang
   `src/data/lyrics/*.json` bằng script Python (không gõ tay lại) để đảm bảo không
   sai sót.
2. **Trang nghệ sĩ**: tương tự, nội dung chính (bio, top tracks, fanbase, popular
   songs, albums, recommended) được giữ dưới dạng khối HTML tĩnh trong
   `src/data/artists/*.json`, còn toàn bộ phần tương tác (header, hamburger,
   search, hiệu ứng cuộn, expand "About Song", các nút mũi tên cuộn ngang...) đã
   được viết lại thành React hooks/effects thật.
3. **Sửa 1 lỗi nhỏ trong bản gốc**: widget audio-play ở các trang lyric bị hard-code
   cứng tên bài "Ballroom Extravaganza / DPR IAN" bất kể đang xem bài nào — bản
   React đã sửa để hiển thị đúng bài đang phát.
4. **CSS**: giữ nguyên 100% nội dung CSS gốc, chỉ nạp động theo từng trang (qua thẻ
   `<link>` chèn/gỡ lúc mount/unmount) để mô phỏng đúng hành vi multi-page cũ và
   tránh việc các trang đè CSS lẫn nhau khi chạy chung 1 SPA.
5. **Đăng nhập/Đăng ký**: vẫn dùng `localStorage` để mô phỏng như bản gốc (chưa có
   backend thật).

## Việc có thể làm tiếp (nếu cần)

- Regenerate lại 2 file JSON trong `src/data/artists` thành JSX "xịn" từng phần
  (bio, top tracks, fanbase...) thay vì HTML tĩnh, nếu bạn muốn chỉnh nội dung
  nghệ sĩ thường xuyên qua props/component riêng.
- Kết nối tính năng đăng nhập/đăng ký với backend thật.
