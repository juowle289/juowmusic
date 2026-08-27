# 🎵 JuowMusic

> Ứng dụng web nghe nhạc & xem lời cá nhân với audio engine tự viết, xác thực Firebase thật, và tính năng nghe nhạc chung real-time.

Được build lại từ project HTML/CSS/JS thuần sang **Vite + React 19 + React Router 7** với đầy đủ tính năng hiện đại: crossfade/gapless, chuẩn hoá âm lượng, Listen-Together, xác thực người dùng, và giao diện đáp ứng đẹp mắt.

---

## 🚀 Bắt đầu nhanh

### Cài đặt dependencies

```bash
npm install
```

### Chạy development server

```bash
npm run dev       # Mở tại http://localhost:5173
```

### Build production

```bash
npm run build     # Output: dist/
npm run preview   # Xem trước bản build
```

---

## 🛠️ Tech Stack

| Chức năng              | Công nghệ                                                |
| ---------------------- | -------------------------------------------------------- |
| **Frontend Framework** | Vite, React 19, React Router 7                           |
| **Styling**            | Tailwind CSS v4, shadcn/ui components                    |
| **State Management**   | Zustand (player), React Context (auth)                   |
| **Authentication**     | Firebase Auth v9+ (Email/Password, Google Sign-In)       |
| **Real-time Database** | Firebase Firestore (Listen-Together)                     |
| **Email**              | EmailJS (welcome emails)                                 |
| **Audio Processing**   | Web Audio API (custom crossfade, gapless, normalization) |
| **Hosting Assets**     | Vercel Blob Storage                                      |

---

## 📂 Cấu trúc dự án

```
src/
├── components/
│   ├── AppHeader.jsx          # Header chính (search, tài khoản, nav)
│   ├── SearchBox.jsx          # Search dropdown (↑/↓/Enter navigation)
│   ├── GlobalAudioPlayer.jsx  # Player (mini + full-screen)
│   ├── QueuePanel.jsx         # Danh sách phát (drag-and-drop)
│   ├── VinylDisc.jsx          # Hình minh họa đĩa than xoay
│   ├── ThemeProvider.jsx      # Dark/light mode toggle
│   └── ui/                    # shadcn components (button, dialog, etc.)
│
├── hooks/
│   ├── useAudioEngine.js      # Web Audio API engine (crossfade + gapless)
│   ├── useLoudness.js         # Loudness analysis & normalization
│   ├── useCoverPalette.js     # Extract dominant colors from cover art
│   ├── useWaveform.js         # Waveform visualization
│   ├── usePartySync.js        # Real-time sync (Firestore)
│   ├── useLyricPlayer.js      # Load lyric playlist
│   ├── usePageStyles.js       # Dynamic CSS loading per route
│   └── useListeningHistory.js # Track listening stats
│
├── context/
│   └── AuthContext.jsx        # Firebase Auth provider
│
├── stores/
│   └── usePlayerStore.js      # Zustand: player state
│
├── pages/
│   ├── HomePage.jsx
│   ├── ArtistPage.jsx
│   ├── LyricPage.jsx
│   ├── PartyPage.jsx          # Listen-Together room
│   ├── ProfilePage.jsx
│   ├── LoginPage.jsx
│   ├── SignupPage.jsx
│   └── LyricSyncTool.jsx      # Internal tool
│
├── lib/
│   ├── imageFallback.js       # Fallback SVG for broken images
│   ├── lyricLines.js          # Parse lyric sections
│   ├── party.js               # Party room logic
│   ├── mood.js                # Mood detection
│   ├── geo.js                 # Geolocation
│   └── utils.js               # Utilities
│
├── data/
│   ├── songs.js               # Track database
│   ├── lyrics/                # Lyric files (JSON with timestamps)
│   ├── artists/               # Artist pages data
│   └── songCountries.js       # Country data
│
├── config/
│   ├── emailjs.js             # EmailJS config
│   └── navigation.js          # Route config
│
├── firebase.js                # Firebase App & Auth init
└── firebaseFirestore.js       # Firestore (lazy-loaded)

public/
└── styles/                    # Per-page CSS (loaded dynamically)
```

---

## ✨ Tính năng chính

### 🔐 Authentication (Firebase Auth)

**Đăng ký / Đăng nhập**

