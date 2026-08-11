# JuowMusic

Web nghe nhạc/lyric cá nhân — build lại từ project HTML/CSS/JS thuần sang **Vite + React 19 + React Router 7**, có Firebase Auth thật, audio engine tự viết (crossfade/gapless + chuẩn hoá âm lượng), và tính năng nghe nhạc chung real-time.

## Cài đặt & chạy

```bash
npm install
npm run dev       # dev server
npm run build     # build production vào dist/
npm run preview   # xem thử bản build
```

## Stack

- **Frontend**: Vite, React 19, React Router 7, Tailwind v4, Zustand
- **Auth**: Firebase Authentication (Email/Password + Google Sign-In)
- **Realtime**: Firebase Firestore (tính năng Listen-Together)
- **Email**: EmailJS (mail chào mừng sau khi đăng ký)
- **Audio**: Web Audio API tự viết (không dùng thư viện ngoài) cho crossfade, gapless, chuẩn hoá âm lượng, equalizer

## Cấu trúc chính

```
src/
  components/
    AppHeader.jsx          Header chính (search, tài khoản, nav) — phản ánh trạng thái đăng nhập thật
    SearchBox.jsx          Search dropdown, hỗ trợ điều hướng bằng phím ↑/↓/Enter
    GlobalAudioPlayer.jsx  Player toàn cục (mini + full-screen), điều khiển audio engine
    QueuePanel.jsx         Hàng chờ, kéo-thả sắp xếp lại
    VinylDisc.jsx          Đĩa than xoay khi phát nhạc
    ThemeProvider.jsx      Toggle dark/light (setTheme/toggleTheme)

  hooks/
    useAudioEngine.js      Engine 2 buffer <audio> — crossfade + gapless + gain node
    useLoudness.js         Phân tích RMS loudness từng bài, tính gain chuẩn hoá âm lượng
    useCoverPalette.js     Trích màu chủ đạo từ ảnh bìa → gradient nền tự động cho trang lyric
    useWaveform.js         Decode audio → dữ liệu waveform hiển thị trên seek bar
    usePartySync.js        Đồng bộ real-time phòng nghe chung (Firestore)
    useLyricPlayer.js      Nạp playlist 8 bài lyric vào player khi vào trang lyric
    usePageStyles.js       Nạp/gỡ CSS gốc theo route (giữ hành vi multi-page cũ)

  context/
    AuthContext.jsx        Firebase Auth: register/login/loginWithGoogle/logout/resetPassword/updateUserProfile

  stores/
    usePlayerStore.js      Zustand: bài đang phát, playlist, queue, volume, crossfade toggle, seek request
    (auth KHÔNG còn ở store — đã chuyển hẳn sang AuthContext/Firebase)

  pages/
    HomePage, ArtistPage, LyricPage, ProfilePage, LoginPage, SignupPage
    PartyPage.jsx           Phòng nghe chung + chat real-time
    LyricSyncTool.jsx       Công cụ nội bộ tap-sync timestamp cho lyric (không có trong nav)

  lib/
    imageFallback.js        onError dùng chung cho mọi <img>, tránh icon "ảnh vỡ" mặc định
    lyricLines.js            Trích các dòng lyric thực sự được hát (bỏ qua [Verse]/[Chorus]...)
    party.js                 Tạo phòng Listen-Together

  data/
    songs.js                 Danh sách bài hát/nghệ sĩ cho ô tìm kiếm
    lyrics/*.json             8 bài: lyric, meta, customStyle, coverSrc, audioSrc, lineTimestamps (nếu có)
    artists/*.json            Nội dung 2 trang nghệ sĩ

  firebase.js                Khởi tạo Firebase App + Auth (dùng toàn app)
  firebaseFirestore.js       Firestore riêng — chỉ tải khi vào tính năng Party (tránh phình bundle chính)

public/
  styles/                     CSS gốc từng trang, nạp động qua usePageStyles
```

