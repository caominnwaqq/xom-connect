# KẾ HOẠCH PHÁT TRIỂN & PRD: ỨNG DỤNG HYPER-LOCAL "XÓM" (PWA)

## 1. Tổng quan dự án (Project Overview)
- **Tên dự án (dự kiến):** Xóm (Local Connect)
- **Mục tiêu:** Xây dựng một Progressive Web App (PWA) giúp kết nối cư dân trong bán kính hẹp (hyper-local) để mượn/cho đồ, báo cáo khẩn cấp (SOS) và giao lưu cộng đồng.
- **Nền tảng:** Web App (Mobile-first UI), có thể cài đặt (PWA).
- **Core Action:** Xác thực vị trí -> Đăng tin mượn/cho -> Nhắn tin real-time -> Hoàn thành giao dịch.

## 2. Tech Stack (Yêu cầu Copilot sử dụng)
- **Framework:** Next.js 14+ (App Router).
- **Ngôn ngữ:** TypeScript.
- **Styling:** Tailwind CSS + shadcn/ui (Lucide Icons).
- **Backend/BaaS:** Supabase (PostgreSQL).
- **Database Extension:** PostGIS (Xử lý truy vấn tọa độ địa lý).
- **Map & Geolocation:** React-Leaflet + Geolocation API.
- **State Management:** Zustand (nếu cần state global), React Query (data fetching).
- **PWA:** `next-pwa` (Tạo Service Worker & Manifest).

## 3. Database Schema (Supabase)
Yêu cầu Copilot tạo các bảng sau bằng SQL snippet:

### Bảng `users`
- `id` (uuid, primary key, refs auth.users)
- `display_name` (text)
- `phone` (text, unique)
- `avatar_url` (text)
- `location` (geography(POINT, 4326)) - Lưu tọa độ nhà.
- `created_at` (timestamp)

### Bảng `posts` (Tin đăng)
- `id` (uuid, primary key)
- `user_id` (uuid, refs users.id)
- `type` (enum: 'borrow', 'giveaway', 'sos', 'service')
- `title` (text)
- `description` (text)
- `image_url` (text, nullable)
- `location` (geography(POINT, 4326)) - Kế thừa từ user hoặc chọn vị trí mới.
- `status` (enum: 'active', 'completed', 'cancelled')
- `created_at` (timestamp)

### Bảng `chats` (Hộp thư)
- `id` (uuid, primary key)
- `post_id` (uuid, refs posts.id)
- `requester_id` (uuid, refs users.id)
- `owner_id` (uuid, refs users.id)
- `created_at` (timestamp)

### Bảng `messages` (Tin nhắn)
- `id` (uuid, primary key)
- `chat_id` (uuid, refs chats.id)
- `sender_id` (uuid, refs users.id)
- `content` (text)
- `created_at` (timestamp)

## 4. Cấu trúc thư mục (Folder Structure)
Gợi ý cho Copilot setup:
/src
  /app
    /(auth)          -> login, register
    /(main)          -> trang chủ map, feed
    /post            -> tạo bài đăng
    /messages        -> danh sách chat
  /components
    /ui              -> shadcn components
    /map             -> Leaflet map components
    /cards           -> Post cards
  /lib
    /supabase        -> config Supabase client
    /utils.ts        -> cn(), format time
  /hooks
    /useGeolocation  -> Lấy tọa độ GPS
  /types             -> TS interfaces

## 5. Lộ trình triển khai (Vibe Coding Prompts)
Khi chat với Copilot, hãy yêu cầu thực hiện từng Phase một để tránh phình code và lỗi logic.

### Phase 1: Setup Foundation & PWA
- Khởi tạo Next.js với Tailwind.
- Cài đặt `shadcn/ui` (Button, Input, Card, Dialog).
- Cấu hình file `manifest.json` và `next-pwa` để ứng dụng có thể "Add to Home Screen".
- Tạo layout Mobile-first (Bottom Navigation Bar với các tab: Map, Feed, Add, Messages, Profile).

### Phase 2: Authentication & Geolocation (Supabase Auth)
- Viết component Đăng nhập/Đăng ký.
- Yêu cầu quyền truy cập Location từ trình duyệt (`navigator.geolocation`).
- Lưu user profile vào bảng `users` kèm tọa độ địa lý. 
- *Note:* Trong giai đoạn dev, có thể hardcode một tọa độ trung tâm (ví dụ: Khu vực Ninh Kiều, Cần Thơ) để làm mốc test các truy vấn PostGIS xung quanh.

### Phase 3: Core Logic (PostGIS Query)
- Viết API Route (hoặc Server Action) để lấy danh sách bài đăng (Posts).
- Tích hợp function PostGIS `ST_DWithin` để chỉ query những bài đăng trong bán kính 1km (1000 meters) từ tọa độ của user hiện tại.
- Xây dựng UI hiển thị danh sách bài đăng dạng Feed (vuốt dọc) và dạng Map (Marker trên bản đồ Leaflet).

### Phase 4: CRUD Posts (Tạo bài đăng)
- Form tạo bài đăng mới (Chọn loại tin: Mượn, Cho, SOS).
- Upload hình ảnh lên Supabase Storage.
- Lưu bài đăng mới vào Database.

### Phase 5: Real-time Chat (Supabase Realtime)
- Tạo phòng chat giữa người đăng và người yêu cầu.
- Lắng nghe insert vào bảng `messages` để render tin nhắn real-time không cần reload trang.

### Phase 6: Hoàn thiện giao dịch
- Nút "Hoàn thành giao dịch" để đổi status bài đăng.