- Email + Password với validation bắt buộc:
  - Mật khẩu: ≥13 ký tự, chữ hoa, số, ký tự đặc biệt (kiểm tra ngay trên form)
  - Username: ≥6 ký tự (không chỉ cảnh báo, chặn hoàn toàn)
- Đăng nhập bằng Google (`signInWithPopup`)
- Phiên tự khôi phục khi F5 (Firebase lưu session trong IndexedDB)

**Quên mật khẩu**

- Gửi email reset link thông qua `sendPasswordResetEmail`
- Link mở trang reset mặc định của Firebase (không custom URL)
- Xử lý lỗi phổ biến: user-not-found, invalid-email, too-many-requests

**Quản lý tài khoản**

- Trang Settings: đổi username, email, mật khẩu
- Re-authentication bắt buộc (nhập mật khẩu hiện tại) trước khi thay đổi nhạy cảm

---

### 📧 Email Chào mừng (EmailJS)

- Gửi tự động ngay sau khi đăng ký (email/password hoặc lần đầu Google Sign-In)
- Fire-and-forget: lỗi gửi mail không chặn việc tạo tài khoản
- Cấu hình tại `src/config/emailjs.js`

**Template mẫu**: Nền đen, accent vàng `#feec93`, khớp theme app (xem tệp `juowmusic-welcome-email.html`)

---

### 🎨 Trang Lyric — Nền tự sinh từ màu ảnh bìa

- **Phân tích màu** (`useCoverPalette`):
  - Canvas nhỏ, không cần backend
  - Chọn màu chủ đạo có bão hoà thật (tránh lấy trung bình cộng gây xỉn)
  - Tạo gradient 2 tông giống phong cách ban đầu

- **Tự động điều chỉnh text**:
  - Chữ nav (title, about, meta) đổi đen/trắng theo độ sáng nền
  - Đảm bảo độ tương phản & dễ đọc

- **Hình ảnh**:
  - Vinyl xoay song song khi phát nhạc
  - Không đè lên nội dung text

---

### 🔊 Audio Engine Tự viết

**Crossfade & Gapless**

- 2 buffer `<audio>` song song với GainNode
- Crossfade mượt ~5 giây ở cuối mỗi bài
- Preload bài kế tiếp → không khoảng lặng
- Bật/tắt qua icon "Blend" ở full-screen player
- Next/Prev/chọn bài Queue vẫn chuyển tức thì (không fade)

**Loudness Normalization**

- Đo RMS loudness từng bài (cache)
- Tự bù gain → các bài nghe đều tai
- Tránh giật âm lượng khi chuyển bài

**Equalizer**

- Bars trực quan từ AnalyserNode
- Dùng chung với engine chính

---

### 🔍 Search

- Gõ để tìm bài hát / nghệ sĩ
- Điều hướng kết quả bằng phím **↑/↓**
- Chọn bằng **Enter** (không cần chuột)

---

### ⏰ Seek theo lời (Lyric Sync Tool)

**Công cụ nội bộ** tại `/tools/lyric-sync/<slug>` (không trong nav):

1. Phát nhạc
2. Bấm **Space** ở đúng lúc bắt đầu mỗi câu → ghi timestamp
3. Tự nhảy sang câu kế
4. Bấm câu bất kỳ để tap lại (không mất câu trước)
5. Bấm "Copy JSON" → dán vào `lineTimestamps` trong `src/data/lyrics/<slug>.json`

**Kết quả**: Bài có `lineTimestamps` sẽ cho phép bấm vào dòng để tua nhạc tới lúc đó. Chỉ làm 1 lần/bài, mọi người dùng đều có ngay (không cần làm lại).

---

### 👥 Listen-Together (Phòng nghe chung)

**Tạo & tham gia phòng**:

- Bấm icon "Users" ở full-screen player
- Tự động chuyển tới `/party/<id>`
- Copy link mời bạn bè

**Tính năng**:

- Đồng bộ bài hát + thời điểm + play/pause theo host
- Bù trừ độ trễ mạng qua Firestore server timestamp
- Chat real-time trong phòng

**⚠️ Yêu cầu**: Phải bật & cấu hình Firestore Database trên Firebase Console (xem bên dưới), nếu không sẽ lỗi âm thầm khi bấm "Start Party".

---

### 🖼️ Độ bền giao diện

- Mọi `<img>` (cover, avatar, icon...) có fallback SVG placeholder khi lỗi/mất mạng
- Không còn icon "ảnh vỡ" mặc định của trình duyệt

