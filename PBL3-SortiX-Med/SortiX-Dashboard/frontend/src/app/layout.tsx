import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/ui/Toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#f8fafc",
};

export const metadata: Metadata = {
  title: "SortiX-Med | Hệ thống phân loại dụng cụ y tế và chuẩn bị khử trùng phòng mổ",
  description:
    "Hệ thống điều khiển và giám sát thời gian thực tự động phân loại dụng cụ y tế và chuẩn bị khử trùng phòng mổ SortiX-Med (ESP32-C5, Camera AI YOLOv8, MQTT, Telegram và Email)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="light" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#f8fafc" />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var m=localStorage.getItem("pbl3_theme_mode");if(m==="dark"){document.documentElement.classList.remove("light");document.documentElement.classList.add("dark");}else{document.documentElement.classList.remove("dark");document.documentElement.classList.add("light");}}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070b14] dark:text-slate-100 antialiased">
        <AuthProvider>
          <ToastProvider>
            <DashboardLayout>{children}</DashboardLayout>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