## Tính năng

### Xác thực (Firebase Auth)
- Đăng ký/đăng nhập bằng email + mật khẩu, validate mật khẩu mạnh (13+ ký tự, hoa, số, ký tự đặc biệt) và username tối thiểu 6 ký tự — chặn ngay trên form, không chỉ cảnh báo.
- Đăng nhập bằng Google (`signInWithPopup`).
- Quên mật khẩu gửi email reset thật (`sendPasswordResetEmail`).
- Phiên đăng nhập tự khôi phục khi F5 (Firebase tự lưu session).
- Trang Settings cho đổi username/email/mật khẩu, yêu cầu xác thực lại bằng mật khẩu hiện tại trước khi đổi (theo đúng yêu cầu bảo mật của Firebase).

### Email chào mừng (EmailJS)
- Gửi tự động ngay sau khi đăng ký thành công (cả email/password lẫn lần đầu đăng ký bằng Google).
- Cấu hình 3 thông số tại `src/config/emailjs.js`.
- Gửi kiểu fire-and-forget — lỗi gửi mail không chặn việc tạo tài khoản.

### Trang Lyric — nền tự sinh theo màu ảnh bìa
- `useCoverPalette` phân tích ảnh bìa (canvas nhỏ, không cần backend), chọn màu chủ đạo có bão hoà thật (không lấy trung bình cộng gây xỉn màu), tạo gradient 2 tông giống phong cách viết tay ban đầu.
- Chữ trong nav (title/about/meta) tự đổi đen/trắng theo độ sáng nền để luôn đọc được.
- Vinyl trượt ngang khi phát nhạc, không đè lên nội dung text.

### Audio Engine tự viết
- **Crossfade & Gapless**: 2 buffer `<audio>` song song, dùng GainNode để crossfade mượt ~5 giây cuối bài và preload sẵn bài kế tiếp — không còn khoảng lặng giữa 2 bài. Bật/tắt qua icon `Blend` ở full-screen player. Next/Prev/chọn bài trong Queue vẫn chuyển tức thì (không fade).
- **Loudness Normalization**: đo RMS loudness từng bài (cache lại), tự bù gain để các bài phát liền nhau nghe đều tai, không giật âm lượng.
- **Equalizer**: bars trực quan lấy dữ liệu từ AnalyserNode dùng chung với engine trên.

### Search
- Gõ để tìm bài hát/nghệ sĩ, điều hướng kết quả bằng phím **↑/↓**, chọn bằng **Enter** (không bắt buộc dùng chuột).

### Seek theo lời — bán tự động
- Công cụ nội bộ tại `/tools/lyric-sync/<slug>` (không có trong nav): phát nhạc, bấm **Space** đúng lúc từng câu bắt đầu để ghi timestamp, tự nhảy sang câu kế tiếp. Bấm vào bất kỳ dòng nào trong danh sách để tap lại đúng dòng đó (không mất các dòng đã đúng phía sau). Xong bấm **Copy JSON**, dán vào field `lineTimestamps` trong file `src/data/lyrics/<slug>.json`.
- Bài nào có `lineTimestamps` thì trang Lyric tự cho phép bấm vào dòng để tua nhạc tới đúng lúc đó. Chỉ cần làm 1 lần/bài, deploy 1 lần là mọi người dùng đều có ngay, không cần làm lại.

### Listen-Together (phòng nghe chung + chat)
- Bấm icon `Users` ở full-screen player để tạo phòng từ bài đang phát → chuyển tới `/party/<id>`, copy link mời bạn bè.
- Người vào bằng link tự đồng bộ đúng bài + đúng thời điểm + trạng thái play/pause theo host (bù trừ độ trễ mạng qua Firestore server timestamp), kèm chat real-time.
- **Cần bật Firestore Database trên Firebase Console + set rule** trước khi dùng (xem mục Cấu hình Firebase bên dưới) — chưa bật sẽ lỗi âm thầm khi bấm "Start Party".