---

## 🔧 Cấu hình bắt buộc

### Firebase Console

#### 1️⃣ Authentication

**Đã cấu hình sẵn** trong `src/firebase.js`. Cần kiểm tra:

1. Vào Firebase Console → **Authentication** → **Sign-in method**
2. Bật **Email/Password** và **Google**
3. Thêm domain vào **Authorized domains**:
   - Dev: `localhost` (nếu chạy localhost)
   - Deploy: domain thật (vd: `juowmusic.com`)

---

#### 2️⃣ Firestore Database (chỉ cần nếu dùng Listen-Together)

1. Vào Firebase Console → **Build** → **Firestore Database**
2. Click **Create database** → chọn **Production mode**
3. Sau khi tạo xong, vào tab **Rules** → dán:

```firestore-rules
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

**⚠️ Lưu ý**: Rule này mở cho phép ai có link cũng đọc/ghi → đủ dùng cho MVP, không nên truyền dữ liệu nhạy cảm.

---

### EmailJS (tùy chọn, chỉ cần nếu muốn gửi mail)

Chỉnh sửa `src/config/emailjs.js`:

```javascript
export const EMAILJS_SERVICE_ID = "service_xxxxx"; // Dashboard -> Services
export const EMAILJS_WELCOME_TEMPLATE_ID = "template_xxxxx"; // Dashboard -> Templates
export const EMAILJS_PUBLIC_KEY = "xxxxxxxxxx"; // Account -> General
```

Dán template HTML (nền đen, accent vàng `#feec93`) vào Code editor của EmailJS Template (xem tệp riêng: `juowmusic-welcome-email.html`).

---

## 💾 Asset Hosting

Hiện tại phục vụ qua **Vercel Blob Storage** (`*.public.blob.vercel-storage.com`).

Thay đổi URL ảnh/nhạc:

- Sửa trong `src/data/lyrics/<slug>.json` (field `coverSrc`, `audioSrc`)
- Sửa trong `src/data/artists/*.json`

---

## 📝 Ghi chú kỹ thuật quan trọng

### Firebase modules

**`firebase.js` vs `firebaseFirestore.js`** (tách riêng có chủ đích):

- `firebase.js`: chỉ Auth → import toàn app → nằm trong bundle chính
- `firebaseFirestore.js`: Firestore khá nặng → `import()` động khi thực sự vào Party
- **Lợi ích**: bundle chính nhẹ hơn

### Audio Engine

**`useAudioEngine`** là bộ điều khiển duy nhất:

- Mọi thao tác `<audio>` đều qua đây (không thao tác trực tiếp ở nơi khác)
- Tránh phá vỡ crossfade / gain node

**Web Audio Graph caching**:

- `createMediaElementSource` chỉ gọi được 1 lần/phần tử `<audio>` trong suốt vòng đời
- Graph được cache trên DOM node (`audio._engineGraph`) → sống sót qua React re-render & StrictMode

**2 thẻ `<audio>` bắt buộc phải render**:

- ❌ Không được đặt sau early-return kiểu `if (!currentSong) return null`
- ✅ Luôn render (có thể ẩn bằng CSS `hidden` hoặc `display: none`)
- **Lý do**: Hook gắn listener 1 lần lúc mount; nếu ref còn `null` sẽ không gắn `timeupdate`/`loadedmetadata` → progress bar sẽ đứng im dù nhạc vẫn phát

---

## 🚧 Việc có thể làm tiếp

- [ ] Tap timestamp (`lineTimestamps`) cho 8 bài hiện có qua `/tools/lyric-sync/<slug>` (hiện chưa bài nào có sẵn)
- [ ] Siết chặt Firestore rule cho Party (hiện đang mở, phù hợp MVP)
- [ ] Thêm danh sách "đang online trong phòng" cho Listen-Together (hiện chỉ có chat)
- [ ] Xem xét bỏ bớt thư viện nặng (vd: `recharts` ở ProfilePage ~400KB) nếu chỉ cần biểu đồ đơn giản
- [ ] Thêm PWA support (offline mode, install as app)
- [ ] Tối ưu hóa chunk size & code-splitting

---

## 📞 Support & Liên hệ

Nếu có câu hỏi hoặc tìm thấy lỗi, vui lòng tạo Issue hoặc liên hệ trực tiếp.

**Happy listening! 🎶**
