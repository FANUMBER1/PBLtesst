import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Cấu hình Capacitor cho SortiX Dashboard (1 Codebase: Web + Android APK)
 *
 * HƯỚNG DẪN VẬN HÀNH 2 CHẾ ĐỘ:
 * 1. Chế độ Kết nối Trực tiếp (Khuyên dùng cho Next.js Fullstack & Vercel):
 *    - Đặt domain Vercel của bạn vào trường `server.url` (ví dụ: 'https://sortix-dashboard.vercel.app')
 *    - Toàn bộ tính năng Server-Sent Events (SSE /api/events), API routes (/api/auth, /api/safety),
 *      và WebSocket MQTT sẽ hoạt động 100% nguyên bản trên điện thoại.
 *    - Khi có cập nhật mới trên Vercel, ứng dụng trên điện thoại tự động cập nhật (OTA) ngay lập tức.
 *
 * 2. Chế độ Kiểm thử mạng nội bộ WiFi (Local Dev):
 *    - Thay `server.url` thành IP máy tính (ví dụ: 'http://192.168.1.15:3000')
 *    - Chạy `npm run dev` trên máy tính, mở app điện thoại (cùng mạng WiFi) để live-reload.
 */
const config: CapacitorConfig = {
  appId: 'com.pbl3.dashboard',
  appName: 'SortiX-Med Dashboard',
  webDir: 'capacitor-shell',
  server: {
    url: process.env.CAPACITOR_SERVER_URL || 'https://sorti-x-dashboard.vercel.app',
    cleartext: true,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#070b14',
  },
  plugins: {
    // Có thể bổ sung cấu hình plugins Splash Screen, Status Bar tại đây nếu cần
  },
};

export default config;