### Độ bền giao diện
- Mọi `<img>` trong app (cover, avatar, icon Google/Apple...) có fallback SVG placeholder khi ảnh lỗi/mất mạng, không còn icon "ảnh vỡ" mặc định của trình duyệt.

## Cấu hình Firebase (bắt buộc)

### 1. Authentication
Đã cấu hình sẵn trong `src/firebase.js`. Vào Firebase Console → Authentication → Sign-in method → bật **Email/Password** và **Google**, và thêm domain đang chạy (localhost lúc dev, domain thật lúc deploy) vào **Authorized domains**.

### 2. Firestore (chỉ cần nếu dùng Listen-Together)
Firebase Console → Build → Firestore Database → Create database (Production mode) → tab Rules, dán:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /parties/{partyId} {
      allow read, create, update: if true;
      match /messages/{messageId} {
        allow read, create: if true;
      }
    }
  }
}
```

Rule này mở (ai có link cũng đọc/ghi được) — đủ dùng cho tính năng nghe chung thông thường, không nên dùng để truyền dữ liệu nhạy cảm.

## Cấu hình EmailJS (bắt buộc nếu muốn gửi mail chào mừng)

Sửa `src/config/emailjs.js`:

```js
export const EMAILJS_SERVICE_ID = 'service_juow289';
export const EMAILJS_WELCOME_TEMPLATE_ID = 'template_xxxxxxx'; // lấy từ EmailJS dashboard
export const EMAILJS_PUBLIC_KEY = 'xxxxxxxxxxxx';               // Account -> General
```

Template HTML mẫu (nền đen, accent vàng `#feec93`, khớp theme app) dán vào Code editor của EmailJS Template — xem file `juowmusic-welcome-email.html` đã gửi riêng (không nằm trong repo).

## Asset hosting

Ảnh, nhạc, video hiện phục vụ qua URL Vercel Blob (`*.public.blob.vercel-storage.com`).

## Ghi chú kỹ thuật quan trọng

- **`firebase.js` vs `firebaseFirestore.js`**: tách riêng có chủ đích — `firebase.js` (chỉ Auth) được import toàn app nên nằm trong bundle chính; Firestore khá nặng nên tách file riêng, chỉ được `import()` động khi thực sự vào tính năng Party, giữ bundle chính nhẹ.
- **`useAudioEngine`**: mọi thao tác đọc/ghi `<audio>` (2 phần tử A/B) đều đi qua đây — không thao tác trực tiếp audio element ở nơi khác để tránh phá vỡ crossfade/gain node.
- **`createMediaElementSource` chỉ gọi được đúng 1 lần/phần tử `<audio>`** trong suốt vòng đời — graph Web Audio được cache thẳng trên DOM node (`audio._engineGraph`) để sống sót qua React re-render/StrictMode.
- **2 thẻ `<audio>` của engine luôn phải render** (không được đặt sau early-return kiểu `if (!currentSong) return null`) — nếu không, hook gắn listener 1 lần lúc mount sẽ chạy trong khi ref còn `null`, khiến `timeupdate`/`loadedmetadata` không bao giờ được gắn (progress bar sẽ đứng im dù nhạc vẫn phát).

## Việc có thể làm tiếp

- Tap timestamp (`lineTimestamps`) cho 8 bài hiện có qua `/tools/lyric-sync/<slug>` — hiện chưa bài nào có sẵn.
- Siết chặt Firestore rule cho Party (hiện đang mở, phù hợp MVP) nếu cần bảo mật hơn.
- Thêm danh sách "đang online trong phòng" cho Listen-Together (hiện chỉ có chat).
- Xem xét bỏ bớt thư viện nặng (`recharts` ở ProfilePage đang chiếm ~400KB) nếu chỉ cần biểu đồ đơn giản.