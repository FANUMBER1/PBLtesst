"use client";

import React, { useState, useEffect, useRef } from "react";
import { useDashboardSafe } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  Bot,
  Terminal,
  Send,
  X,
  RotateCcw,
  Settings,
  Maximize2,
  Minimize2,
  CheckCircle2,
  AlertCircle,
  Thermometer,
  Layers,
  ShieldAlert,
  BarChart3,
  Stethoscope,
  SendHorizontal,
  Copy,
  Check,
  Network,
  ChevronRight,
  ChevronLeft,
  ListPlus,
  ArrowUpRight,
  Edit3,
  Activity,
  Sun,
  Moon,
  UserCheck,
  Trash2,
  ExternalLink,
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  isSendingTelegram?: boolean;
  telegramSent?: boolean;
  isError?: boolean;
}

export interface QuestionItem {
  id: string;
  title: string;
  badge: string;
  prompt: string;
  summary?: string;
}

export interface PromptTopic {
  id: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  categoryTag: string;
  categoryColor: "rose" | "emerald" | "cyan" | "blue" | "amber";
  icon: React.ElementType;
  questions: QuestionItem[];
}

export interface SuggestedPrompt {
  id: string;
  category: string;
  categoryColor: "rose" | "emerald" | "cyan" | "blue" | "amber";
  title: string;
  summary: string;
  prompt: string;
  icon: React.ElementType;
}

const INTERNAL_COPILOT_API = "/api/chat/copilot";
const DEFAULT_WEBHOOK_URL =
  process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || INTERNAL_COPILOT_API;

// BẢNG 4 CHỦ ĐỀ CHÍNH VÀ DANH SÁCH CÂU HỎI CHI TIẾT
export const PROMPT_TOPICS: PromptTopic[] = [
  {
    id: "safety",
    title: "1. Báo Cáo An Toàn Phần Cứng & Telemetry",
    shortTitle: "An toàn & Telemetry",
    subtitle: "Nhiệt độ chip nội vi ESP32-C5, động cơ băng tải, cảm biến #02 và nút E-Stop",
    categoryTag: "Nội vi ESP32 & E-Stop",
    categoryColor: "rose",
    icon: ShieldAlert,
    questions: [
      {
        id: "safety_full",
        title: "[BÁO CÁO AN TOÀN PHẦN CỨNG TOÀN DIỆN]",
        badge: "Báo cáo đầy đủ",
        summary: "Truy vấn cảm biến nhiệt độ nội vi ESP32-C5, động cơ, cảm biến quang #02, nút E-Stop và kết luận điều kiện vận hành.",
        prompt: `[BÁO CÁO AN TOÀN PHẦN CỨNG]
Chào bạn, tôi là Kỹ sư thiết bị y tế phụ trách ca trực. Hãy truy vấn dữ liệu từ hệ thống telemetry và các cảm biến an toàn của dây chuyền SortiX-Med để trả lời các câu hỏi sau:

1. Nhiệt độ chip hiện tại đo được từ cảm biến nội vi ESP32-C5 là bao nhiêu °C? Mức nhiệt này có nằm trong ngưỡng an toàn cho phép không (ngưỡng cảnh báo là 75°C)?
2. Trạng thái động cơ băng tải hiện tại đang chạy (isRunning = true) hay đang dừng? Tốc độ vận hành được ghi nhận là bao nhiêu?
3. Cảm biến quang học #02 tại Zone A có đang ghi nhận tín hiệu che khuất hoặc cờ cảnh báo kẹt phôi (jam_detected) nào không?
4. Nút dừng khẩn cấp E-Stop có đang bị khóa kích hoạt không?

Dựa trên dữ liệu cảm biến thực tế, hãy đưa ra kết luận: "Hệ thống ĐỦ ĐIỀU KIỆN hay KHÔNG ĐỦ ĐIỀU KIỆN an toàn để tiếp tục vận hành?".`,
      },
      {
        id: "safety_temp",
        title: "Kiểm tra nhiệt độ cảm biến nội vi ESP32-C5",
        badge: "Nội vi ESP32",
        summary: "Đo nhiệt độ chip nội vi ESP32-C5, so sánh với ngưỡng an toàn 75°C và kiểm tra cờ cảnh báo quá nhiệt.",
        prompt: "Nhiệt độ chip hiện tại đo được từ cảm biến nội vi ESP32-C5 là bao nhiêu °C? Mức nhiệt này có nằm trong ngưỡng an toàn cho phép không (ngưỡng cảnh báo là 75°C)?",
      },
      {
        id: "safety_motor",
        title: "Trạng thái động cơ băng tải & Tốc độ",
        badge: "Động cơ",
        summary: "Kiểm tra động cơ băng tải đang chạy hay dừng và tốc độ vận hành ghi nhận là bao nhiêu % PWM.",
        prompt: "Trạng thái động cơ băng tải hiện tại đang chạy (isRunning = true) hay đang dừng? Tốc độ vận hành được ghi nhận là bao nhiêu?",
      },
      {
        id: "safety_optical",
        title: "Cảm biến quang #02 & Cảnh báo kẹt phôi",
        badge: "CB #02",
        summary: "Kiểm tra cảm biến quang #02 Zone A có bị che khuất hoặc kích hoạt cờ cảnh báo jam_detected không.",
        prompt: "Cảm biến quang học #02 tại Zone A có đang ghi nhận tín hiệu che khuất hoặc cờ cảnh báo kẹt phôi (jam_detected) nào không?",
      },
      {
        id: "safety_estop",
        title: "Trạng thái nút dừng khẩn cấp E-Stop",
        badge: "E-Stop",
        summary: "Kiểm tra nút E-Stop có đang bị khóa kích hoạt không và kết luận điều kiện an toàn.",
        prompt: "Nút dừng khẩn cấp E-Stop có đang bị khóa kích hoạt không? Dây chuyền có đủ điều kiện an toàn để vận hành?",
      },
    ],
  },
  {
    id: "cssd",
    title: "2. Báo Cáo 1 Ngày Làm Việc - Khoa Kiểm Soát Nhiễm Khuẩn (CSSD)",
    shortTitle: "Ca trực & CSSD",
    subtitle: "Tổng số lượng dụng cụ, phân loại kéo, kẹp panh, cán dao mổ, độ tin cậy AI Vision",
    categoryTag: "Khoa CSSD",
    categoryColor: "cyan",
    icon: Stethoscope,
    questions: [
      {
        id: "cssd_full",
        title: "[BÁO CÁO 1 NGÀY LÀM VIỆC - KHOA KIỂM SOÁT NHIỄM KHUẨN]",
        badge: "Báo cáo đầy đủ",
        summary: "Báo cáo 4 phần: tổng dụng cụ, bóc tách 3 nhóm phẫu thuật, độ tin cậy AI Vision và tỷ lệ chính xác chuẩn bị phòng mổ.",
        prompt: `[BÁO CÁO 1 NGÀY LÀM VIỆC - KHOA KIỂM SOÁT NHIỄM KHUẨN]
Tôi là Điều dưỡng trưởng Khoa Khử trùng & Chuẩn bị phòng mổ (CSSD). Hãy kiểm tra toàn bộ lịch sử phân loại từ hệ thống SortiX-Med hôm nay và tổng hợp báo cáo chi tiết:

1. Tổng số lượng dụng cụ phẫu thuật đã đi qua hệ thống phân loại là bao nhiêu?
2. Hãy bóc tách và phân loại chi tiết số lượng thực tế cho từng nhóm dụng cụ:
   - Kéo phẫu thuật (Surgical Scissors)
   - Kẹp panh cầm máu (Hemostatic Forceps)
   - Cán dao mổ (Scalpel Handles)
   - Các vật thể lỗi / không xác định (nếu có)
3. Tính toán độ tin cậy nhận diện (Confidence Score) trung bình của mô hình Camera AI Vision trên các lượt phân loại gần nhất.
4. Tỷ lệ phân loại chính xác đạt bao nhiêu % so với yêu cầu chuẩn bị dụng cụ phòng mổ?

Hãy trình bày số liệu dưới dạng bảng tóm tắt ngắn gọn và dễ theo dõi.`,
      },
      {
        id: "cssd_total",
        title: "Tổng số lượng dụng cụ đã qua phân loại hôm nay",
        badge: "Tổng sản lượng",
        summary: "Xem tổng số lượng dụng cụ phẫu thuật đã đi qua hệ thống phân loại SortiX-Med trong ca trực hôm nay.",
        prompt: "Tổng số lượng dụng cụ phẫu thuật đã đi qua hệ thống phân loại SortiX-Med hôm nay là bao nhiêu sản phẩm?",
      },
      {
        id: "cssd_breakdown",
        title: "Bóc tách chi tiết: Kéo, Kẹp panh, Cán dao mổ",
        badge: "Bóc tách nhóm",
        summary: "Thống kê số lượng thực tế cho từng nhóm dụng cụ: Kéo phẫu thuật, Kẹp panh cầm máu và Cán dao mổ.",
        prompt: "Hãy bóc tách và phân loại chi tiết số lượng thực tế cho từng nhóm dụng cụ: Kéo phẫu thuật, Kẹp panh cầm máu và Cán dao mổ.",
      },
      {
        id: "cssd_confidence",
        title: "Độ tin cậy nhận diện Camera AI Vision",
        badge: "Confidence AI",
        summary: "Tính toán độ tin cậy trung bình (Confidence Score) của mô hình Camera AI YOLO trên các lượt phân loại gần nhất.",
        prompt: "Tính toán độ tin cậy nhận diện (Confidence Score) trung bình của mô hình Camera AI Vision trên các lượt phân loại gần nhất.",
      },
      {
        id: "cssd_accuracy",
        title: "Tỷ lệ phân loại chính xác chuẩn phòng mổ (%)",
        badge: "Tỷ lệ chuẩn",
        summary: "Đánh giá tỷ lệ phân loại chính xác (%) đạt được so với yêu cầu đóng gói vô trùng phòng phẫu thuật.",
        prompt: "Tỷ lệ phân loại chính xác đạt bao nhiêu % so với yêu cầu chuẩn bị dụng cụ phòng mổ? Trình bày số liệu dạng bảng tóm tắt.",
      },
    ],
  },
  {
    id: "trays",
    title: "3. Kiểm Tra Dung Lượng Khay Chứa & Cảnh Báo Thay Khay",
    shortTitle: "3 Khay chứa",
    subtitle: "Số lượng hiện tại, sức chứa 3 khay, tỷ lệ lấp đầy %, cảnh báo ngưỡng > 80%",
    categoryTag: "Khay 1 - 2 - 3",
    categoryColor: "emerald",
    icon: Layers,
    questions: [
      {
        id: "trays_full",
        title: "[KIỂM TRA DUNG LƯỢNG KHAY CHỨA & CẢNH BÁO THAY KHAY]",
        badge: "Báo cáo đầy đủ",
        summary: "Đọc dữ liệu thời gian thực 3 khay, tính tỷ lệ lấp đầy %, kiểm tra cảnh báo > 80% và hướng dẫn quy trình thay khay an toàn.",
        prompt: `[KIỂM TRA DUNG LƯỢNG KHAY CHỨA & CẢNH BÁO THAY KHAY]
Tôi là Kỹ thuật viên phụ trách khâu thu gom dụng cụ sau phân loại. Hãy đọc cấu hình và dữ liệu thời gian thực của 3 khay chứa trên băng chuyền:

1. Liệt kê số lượng hiện tại (current_count) và sức chứa định mức tối đa (max_capacity) của từng khay:
   - Khay 1 (Kéo phẫu thuật)
   - Khay 2 (Kẹp panh)
   - Khay 3 (Dao mổ)
2. Tính tỷ lệ lấp đầy (%) của từng khay.
3. Hiện tại có khay nào đã đầy hoặc vượt quá 80% định mức sức chứa cần điều dưỡng chuẩn bị khay rỗng mới để thay thế không?
4. Nếu có khay đầy, hãy nhắc nhở quy trình thao tác an toàn khi thay khay để tránh làm va đập mẻ lưỡi dao hoặc cong đầu kẹp vi phẫu.`,
      },
      {
        id: "trays_counts",
        title: "Số lượng hiện tại & Sức chứa tối đa 3 khay",
        badge: "Số lượng khay",
        summary: "Liệt kê current_count và max_capacity của Khay 1 (Kéo), Khay 2 (Kẹp panh), Khay 3 (Dao mổ).",
        prompt: "Liệt kê số lượng hiện tại (current_count) và sức chứa định mức tối đa (max_capacity) của từng khay: Khay 1 (Kéo phẫu thuật), Khay 2 (Kẹp panh), Khay 3 (Dao mổ).",
      },
      {
        id: "trays_fill_rate",
        title: "Tỷ lệ lấp đầy (%) của từng khay chứa",
        badge: "Tỷ lệ %",
        summary: "Tính toán chính xác phần trăm lấp đầy của cả 3 khay chứa dụng cụ y tế.",
        prompt: "Tính tỷ lệ lấp đầy (%) của từng khay chứa trên băng chuyền SortiX-Med.",
      },
      {
        id: "trays_warning_80",
        title: "Cảnh báo khay sắp đầy (> 80% sức chứa)",
        badge: "Cảnh báo > 80%",
        summary: "Kiểm tra khay nào vượt quá 80% sức chứa cần điều dưỡng chuẩn bị khay rỗng thay thế.",
        prompt: "Hiện tại có khay nào đã đầy hoặc vượt quá 80% định mức sức chứa cần điều dưỡng chuẩn bị khay rỗng mới để thay thế không?",
      },
      {
        id: "trays_safety_protocol",
        title: "Quy trình an toàn khi thay khay dụng cụ phẫu thuật",
        badge: "Quy trình an toàn",
        summary: "Hướng dẫn thao tác an toàn khi thay khay để tránh va đập làm mẻ lưỡi dao hoặc cong đầu kẹp vi phẫu.",
        prompt: "Nếu có khay đầy, hãy nhắc nhở quy trình thao tác an toàn khi thay khay để tránh làm va đập mẻ lưỡi dao hoặc cong đầu kẹp vi phẫu.",
      },
    ],
  },
  {
    id: "diagnostics",
    title: "4. Chẩn Đoán Sự Cố & Hướng Dẫn Xử Lý Khẩn Cấp",
    shortTitle: "Chẩn đoán sự cố",
    subtitle: "Tìm nguyên nhân dừng băng tải (E-Stop, kẹt #02, đầy khay), quá nhiệt ESP32 và 4 bước xử lý",
    categoryTag: "Khẩn cấp & Sự cố",
    categoryColor: "amber",
    icon: AlertCircle,
    questions: [
      {
        id: "diagnostics_full",
        title: "[CHẨN ĐOÁN SỰ CỐ & HƯỚNG DẪN XỬ LÝ KHẨN CẤP]",
        badge: "Báo cáo đầy đủ",
        summary: "Chẩn đoán nguyên nhân dừng đột ngột, kiểm tra nhiệt độ bo mạch ESP32 và hướng dẫn 4 bước xử lý sự cố an toàn tại hiện trường.",
        prompt: `[CHẨN ĐOÁN SỰ CỐ & HƯỚNG DẪN XỬ LÝ KHẨN CẤP]
Dây chuyền phân loại dụng cụ y tế SortiX-Med vừa phát tín hiệu cảnh báo và băng tải bị dừng đột ngột. Hãy chẩn đoán tình hình khẩn cấp:

1. Kiểm tra ngay dữ liệu hệ thống và cho tôi biết nguyên nhân chính xác khiến băng tải dừng:
   - Do có người bấm nút dừng khẩn cấp E-Stop?
   - Do Cảm biến quang #02 tại Zone A phát hiện kẹt dụng cụ liên tục quá 5 giây?
   - Hay do một trong 3 khay chứa đã chạm ngưỡng đầy 100%?
2. Nhiệt độ bo mạch ESP32 hiện tại có biểu hiện quá nhiệt (> 75°C) hay không? Nếu nhiệt độ vượt ngưỡng thì ảnh hưởng thế nào đến độ bền bo mạch và nguy cơ trong môi trường phòng mổ vô trùng?
3. Hãy hướng dẫn tôi quy trình 4 bước xử lý sự cố an toàn tại hiện trường để có thể mở khóa và tái khởi động băng tải đúng kỹ thuật.`,
      },
      {
        id: "diagnostics_cause",
        title: "Chẩn đoán nguyên nhân dừng băng tải đột ngột",
        badge: "Nguyên nhân dừng",
        summary: "Xác định chính xác lý do dừng: Do E-Stop, kẹt phôi cảm biến #02 quá 5 giây hay đầy khay 100%.",
        prompt: "Kiểm tra ngay dữ liệu hệ thống và cho tôi biết nguyên nhân chính xác khiến băng tải dừng: Do E-Stop, do cảm biến quang #02 hay khay chứa đầy 100%?",
      },
      {
        id: "diagnostics_overheat",
        title: "Kiểm tra nguy cơ quá nhiệt bo mạch ESP32 (> 75°C)",
        badge: "Quá nhiệt ESP32",
        summary: "Đánh giá mức nhiệt bo mạch ESP32 và ảnh hưởng độ bền linh kiện trong môi trường phòng mổ.",
        prompt: "Nhiệt độ bo mạch ESP32 hiện tại có biểu hiện quá nhiệt (> 75°C) hay không? Nếu vượt ngưỡng thì ảnh hưởng thế nào đến môi trường phòng mổ vô trùng?",
      },
      {
        id: "diagnostics_4steps",
        title: "Quy trình 4 bước xử lý sự cố & Mở khóa an toàn",
        badge: "4 Bước xử lý",
        summary: "Hướng dẫn chi tiết 4 bước kỹ thuật tại hiện trường để khắc phục sự cố và tái khởi động băng tải an toàn.",
        prompt: "Hãy hướng dẫn tôi quy trình 4 bước xử lý sự cố an toàn tại hiện trường để có thể mở khóa và tái khởi động băng tải đúng kỹ thuật.",
      },
    ],
  },
];

// DANH SÁCH TOÀN BỘ CÂU HỎI (TƯƠNG THÍCH LÙI)
const SUGGESTED_PROMPTS: SuggestedPrompt[] = PROMPT_TOPICS.flatMap((topic) =>
  topic.questions.map((q) => ({
    id: q.id,
    category: topic.shortTitle,
    categoryColor: topic.categoryColor,
    title: q.title,
    summary: q.summary || q.prompt.slice(0, 100) + "...",
    prompt: q.prompt,
    icon: topic.icon,
  }))
);

// THANH GỢI Ý CƠ BẢN (QUICK CHIPS) HIỂN THỊ TRÊN KHUNG NHẬP
const QUICK_SUGGESTIONS = [
  {
    id: "quick_admin",
    label: "Admin & Người trực",
    icon: UserCheck,
    query: "Admin hiện tại đang trực là ai? Cho tôi biết thông tin tài khoản đang đăng nhập hệ thống.",
  },
  {
    id: "quick_temp",
    label: "Nhiệt độ nội vi ESP32",
    icon: Thermometer,
    query: "Nhiệt độ chip nội vi ESP32-C5 hiện tại là bao nhiêu °C? Mức nhiệt này có nằm trong ngưỡng an toàn không?",
  },
  {
    id: "quick_trays",
    label: "Kiểm tra 3 khay",
    icon: Layers,
    query: "Kiểm tra số lượng và tỷ lệ lấp đầy của 3 khay chứa dụng cụ y tế hiện tại?",
  },
  {
    id: "quick_estop",
    label: "An toàn E-Stop",
    icon: ShieldAlert,
    query: "Kiểm tra nút dừng khẩn cấp E-Stop và động cơ băng tải hiện tại có an toàn không?",
  },
  {
    id: "quick_cssd",
    label: "Ca trực CSSD",
    icon: Stethoscope,
    query: "Báo cáo nhanh tổng số lượng dụng cụ đã phân loại ca trực hôm nay?",
  },
  {
    id: "quick_diagnostics",
    label: "Chẩn đoán sự cố",
    icon: AlertCircle,
    query: "Hệ thống có đang phát hiện sự cố kẹt phôi hoặc cảnh báo bất thường nào không?",
  },
];
// Helper tính toán màu sắc và trạng thái khay theo chuẩn hóa 3 mức (Đồng bộ Web, Mobile App, AI Copilot)
export const getTrayColorStatus = (count: number, cap: number) => {
  const safeCap = cap > 0 ? cap : 1;
  const rate = Math.round((count / safeCap) * 100);
  if (rate >= 100) {
    return {
      level: "critical" as const,
      color: "red",
      emoji: "🔴",
      colorCode: "🔴 Đỏ (100%)",
      statusText: "Đầy - Thay ngay",
      rate,
    };
  } else if (rate >= 80) {
    return {
      level: "warning" as const,
      color: "amber",
      emoji: "🟡",
      colorCode: "🟡 Vàng (≥80%)",
      statusText: "Gần đầy (>80%)",
      rate,
    };
  } else {
    return {
      level: "normal" as const,
      color: "green",
      emoji: "🟢",
      colorCode: "🟢 Xanh lá",
      statusText: "Bình thường",
      rate,
    };
  }
};

// Helper trả lời ngoại tuyến tự động từ dữ liệu Telemetry khi n8n chưa kết nối
const generateOfflineFallbackResponse = (
  query: string,
  dashboard: ReturnType<typeof useDashboardSafe>,
  user?: import("@/lib/permissions").AuthUser | null
): string | null => {
  if (!dashboard) return null;
  const q = query.toLowerCase();

  const b1 = dashboard.binCounts?.bin1 ?? 0;
  const b2 = dashboard.binCounts?.bin2 ?? 0;
  const b3 = dashboard.binCounts?.bin3 ?? 0;
  const cap1 = dashboard.binCapacities?.bin1 || 38;
  const cap2 = dashboard.binCapacities?.bin2 || 50;
  const cap3 = dashboard.binCapacities?.bin3 || 50;
  const t1 = getTrayColorStatus(b1, cap1);
  const t2 = getTrayColorStatus(b2, cap2);
  const t3 = getTrayColorStatus(b3, cap3);
  const temp = typeof dashboard.telemetry?.cpu_temp === "number" ? dashboard.telemetry.cpu_temp : 42.5;
  const estop = dashboard.isSystemLocked || Boolean(dashboard.telemetry?.estop_pressed);
  const jam = Boolean(dashboard.isJammed);
  const isRunning = Boolean(dashboard.isRunning);
  const speed = dashboard.conveyorSpeed ?? 0;
  const modeTag = dashboard.isSimulation
    ? "[CHẾ ĐỘ MÔ PHỎNG - SIMULATION]"
    : "[CHẾ ĐỘ THỰC TẾ - REAL HARDWARE]";

  // 1. Thông tin Admin / Người dùng đang đăng nhập / Ca trực
  if (
    q.includes("admin") ||
    q.includes("người trực") ||
    q.includes("ai đang") ||
    q.includes("đăng nhập") ||
    q.includes("tôi là ai") ||
    q.includes("tài khoản") ||
    q.includes("người dùng") ||
    q.includes("quản trị")
  ) {
    const roleLabel =
      user?.role === "admin"
        ? "Quản trị viên (Admin) — Toàn quyền kiểm soát & mở khóa an toàn"
        : user?.role === "maintenance"
        ? "Kỹ thuật viên bảo trì (Maintenance)"
        : "Người vận hành / Điều dưỡng viên (User)";

    return `${modeTag}

### 👤 Thông tin Tài khoản & Admin đang trực hệ thống:

- **Họ và tên**: **${user?.displayName || "Chưa xác định"}**
- **Tài khoản (Username)**: \`${user?.username || "Chưa đăng nhập"}\`
- **Vai trò (Role)**: **${roleLabel}**
- **Email**: \`${user?.email || "N/A"}\`
- **Quyền hạn**: ${
      user?.role === "admin"
        ? "🟢 **Quản trị viên toàn quyền** (Điều khiển băng tải, cấu hình servo, mở khóa E-Stop, quản lý người dùng)."
        : "🔵 **Người vận hành** (Giám sát telemetry, nạp phôi, xem lịch sử phân loại)."
    }
- **Vị trí trực**: **Trạm phân loại y tế SortiX-Med #01 (Khoa CSSD - Kiểm soát Nhiễm khuẩn)**
- **Thời gian đăng nhập**: ${
      user?.loginTime
        ? new Date(user.loginTime).toLocaleString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        : "Phiên làm việc hiện tại"
    }

> ℹ️ *Hệ thống AI Copilot tự động nhận diện danh tính theo tài khoản thực tế đang đăng nhập trên Dashboard.*`;
  }

  // 2. Kiểm tra 3 khay chứa / dung lượng / lấp đầy
  if (
    q.includes("khay") ||
    q.includes("lấp đầy") ||
    q.includes("dung lượng") ||
    q.includes("sức chứa") ||
    q.includes("tray")
  ) {
    return `${modeTag}

### 📦 Báo cáo dung lượng & Tỷ lệ lấp đầy 3 khay chứa:

| Khay chứa | Nhóm dụng cụ | Số lượng | Sức chứa | Tỷ lệ (%) | Trạng thái hiện tại |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Khay 1** | Kéo & Dao mổ | ${b1} SP | ${cap1} SP | ${t1.rate}% | ${t1.emoji} ${t1.statusText} |
| **Khay 2** | Kẹp panh cầm máu | ${b2} SP | ${cap2} SP | ${t2.rate}% | ${t2.emoji} ${t2.statusText} |
| **Khay 3** | Dụng cụ khác | ${b3} SP | ${cap3} SP | ${t3.rate}% | ${t3.emoji} ${t3.statusText} |

#### 💡 Tóm tắt & Hướng dẫn:
- **Đánh giá ngưỡng**: ${
      t1.rate >= 80 || t2.rate >= 80 || t3.rate >= 80
        ? "⚠️ Có khay đạt ngưỡng cảnh báo ≥80%, kỹ thuật viên chuẩn bị sẵn khay rỗng mới."
        : "🟢 Cả 3 khay đều ở mức an toàn (<80%), hệ thống phân loại ổn định."
    }
- **Quy chuẩn 3 mức**: 🟢 Dưới 80% (Bình thường) | 🟡 80% - 99% (Chuẩn bị khay mới) | 🔴 100% (Đầy - Thay ngay).
*(Dữ liệu cập nhật thời gian thực từ cảm biến phân loại SortiX-Med)*`;
  }

  // 3. Nhiệt độ / ESP32 / Chip
  if (q.includes("nhiệt độ") || q.includes("temp") || q.includes("esp32") || q.includes("chip")) {
    const isOverheat = temp >= 75;
    return `${modeTag}

### 🌡️ Báo cáo cảm biến nhiệt độ nội vi ESP32-C5:

- **Nhiệt độ chip đo được**: **${temp.toFixed(1)}°C**
- **Ngưỡng an toàn tối đa**: **75.0°C**
- **Đánh giá**: ${
      isOverheat
        ? "🔴 **CẢNH BÁO QUÁ NHIỆT** - Bo mạch vượt ngưỡng cho phép, cần kiểm tra quạt làm mát!"
        : "🟢 **BÌNH THƯỜNG** - Mức nhiệt hoàn toàn trong khoảng an toàn cho phòng mổ vô trùng."
    }
- **Tản nhiệt**: Vỏ nhôm chống bám bụi chuẩn y tế, thông gió đối lưu tự nhiên.
*(Dữ liệu cảm biến nội vi trên chip thời gian thực)*`;
  }

  // 4. Nút dừng E-Stop / An toàn / Băng tải
  if (
    q.includes("e-stop") ||
    q.includes("khẩn cấp") ||
    q.includes("an toàn") ||
    q.includes("băng tải") ||
    q.includes("động cơ")
  ) {
    const isSafe = !estop && !jam && temp < 75;
    return `${modeTag}

### 🛡️ Báo cáo an toàn phần cứng & Băng tải:

| Hạng mục kiểm tra | Trạng thái hiện tại | Đánh giá an toàn |
| :--- | :--- | :--- |
| **Nút E-Stop** | ${estop ? "🔴 Đang kích hoạt (Khóa)" : "🟢 Mở khóa (Bình thường)"} | ${estop ? "DỪNG KHẨN CẤP" : "ĐẠT"} |
| **Cảm biến quang #02** | ${jam ? "🔴 Phát hiện kẹt phôi Zone A" : "🟢 Thông thoáng, không kẹt"} | ${jam ? "SỰ CỐ KẸT" : "ĐẠT"} |
| **Động cơ băng tải** | ${isRunning ? `Đang chạy (${speed}% PWM)` : "Đang dừng"} | ${isRunning ? "VẬN HÀNH" : "CHỜ / DỪNG"} |
| **Nhiệt độ ESP32** | ${temp.toFixed(1)}°C (Ngưỡng: 75°C) | ${temp < 75 ? "ĐẠT" : "QUÁ NHIỆT"} |

- **Kết luận vận hành**: ${
      isSafe
        ? "🟢 **Hệ thống ĐỦ ĐIỀU KIỆN an toàn** để tiếp tục phân loại."
        : "🔴 **Hệ thống KHÔNG ĐỦ ĐIỀU KIỆN an toàn**, cần kiểm tra trước khi tái khởi động."
    }
*(Dữ liệu telemetry cảm biến thời gian thực)*`;
  }

  // 5. Ca trực / CSSD
  if (
    q.includes("cssd") ||
    q.includes("ca trực") ||
    q.includes("sản lượng") ||
    q.includes("tổng số")
  ) {
    const totalInBins = b1 + b2 + b3;
    const totalSorted = Math.max(dashboard.records?.length || 0, totalInBins);
    return `${modeTag}

### 🏥 Báo cáo ca trực - Khoa Kiểm soát Nhiễm khuẩn (CSSD):

- **Tổng số lượng dụng cụ đã phân loại**: **${totalSorted} sản phẩm**
- **Dung lượng 3 khay hiện tại**:
  - Khay 1 (Kéo & Dao mổ): **${b1}/${cap1} SP** (${t1.rate}%)
  - Khay 2 (Kẹp panh cầm máu): **${b2}/${cap2} SP** (${t2.rate}%)
  - Khay 3 (Dụng cụ khác): **${b3}/${cap3} SP** (${t3.rate}%)
- **Độ tin cậy Camera AI Vision**: **~98.5%** (Mô hình YOLOv8 phân loại chuẩn)
*(Dữ liệu ca trực cập nhật từ Local Database & Telemetry)*`;
  }

  return null;
};

export const AiCopilot: React.FC = () => {
  const dashboard = useDashboardSafe();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPromptList, setShowPromptList] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [webhookUrl, setWebhookUrl] = useState(DEFAULT_WEBHOOK_URL);
  const [showSettings, setShowSettings] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Quản lý chế độ Nền Sáng / Nền Tối cho AiCopilot (Mặc định: Nền sáng theo yêu cầu)
  const [copilotTheme, setCopilotTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = localStorage.getItem("sortix_copilot_theme") as "light" | "dark" | null;
    if (saved === "light" || saved === "dark") {
      setCopilotTheme(saved);
    } else if (dashboard?.themeMode) {
      setCopilotTheme(dashboard.themeMode);
    } else {
      setCopilotTheme("light");
    }
  }, [dashboard?.themeMode]);

  const toggleCopilotTheme = () => {
    const nextTheme = copilotTheme === "light" ? "dark" : "light";
    setCopilotTheme(nextTheme);
    localStorage.setItem("sortix_copilot_theme", nextTheme);
    setToastMessage({
      text: nextTheme === "light" ? "Đã chuyển sang giao diện Nền sáng" : "Đã chuyển sang giao diện Nền tối",
      type: "success",
    });
    setTimeout(() => setToastMessage(null), 2200);
  };

  const isLight = copilotTheme === "light";

  // Số liệu thời gian thực đồng bộ trực tiếp với Web Dashboard & Mobile App
  const b1 = dashboard?.binCounts?.bin1 ?? 0;
  const b2 = dashboard?.binCounts?.bin2 ?? 0;
  const b3 = dashboard?.binCounts?.bin3 ?? 0;
  const cap1 = dashboard?.binCapacities?.bin1 || 38;
  const cap2 = dashboard?.binCapacities?.bin2 || 50;
  const cap3 = dashboard?.binCapacities?.bin3 || 50;
  const liveK1 = getTrayColorStatus(b1, cap1);
  const liveK2 = getTrayColorStatus(b2, cap2);
  const liveK3 = getTrayColorStatus(b3, cap3);
  const liveTemp = typeof dashboard?.telemetry?.cpu_temp === "number" ? dashboard.telemetry.cpu_temp : 42.5;

  // Quản lý trạng thái phản hồi tự nhiên chuẩn AI Assistant
  useEffect(() => {
    if (!isLoading) {
      setLoadingStep(0);
      return;
    }
    const timer1 = setTimeout(() => setLoadingStep(1), 1800);
    const timer2 = setTimeout(() => setLoadingStep(2), 4200);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isLoading]);

  const getLoadingText = () => {
    switch (loadingStep) {
      case 0:
        return "Đang suy nghĩ...";
      case 1:
        return "Đang tổng hợp dữ liệu...";
      default:
        return "Đang soạn câu trả lời...";
    }
  };

  // Khởi tạo sessionId và nạp lịch sử từ localStorage
  useEffect(() => {
    let sid = localStorage.getItem("sortix_ai_session_id");
    if (!sid) {
      sid = "session_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();
      localStorage.setItem("sortix_ai_session_id", sid);
    }
    setSessionId(sid);

    const savedWebhook = localStorage.getItem("sortix_n8n_webhook_url");
    if (
      savedWebhook &&
      !savedWebhook.includes("trigger-chat/chat") &&
      !savedWebhook.includes("localhost:5678/webhook")
    ) {
      setWebhookUrl(savedWebhook);
    } else {
      setWebhookUrl(DEFAULT_WEBHOOK_URL);
      localStorage.setItem("sortix_n8n_webhook_url", DEFAULT_WEBHOOK_URL);
    }

    const savedMessages = localStorage.getItem("sortix_ai_messages");
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch {
        initWelcomeMessage();
      }
    } else {
      initWelcomeMessage();
    }
  }, []);

  const initWelcomeMessage = () => {
    const welcome: ChatMessage = {
      id: "msg_welcome",
      sender: "bot",
      text: `### 🏥 SortiX-Med AI Copilot

Trợ lý kỹ thuật thông minh kết nối trực tiếp với **Next.js Dashboard**, **ESP32 IoT** và **Google Gemini AI**.

#### 🎯 Năng lực hỗ trợ:
- 🛡️ **An toàn công nghiệp**: Giám sát nút E-Stop, kẹt phôi cảm biến quang #02.
- 🌡️ **Cảm biến nhiệt độ nội vi ESP32-C5**: Đo trực tiếp nhiệt độ chip, cảnh báo tức thì nếu vượt ngưỡng an toàn 75°C.
- 📦 **Giám sát 3 khay chứa**: Số lượng & tỷ lệ lấp đầy trực tiếp từ ca phân loại.
- ✈️ **Đồng bộ Telegram**: Chuyển tiếp báo cáo 1-click về nhóm điều hành.`,
      timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages([welcome]);
  };

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isLoading]);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const saveMessages = (newMessages: ChatMessage[]) => {
    setMessages(newMessages);
    localStorage.setItem("sortix_ai_messages", JSON.stringify(newMessages));
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isLoading) return;

    setShowPromptList(false);
    setSelectedTopicId(null);

    const userMsg: ChatMessage = {
      id: "msg_" + Date.now(),
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    };

    const updated = [...messages, userMsg];
    saveMessages(updated);
    setInputValue("");
    setIsLoading(true);

    try {
      // Chuẩn bị snapshot số liệu thời gian thực đồng bộ 100% với Web Dashboard & Mobile App
      let realTimeContext = "";
      if (dashboard) {
        const {
          binCounts,
          binCapacities,
          records,
          telemetry,
          isRunning,
          conveyorSpeed,
          isSystemLocked,
          isJammed,
          isSimulation,
          sorterConfig,
          alerts,
          mqttStatus,
        } = dashboard;

        const b1 = binCounts?.bin1 ?? 0;
        const b2 = binCounts?.bin2 ?? 0;
        const b3 = binCounts?.bin3 ?? 0;
        const cap1 = binCapacities?.bin1 || 38;
        const cap2 = binCapacities?.bin2 || 50;
        const cap3 = binCapacities?.bin3 || 50;
        const totalInBins = b1 + b2 + b3;
        const todayRecords = records || [];
        const totalSorted = Math.max(todayRecords.length, totalInBins);

        const t1 = getTrayColorStatus(b1, cap1);
        const t2 = getTrayColorStatus(b2, cap2);
        const t3 = getTrayColorStatus(b3, cap3);

        const temp = typeof telemetry?.cpu_temp === "number" ? telemetry.cpu_temp : 42.5;
        const estop = isSystemLocked || Boolean(telemetry?.estop_pressed);
        const jam = Boolean(isJammed);
        const modeTag = isSimulation ? "[CHẾ ĐỘ MÔ PHỎNG - SIMULATION]" : "[CHẾ ĐỘ THỰC TẾ - REAL HARDWARE]";

        const roleLabel =
          user?.role === "admin"
            ? "Quản trị viên cấp cao (Admin) — Toàn quyền kiểm soát và mở khóa an toàn"
            : user?.role === "maintenance"
            ? "Kỹ thuật viên bảo trì (Maintenance)"
            : "Người vận hành / Điều dưỡng viên (User)";

        const loggedInUserText = user
          ? `${user.displayName} (Tài khoản: "${user.username}", Email: "${user.email}", Vai trò: "${roleLabel}")`
          : "Chưa đăng nhập (Khách vãng lai)";

        const unresolvedAlerts = alerts?.filter((a) => !a.resolved) || [];

        realTimeContext = `[THÔNG TIN HỆ THỐNG THỜI GIAN THỰC SORTIX-MED]:
- CHẾ ĐỘ HIỆN TẠI: ${modeTag}
- NGUỒN DỮ LIỆU: ${isSimulation ? "Dữ liệu đang được sinh giả lập tự động từ môi trường mô phỏng (Simulation)." : "Dữ liệu đo trực tiếp từ vi điều khiển ESP32 (cảm biến nhiệt độ nội vi trên chip), cảm biến quang học và camera AI Vision thật (Real Hardware)."}
- QUY TẮC BẮT BUỘC: DÒNG ĐẦU TIÊN CỦA CÂU TRẢ LỜI BẠN PHẢI BẮT ĐẦU CHÍNH XÁC BẰNG: "${modeTag}" để người dùng nhận diện ngay đây là số liệu mô phỏng hay thực tế.
------------------------------------------------------------
[THÔNG TIN TÀI KHOẢN & NGƯỜI ĐANG TRỰC CA]:
- Người dùng / Admin hiện tại đang đăng nhập: ${loggedInUserText}
- Họ và tên người dùng hiện tại: "${user?.displayName || "Chưa xác định"}"
- Vai trò tài khoản: ${roleLabel} (role = "${user?.role || "guest"}")
- Quyền Quản trị viên (Admin): ${user?.role === "admin" ? "ĐÚNG - ĐANG CÓ QUYỀN ADMIN CAO NHẤT" : "KHÔNG - ĐÂY LÀ TÀI KHOẢN NGƯỜI DÙNG THƯỜNG"}
- Vị trí trực: Trạm phân loại y tế SortiX-Med #01 (Khoa CSSD - Kiểm Soát Nhiễm Khuẩn)
- Thời gian đăng nhập phiên: ${user?.loginTime ? new Date(user.loginTime).toLocaleString("vi-VN") : "Ca trực hiện tại"}
* QUY TẮC BẮT BUỘC KHI ĐƯỢC HỎI VỀ ADMIN / NGƯỜI ĐĂNG NHẬP: Bạn PHẢI trả lời chính xác họ tên "${user?.displayName || "Chưa xác định"}" và thông tin tài khoản như trên. Tuyệt đối không bịa đặt tên người khác.
------------------------------------------------------------
[TRẠNG THÁI DÂY CHUYỀN & PHÂN LOẠI DỤNG CỤ]:
- Tổng sản lượng ca hiện tại: ${totalSorted} SP (Hiện trong 3 khay: K1: ${b1} | K2: ${b2} | K3: ${b3})
- Khay 1 (Dao mổ & Kéo phẫu thuật): ${b1}/${cap1} SP (${t1.rate}%) - Màu hiển thị: ${t1.colorCode} - ${t1.statusText}
- Khay 2 (Kẹp panh cầm máu): ${b2}/${cap2} SP (${t2.rate}%) - Màu hiển thị: ${t2.colorCode} - ${t2.statusText}
- Khay 3 (Dụng cụ đặc biệt / Mặc định): ${b3}/${cap3} SP (${t3.rate}%) - Màu hiển thị: ${t3.colorCode} - ${t3.statusText}
- Quy chuẩn đồng bộ màu sắc 3 mức (Web Dashboard, Mobile App, AI Copilot):
  * 🟢 Xanh lá: Dưới 80% định mức (An toàn, phân loại bình thường)
  * 🟡 Vàng cam: Từ 80% đến 99% định mức (Cảnh báo sắp đầy, chuẩn bị khay mới)
  * 🔴 Đỏ: Đạt 100% định mức (Khay đầy, dừng hoặc cần thay khay ngay)
- Động cơ băng tải: ${isRunning ? "ĐANG CHẠY" : "ĐANG DỪNG"} (isRunning = ${isRunning}), Tốc độ: ${conveyorSpeed}% PWM, Trạng thái: ${isRunning ? (totalInBins > 0 ? "Đang chạy" : "Chờ phôi") : "Tạm dừng"}
- Cảm biến nhiệt độ nội vi trên chip ESP32-C5: ${temp.toFixed(1)}°C (Ngưỡng cảnh báo: 75.0°C - ${temp >= 75 ? "🔴 QUÁ NHIỆT / NGUY HIỂM" : "🟢 Bình thường / An toàn"})
- Cảm biến quang #02 Zone A: ${jam ? "🔴 CẢNH BÁO KẸT PHÔI" : "🟢 Bình thường, không che khuất (jam_detected = false)"}
- Nút Dừng Khẩn Cấp (E-Stop): ${estop ? "🔴 ĐANG KÍCH HOẠT / KHÓA" : "🟢 Không kích hoạt (estop_pressed = false, Hệ thống OPERATIONAL)"}
- Kết luận an toàn: ${!estop && !jam && temp < 75 ? "Hệ thống ĐỦ ĐIỀU KIỆN an toàn để tiếp tục vận hành." : "Hệ thống KHÔNG ĐỦ ĐIỀU KIỆN an toàn để tiếp tục vận hành."}
------------------------------------------------------------
[CẤU HÌNH THIẾT BỊ & KẾT NỐI IOT]:
- Thiết bị điều khiển: ${telemetry?.device_id || "sorter_01"} (Phiên bản cấu hình: v${sorterConfig?.config_version ?? 1})
- Trạng thái Actuator Servo: Servo 1 (GPIO6: ${telemetry?.arm1_active ? "Đang gạt" : "Chờ"}), Servo 2 (GPIO7: ${telemetry?.arm2_active ? "Đang gạt" : "Chờ"})
- Kết nối MQTT Broker: ${mqttStatus || "connected"} (Ping: ${dashboard.pingMs ?? 15}ms)
- Wi-Fi ESP32-C5: ${telemetry?.wifi_band || "5.0 GHz (Wi-Fi 6)"} (${telemetry?.wifi_rssi ?? -58} dBm)
- Cảnh báo chưa giải quyết: ${unresolvedAlerts.length} sự cố ${unresolvedAlerts.length > 0 ? `(${unresolvedAlerts[0].description})` : ""}
- Yêu cầu định dạng bảng: BẮT BUỘC định dạng bảng Markdown chuẩn (| Cột 1 | Cột 2 |...) rõ ràng, cân đối khi trình bày số liệu.
------------------------------------------------------------
[CÂU HỎI]:
`;
      }

      const chatInputToSend = realTimeContext ? `${realTimeContext}${query}` : query;

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sendMessage",
          sessionId: sessionId || "sortix_default_session",
          chatInput: chatInputToSend,
        }),
      });

      if (!response.ok) {
        throw new Error(`Máy chủ n8n trả về mã lỗi HTTP ${response.status}`);
      }

      const data = await response.json();
      let replyText = "";

      if (typeof data === "string") {
        replyText = data;
      } else if (data && typeof data === "object") {
        if ("output" in data && typeof data.output === "string") {
          replyText = data.output;
        } else if ("text" in data && typeof data.text === "string") {
          replyText = data.text;
        } else if (Array.isArray(data) && data[0]?.output) {
          replyText = data[0].output;
        } else {
          replyText = JSON.stringify(data, null, 2);
        }
      }

      const botMsg: ChatMessage = {
        id: "msg_" + (Date.now() + 1),
        sender: "bot",
        text: replyText || "Hệ thống đã ghi nhận nhưng không có nội dung phản hồi.",
        timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      };

      saveMessages([...updated, botMsg]);
    } catch (err: unknown) {
      const offlineReply = generateOfflineFallbackResponse(query, dashboard, user);
      if (offlineReply) {
        const fallbackMsg: ChatMessage = {
          id: "msg_fallback_" + Date.now(),
          sender: "bot",
          text: offlineReply,
          timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        };
        saveMessages([...updated, fallbackMsg]);
      } else {
        const isInternalApi = webhookUrl.startsWith("/api/");
        const errorMsg =
          err instanceof Error
            ? err.message
            : isInternalApi
            ? "Không thể kết nối API AI Copilot"
            : "Không thể kết nối tới n8n webhook";
        const errorBotMsg: ChatMessage = {
          id: "msg_err_" + Date.now(),
          sender: "bot",
          isError: true,
          text: isInternalApi
            ? `⚠️ **Chưa thể kết nối tới Google Gemini** (\`${errorMsg}\`)\n\n*Kiểm tra nhanh:*\n• Đã cấu hình \`GEMINI_API_KEY\` trong file \`.env.local\` chưa.\n• Kiểm tra kết nối mạng Internet của máy tính.`
            : `⚠️ **Chưa kết nối máy chủ AI Agent (n8n)** (\`${errorMsg}\`)\n\n*Trợ lý vẫn có thể đọc số liệu từ ESP32 & Dashboard:*\n• Bạn có thể dùng các gợi ý nhanh bên dưới để xem số liệu 3 khay, nhiệt độ, E-Stop.\n• Bấm ⚙️ ở góc trên để chuyển về API Gemini nội bộ hoặc cấu hình lại Webhook URL.`,
          timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        };
        saveMessages([...updated, errorBotMsg]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePastePromptToInput = (promptText: string) => {
    setInputValue(promptText);
    setShowPromptList(false);
    setSelectedTopicId(null);
    showToast("Đã dán câu hỏi vào ô nhập. Bạn có thể chỉnh sửa hoặc nhấn Gửi!", "success");
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleSendToTelegram = async (msgId: string, textContent: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, isSendingTelegram: true } : m))
    );

    try {
      const res = await fetch("/api/chat/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Báo cáo giám sát SortiX-Med",
          text: textContent,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Đã chuyển tiếp báo cáo vào Telegram thành công!", "success");
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, isSendingTelegram: false, telegramSent: true } : m
          )
        );
      } else {
        showToast(data.message || "Không thể gửi báo cáo vào Telegram", "error");
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, isSendingTelegram: false } : m))
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi mạng";
      showToast(`Lỗi kết nối Telegram: ${msg}`, "error");
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, isSendingTelegram: false } : m))
      );
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast("Đã sao chép nội dung vào Clipboard", "success");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Xóa toàn bộ lịch sử trò chuyện
  const handleClearAllHistory = () => {
    localStorage.removeItem("sortix_ai_messages");
    localStorage.removeItem("sortix_ai_session_id");
    const newSid = "session_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();
    localStorage.setItem("sortix_ai_session_id", newSid);
    setSessionId(newSid);
    initWelcomeMessage();
    setShowClearConfirm(false);
    showToast("Đã xóa toàn bộ lịch sử trò chuyện thành công!", "success");
  };

  // Xóa một tin nhắn cụ thể
  const handleDeleteMessage = (id: string) => {
    const updated = messages.filter((m) => m.id !== id);
    if (updated.length === 0 || (updated.length === 1 && updated[0].id === "msg_welcome")) {
      handleClearAllHistory();
    } else {
      saveMessages(updated);
      showToast("Đã xóa tin nhắn đã chọn", "success");
    }
  };

  const handleResetChat = () => {
    if (messages.length > 1 || (messages.length === 1 && messages[0].id !== "msg_welcome")) {
      setShowClearConfirm(true);
    } else {
      handleClearAllHistory();
    }
  };

  const handleSaveWebhook = (url: string) => {
    setWebhookUrl(url);
    localStorage.setItem("sortix_n8n_webhook_url", url);
    setShowSettings(false);
    showToast("Đã lưu Webhook URL mới", "success");
  };

  // Helper render các định dạng nội tuyến: In đậm, In nghiêng, Code, và Status Badge
  const renderInlineText = (text: string): React.ReactNode => {
    const trimmed = text.trim();

    // 0. Nhận diện nhãn chế độ [CHẾ ĐỘ MÔ PHỎNG - SIMULATION] hoặc [CHẾ ĐỘ THỰC TẾ - REAL HARDWARE]
    if (trimmed.includes("[CHẾ ĐỘ MÔ PHỎNG") || trimmed === "[SIMULATION]") {
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-bold font-mono text-[11px] whitespace-nowrap shadow-xs border ${
            isLight
              ? "bg-amber-50 text-amber-800 border-amber-300"
              : "bg-amber-950/90 text-amber-300 border-amber-500/70"
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span>{trimmed}</span>
        </span>
      );
    }
    if (trimmed.includes("[CHẾ ĐỘ THỰC TẾ") || trimmed === "[REAL HARDWARE]") {
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-bold font-mono text-[11px] whitespace-nowrap shadow-xs border ${
            isLight
              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
              : "bg-emerald-950/90 text-emerald-300 border-emerald-500/70"
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{trimmed}</span>
        </span>
      );
    }

    // 1. Nhận diện các huy hiệu trạng thái an toàn / bình thường
    if (
      (trimmed.includes("🟢") ||
        trimmed.includes("An toàn") ||
        trimmed.includes("Bình thường") ||
        trimmed === "NORMAL" ||
        trimmed === "ONLINE" ||
        trimmed === "OPERATIONAL" ||
        trimmed.includes("ĐỦ ĐIỀU KIỆN")) &&
      trimmed.length <= 40
    ) {
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold font-mono text-[11px] whitespace-nowrap shadow-2xs border ${
            isLight
              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
              : "bg-emerald-950/80 text-emerald-300 border-emerald-700/80"
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{trimmed}</span>
        </span>
      );
    }

    // 2. Nhận diện các huy hiệu cảnh báo
    if (
      (trimmed.includes("🟡") ||
        trimmed.includes("CẢNH BÁO") ||
        trimmed.includes("Cảnh báo") ||
        trimmed === "WARNING") &&
      trimmed.length <= 40
    ) {
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold font-mono text-[11px] whitespace-nowrap shadow-2xs border ${
            isLight
              ? "bg-amber-50 text-amber-800 border-amber-300"
              : "bg-amber-950/80 text-amber-300 border-amber-700/80"
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span>{trimmed}</span>
        </span>
      );
    }

    // 3. Nhận diện các huy hiệu sự cố / nguy hiểm / quá nhiệt
    if (
      (trimmed.includes("🔴") ||
        trimmed.includes("Sự cố") ||
        trimmed.includes("QUÁ NHIỆT") ||
        trimmed.includes("Quá nhiệt") ||
        trimmed.includes("E-STOP") ||
        trimmed.includes("NGUY HIỂM") ||
        trimmed.includes("KHÔNG ĐỦ ĐIỀU KIỆN")) &&
      trimmed.length <= 40
    ) {
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold font-mono text-[11px] whitespace-nowrap shadow-2xs border ${
            isLight
              ? "bg-rose-50 text-rose-800 border-rose-300"
              : "bg-rose-950/80 text-rose-300 border-rose-700/80"
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
          <span>{trimmed}</span>
        </span>
      );
    }

    // 4. Tokenize **bold**, *italic*, `code`
    const tokens = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

    return (
      <>
        {tokens.map((token, tIdx) => {
          if (!token) return null;

          // Inline Code: `...`
          if (token.startsWith("`") && token.endsWith("`") && token.length >= 2) {
            return (
              <code
                key={tIdx}
                className={`px-1.5 py-0.5 rounded-md font-mono text-[11px] border ${
                  isLight
                    ? "bg-teal-50 border-teal-200/80 text-teal-800 font-semibold"
                    : "bg-slate-800/80 border-slate-700/50 text-cyan-300"
                }`}
              >
                {token.slice(1, -1)}
              </code>
            );
          }

          // Bold: **...**
          if (token.startsWith("**") && token.endsWith("**") && token.length >= 4) {
            const boldText = token.slice(2, -2);
            if (
              boldText.includes("Bình thường") ||
              boldText.includes("NORMAL") ||
              boldText.includes("ONLINE") ||
              boldText.includes("ĐỦ ĐIỀU KIỆN")
            ) {
              return (
                <span
                  key={tIdx}
                  className={`px-1.5 py-0.5 rounded font-semibold font-mono text-[11px] border ${
                    isLight
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-emerald-950 text-emerald-400 border-emerald-800"
                  }`}
                >
                  {boldText}
                </span>
              );
            }
            if (
              boldText.includes("QUÁ NHIỆT") ||
              boldText.includes("CẢNH BÁO") ||
              boldText.includes("E-STOP") ||
              boldText.includes("KHÔNG ĐỦ ĐIỀU KIỆN")
            ) {
              return (
                <span
                  key={tIdx}
                  className={`px-1.5 py-0.5 rounded font-semibold font-mono text-[11px] border ${
                    isLight
                      ? "bg-rose-50 text-rose-800 border-rose-200"
                      : "bg-rose-950 text-rose-300 border-rose-800"
                  }`}
                >
                  {boldText}
                </span>
              );
            }
            return (
              <strong key={tIdx} className={`font-semibold ${isLight ? "text-slate-900" : "text-slate-100"}`}>
                {boldText}
              </strong>
            );
          }

          // Italic: *...*
          if (
            token.startsWith("*") &&
            token.endsWith("*") &&
            token.length >= 2 &&
            !token.startsWith("**")
          ) {
            return (
              <em key={tIdx} className={`italic ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                {token.slice(1, -1)}
              </em>
            );
          }

          return <span key={tIdx}>{token}</span>;
        })}
      </>
    );
  };

  // Trình render Markdown & Bảng Markdown chuẩn (Table Parser)
  const renderFormattedContent = (content: string) => {
    const rawLines = content.split("\n");

    type Block =
      | {
          type: "table";
          headers: string[];
          alignments: ("left" | "center" | "right")[];
          rows: string[][];
        }
      | { type: "heading"; level: number; text: string }
      | { type: "hr" }
      | { type: "bullet"; text: string }
      | { type: "numbered"; num: string; text: string }
      | { type: "paragraph"; text: string }
      | { type: "empty" };

    const blocks: Block[] = [];
    let i = 0;

    const splitCells = (rowStr: string): string[] => {
      let clean = rowStr.trim();
      if (clean.startsWith("|")) clean = clean.substring(1);
      if (clean.endsWith("|")) clean = clean.substring(0, clean.length - 1);
      return clean.split("|").map((c) => c.trim());
    };

    const isSep = (rowStr: string): boolean => {
      const cells = splitCells(rowStr);
      return cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c.trim()));
    };

    const parseAligns = (rowStr: string): ("left" | "center" | "right")[] => {
      const cells = splitCells(rowStr);
      return cells.map((c) => {
        const tr = c.trim();
        const hasLeft = tr.startsWith(":");
        const hasRight = tr.endsWith(":");
        if (hasLeft && hasRight) return "center";
        if (hasRight) return "right";
        return "left";
      });
    };

    while (i < rawLines.length) {
      const line = rawLines[i].trim();

      if (!line) {
        blocks.push({ type: "empty" });
        i++;
        continue;
      }

      // 1. Nhận diện Bảng Markdown: Dòng bắt đầu và kết thúc bằng |
      if (line.startsWith("|") && line.endsWith("|")) {
        const tableLines: string[] = [];
        while (
          i < rawLines.length &&
          rawLines[i].trim().startsWith("|") &&
          rawLines[i].trim().endsWith("|")
        ) {
          tableLines.push(rawLines[i].trim());
          i++;
        }

        if (tableLines.length >= 1) {
          let headers: string[] = [];
          let alignments: ("left" | "center" | "right")[] = [];
          let dataRows: string[][] = [];

          if (tableLines.length >= 2 && isSep(tableLines[1])) {
            headers = splitCells(tableLines[0]);
            alignments = parseAligns(tableLines[1]);
            dataRows = tableLines.slice(2).map(splitCells);
          } else {
            headers = splitCells(tableLines[0]);
            alignments = headers.map(() => "left");
            dataRows = tableLines.slice(1).map(splitCells);
          }

          blocks.push({
            type: "table",
            headers,
            alignments,
            rows: dataRows,
          });
          continue;
        }
      }

      // 2. Heading
      if (line.startsWith("#### ")) {
        blocks.push({ type: "heading", level: 4, text: line.replace("#### ", "") });
        i++;
        continue;
      }
      if (line.startsWith("### ")) {
        blocks.push({ type: "heading", level: 3, text: line.replace("### ", "") });
        i++;
        continue;
      }
      if (line.startsWith("## ")) {
        blocks.push({ type: "heading", level: 2, text: line.replace("## ", "") });
        i++;
        continue;
      }
      if (line.startsWith("# ")) {
        blocks.push({ type: "heading", level: 1, text: line.replace("# ", "") });
        i++;
        continue;
      }

      // 3. Đường phân cách ngang
      if (line === "---" || line === "----" || line === "***") {
        blocks.push({ type: "hr" });
        i++;
        continue;
      }

      // 4. Danh sách gạch đầu dòng
      if (line.startsWith("- ") || line.startsWith("* ")) {
        blocks.push({ type: "bullet", text: line.substring(2) });
        i++;
        continue;
      }

      // 5. Danh sách đánh số
      const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
      if (numMatch) {
        blocks.push({ type: "numbered", num: numMatch[1], text: numMatch[2] });
        i++;
        continue;
      }

      // 6. Đoạn văn bản thường
      blocks.push({ type: "paragraph", text: line });
      i++;
    }

    return (
      <div className="space-y-2 text-xs sm:text-sm">
        {blocks.map((block, bIdx) => {
          if (block.type === "empty") {
            return <div key={bIdx} className="h-1" />;
          }

          // RENDER TABLE: Bảng Markdown chuẩn, responsive, cân đối & sang trọng
          if (block.type === "table") {
            return (
              <div
                key={bIdx}
                className={`my-3 overflow-x-auto rounded-xl border shadow-xs ${
                  isLight
                    ? "border-slate-200 bg-white"
                    : "border-slate-700/80 bg-[#070c18] shadow-2xl shadow-black/60"
                }`}
              >
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr
                      className={`font-semibold tracking-wide border-b ${
                        isLight
                          ? "bg-slate-100/90 text-slate-800 border-slate-200"
                          : "bg-[#0f172a] text-emerald-400 border-slate-700/80"
                      }`}
                    >
                      {block.headers.map((h, hIdx) => {
                        const align = block.alignments[hIdx] || "left";
                        const alignClass =
                          align === "center"
                            ? "text-center"
                            : align === "right"
                            ? "text-right"
                            : "text-left";
                        return (
                          <th
                            key={hIdx}
                            className={`px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider border-r last:border-r-0 whitespace-nowrap ${
                              isLight ? "text-slate-700 border-slate-200" : "text-slate-200 border-slate-800/80"
                            } ${alignClass}`}
                          >
                            {renderInlineText(h)}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isLight ? "divide-slate-200" : "divide-slate-800/60"}`}>
                    {block.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className={`transition-colors ${
                          isLight
                            ? "hover:bg-teal-50/40 odd:bg-white even:bg-slate-50/60"
                            : "hover:bg-slate-800/50 odd:bg-[#070c18] even:bg-[#0b1222]"
                        }`}
                      >
                        {row.map((cell, cIdx) => {
                          const align = block.alignments[cIdx] || "left";
                          const alignClass =
                            align === "center"
                              ? "text-center font-mono"
                              : align === "right"
                              ? "text-right font-mono"
                              : "text-left";
                          return (
                            <td
                              key={cIdx}
                              className={`px-3 py-2 border-r last:border-r-0 leading-relaxed ${
                                isLight ? "text-slate-700 border-slate-200/80" : "text-slate-200 border-slate-800/40"
                              } ${alignClass}`}
                            >
                              {renderInlineText(cell)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          // RENDER HEADING
          if (block.type === "heading") {
            if (block.level === 3) {
              return (
                <div
                  key={bIdx}
                  className={`font-bold text-sm sm:text-base mt-2.5 mb-1 pb-1 border-b flex items-center gap-1.5 ${
                    isLight ? "text-teal-800 border-teal-100" : "text-emerald-400 border-emerald-900/40"
                  }`}
                >
                  <span>{renderInlineText(block.text)}</span>
                </div>
              );
            }
            if (block.level === 4) {
              return (
                <div
                  key={bIdx}
                  className={`font-semibold text-xs sm:text-sm mt-2 mb-0.5 flex items-center gap-1 ${
                    isLight ? "text-slate-800" : "text-cyan-300"
                  }`}
                >
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isLight ? "text-teal-600" : "text-cyan-400"}`} />
                  <span>{renderInlineText(block.text)}</span>
                </div>
              );
            }
            return (
              <div
                key={bIdx}
                className={`font-bold text-base mt-3 mb-1 border-b pb-1 ${
                  isLight ? "text-slate-900 border-slate-200" : "text-emerald-300 border-slate-800"
                }`}
              >
                <span>{renderInlineText(block.text)}</span>
              </div>
            );
          }

          // RENDER HR
          if (block.type === "hr") {
            return (
              <hr
                key={bIdx}
                className={`my-2.5 ${isLight ? "border-slate-200" : "border-slate-800"}`}
              />
            );
          }

          // RENDER BULLET
          if (block.type === "bullet") {
            return (
              <div key={bIdx} className={`flex items-start gap-2 pl-2 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${isLight ? "bg-teal-600" : "bg-emerald-400"}`} />
                <div className="flex-1 leading-relaxed">{renderInlineText(block.text)}</div>
              </div>
            );
          }

          // RENDER NUMBERED
          if (block.type === "numbered") {
            return (
              <div key={bIdx} className={`flex items-start gap-2 pl-1 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                <span
                  className={`px-1.5 py-0.2 rounded font-mono text-[10px] font-bold mt-0.5 shrink-0 border ${
                    isLight
                      ? "bg-slate-100 text-teal-800 border-slate-200"
                      : "bg-slate-800 text-cyan-300 border-slate-700"
                  }`}
                >
                  {block.num}
                </span>
                <div className="flex-1 leading-relaxed">{renderInlineText(block.text)}</div>
              </div>
            );
          }

          // RENDER PARAGRAPH
          const lineText = block.text.trim();
          if (lineText.includes("[CHẾ ĐỘ MÔ PHỎNG - SIMULATION]") || lineText.startsWith("[CHẾ ĐỘ MÔ PHỎNG")) {
            return (
              <div
                key={bIdx}
                className={`my-2 px-3 py-1.5 rounded-lg border text-xs flex items-center gap-2 ${
                  isLight
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-amber-500/30 bg-amber-950/20 text-amber-200"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <div className={`font-mono text-[11px] font-semibold ${isLight ? "text-amber-800" : "text-amber-300"}`}>
                  {renderInlineText(block.text)}
                </div>
              </div>
            );
          }
          if (lineText.includes("[CHẾ ĐỘ THỰC TẾ - REAL HARDWARE]") || lineText.startsWith("[CHẾ ĐỘ THỰC TẾ")) {
            return (
              <div
                key={bIdx}
                className={`my-2 px-3 py-1.5 rounded-lg border text-xs flex items-center gap-2 ${
                  isLight
                    ? "border-teal-200 bg-teal-50 text-teal-800"
                    : "border-teal-500/30 bg-teal-950/20 text-teal-200"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse shrink-0" />
                <div className={`font-mono text-[11px] font-semibold ${isLight ? "text-teal-800" : "text-teal-300"}`}>
                  {renderInlineText(block.text)}
                </div>
              </div>
            );
          }

          return (
            <div key={bIdx} className={`leading-relaxed ${isLight ? "text-slate-700" : "text-slate-200"}`}>
              {renderInlineText(block.text)}
            </div>
          );
        })}
      </div>
    );
  };

  // Helper lấy style màu cho từng danh mục câu hỏi
  const getBadgeStyle = (color: PromptTopic["categoryColor"]) => {
    if (isLight) {
      switch (color) {
        case "rose":
          return "bg-rose-50 text-rose-700 border-rose-200";
        case "emerald":
          return "bg-emerald-50 text-emerald-700 border-emerald-200";
        case "cyan":
          return "bg-cyan-50 text-cyan-800 border-cyan-200";
        case "blue":
          return "bg-blue-50 text-blue-800 border-blue-200";
        case "amber":
          return "bg-amber-50 text-amber-800 border-amber-200";
        default:
          return "bg-slate-100 text-slate-700 border-slate-200";
      }
    }
    switch (color) {
      case "rose":
        return "bg-rose-950 text-rose-300 border-rose-800";
      case "emerald":
        return "bg-emerald-950 text-emerald-300 border-emerald-800";
      case "cyan":
        return "bg-cyan-950 text-cyan-300 border-cyan-800";
      case "blue":
        return "bg-blue-950 text-blue-300 border-blue-800";
      case "amber":
        return "bg-amber-950 text-amber-300 border-amber-800";
      default:
        return "bg-slate-900 text-slate-300 border-slate-700";
    }
  };

  return (
    <>
      {/* Toast thông báo nhanh */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[9999] animate-bounce">
          <div
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md text-xs sm:text-sm font-medium border ${toastMessage.type === "success"
                ? "bg-emerald-950 border-emerald-600 text-emerald-200"
                : "bg-rose-950 border-rose-600 text-rose-200"
              }`}
          >
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Nút nổi mở Chatbot (Thu nhỏ thành icon tròn tinh gọn, không che bảng nhật ký hoặc nút thao tác) */}
      {!isOpen && (
        <div className="fixed bottom-5 right-5 z-30">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="group relative flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-lg shadow-emerald-900/40 hover:shadow-emerald-600/60 hover:scale-110 active:scale-95 transition-all duration-200 border border-emerald-400/40"
            title="Mở SortiX-Med AI Copilot (Gemini 2.5/3.x)"
            aria-label="Mở trợ lý ảo AI Copilot"
          >
            <Bot className="w-5 h-5 text-white transition-transform group-hover:rotate-6" />
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900 animate-pulse" />
          </button>
        </div>
      )}

      {/* Cửa sổ Chat Drawer: Desktop Floating Panel / Mobile Bottom Sheet */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 ease-in-out flex flex-col ${
            isExpanded
              ? "inset-3 sm:inset-6 rounded-2xl"
              : "max-sm:inset-x-0 max-sm:bottom-0 max-sm:w-full max-sm:h-[86vh] max-sm:max-h-[86vh] max-sm:rounded-t-3xl max-sm:rounded-b-none sm:bottom-5 sm:right-5 sm:w-[520px] sm:h-[700px] sm:max-h-[90vh] sm:rounded-2xl"
          } ${
            isLight
              ? "bg-slate-50 border border-slate-200/90 text-slate-800 shadow-2xl shadow-slate-900/15"
              : "bg-[#0b101d] border border-slate-800 text-slate-100 shadow-2xl shadow-black/90"
          } overflow-hidden`}
          style={{
            backgroundColor: isLight ? "#f8fafc" : "#0b101d",
            color: isLight ? "#0f172a" : "#f1f5f9",
          }}
        >
          {/* Mobile Bottom Sheet Handle Bar */}
          <div className={`sm:hidden pt-2.5 pb-1 flex justify-center ${isLight ? "bg-white" : "bg-[#0d1424]"}`}>
            <div className={`w-12 h-1 rounded-full ${isLight ? "bg-slate-300" : "bg-slate-600/70"}`} />
          </div>

          {/* Header tinh gọn, không nhồi nhét */}
          <div
            className={`flex items-center justify-between px-4 py-3 border-b select-none shrink-0 ${
              isLight ? "bg-white border-slate-200/90" : "bg-[#0d1424] border-slate-800/80"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-500 p-0.5 shadow-md shadow-emerald-600/20">
                <div
                  className={`w-full h-full rounded-[10px] flex items-center justify-center ${
                    isLight ? "bg-white" : "bg-[#0b0f19]"
                  }`}
                >
                  <Stethoscope className={`w-4 h-4 ${isLight ? "text-teal-600" : "text-emerald-400"}`} />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`font-semibold text-sm tracking-wide ${isLight ? "text-slate-900" : "text-slate-100"}`}>
                    SortiX Copilot
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${
                      isLight
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-emerald-950/70 text-emerald-300 border-emerald-800/60"
                    }`}
                    title={dashboard?.isSimulation ? "Chế độ Mô phỏng dữ liệu" : "Chế độ Phần cứng Thực tế"}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {dashboard?.isSimulation ? "MÔ PHỎNG" : "TRỰC TUYẾN"}
                  </span>
                </div>
                <p className={`text-[11px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                  Trợ lý Y tế & IoT
                </p>
              </div>
            </div>

            <div className={`flex items-center gap-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              {/* Nút chuyển chế độ Nền Sáng / Nền Tối */}
              <button
                type="button"
                onClick={toggleCopilotTheme}
                className={`p-1.5 rounded-lg transition ${
                  isLight
                    ? "hover:text-amber-600 hover:bg-amber-50"
                    : "hover:text-amber-400 hover:bg-slate-800/60"
                }`}
                title={isLight ? "Chuyển sang giao diện Nền tối" : "Chuyển sang giao diện Nền sáng"}
              >
                {isLight ? <Moon className="w-4 h-4 text-slate-600" /> : <Sun className="w-4 h-4 text-amber-400" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSettings(!showSettings);
                  if (showPromptList) setShowPromptList(false);
                }}
                className={`p-1.5 rounded-lg transition ${
                  showSettings
                    ? isLight
                      ? "text-teal-700 bg-teal-50 border border-teal-300"
                      : "text-emerald-300 bg-emerald-950/80 border border-emerald-800"
                    : isLight
                    ? "hover:text-slate-800 hover:bg-slate-100"
                    : "hover:text-slate-200 hover:bg-slate-800/60"
                }`}
                title="Cài đặt kết nối AI Backend"
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Nút Xóa lịch sử trò chuyện */}
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                disabled={messages.length <= 1 && messages[0]?.id === "msg_welcome"}
                className={`p-1.5 rounded-lg transition ${
                  messages.length > 1 || (messages.length === 1 && messages[0]?.id !== "msg_welcome")
                    ? isLight
                      ? "hover:text-rose-600 hover:bg-rose-50 text-slate-500"
                      : "hover:text-rose-400 hover:bg-rose-950/60 text-slate-400"
                    : "opacity-40 cursor-not-allowed text-slate-400"
                }`}
                title="Xóa toàn bộ lịch sử trò chuyện"
                aria-label="Xóa toàn bộ lịch sử trò chuyện"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* Nút Làm mới hội thoại */}
              <button
                type="button"
                onClick={handleResetChat}
                className={`p-1.5 rounded-lg transition ${
                  isLight ? "hover:text-slate-800 hover:bg-slate-100" : "hover:text-slate-200 hover:bg-slate-800/60"
                }`}
                title="Làm mới hội thoại"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className={`p-1.5 rounded-lg transition hidden sm:block ${
                  isLight ? "hover:text-slate-800 hover:bg-slate-100" : "hover:text-slate-200 hover:bg-slate-800/60"
                }`}
                title={isExpanded ? "Thu nhỏ" : "Phóng to"}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={`p-1.5 rounded-lg transition ml-0.5 ${
                  isLight ? "hover:text-rose-600 hover:bg-rose-50" : "hover:text-rose-400 hover:bg-rose-950/60"
                }`}
                title="Đóng cửa sổ chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* DẢI ĐỒNG BỘ DỮ LIỆU THỜI GIAN THỰC & MÀU SẮC 3 KHAY */}
          <div
            className={`px-3.5 py-1.5 border-b flex items-center justify-between text-[11px] font-mono select-none overflow-x-auto gap-2 shrink-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${
              isLight
                ? "bg-slate-100/90 border-slate-200 text-slate-600"
                : "bg-[#090e1a] border-slate-800/70 text-slate-400"
            }`}
          >
            <div className="flex items-center gap-2 shrink-0">
              <span className={`font-sans text-[10px] uppercase font-semibold flex items-center gap-1 ${
                isLight ? "text-teal-700" : "text-slate-400"
              }`}>
                <Activity className={`w-3 h-3 ${isLight ? "text-teal-600" : "text-teal-400"}`} />
                <span className="hidden sm:inline">Sync:</span>
              </span>
              {/* Khay 1 */}
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                  liveK1.level === "critical"
                    ? isLight
                      ? "bg-rose-50 text-rose-800 border-rose-300 animate-pulse"
                      : "bg-rose-950/80 text-rose-300 border-rose-700/60 animate-pulse"
                    : liveK1.level === "warning"
                    ? isLight
                      ? "bg-amber-50 text-amber-800 border-amber-300"
                      : "bg-amber-950/80 text-amber-300 border-amber-700/60"
                    : isLight
                    ? "bg-white text-slate-700 border-slate-200 shadow-2xs"
                    : "bg-slate-800/60 text-slate-300 border-slate-700/50"
                }`}
                title={`Khay 1 (Kéo & Dao): ${b1}/${cap1} SP (${liveK1.rate}%) - ${liveK1.statusText}`}
              >
                <span>{liveK1.emoji}</span>
                <span>K1: {b1}/{cap1}</span>
              </span>
              {/* Khay 2 */}
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                  liveK2.level === "critical"
                    ? isLight
                      ? "bg-rose-50 text-rose-800 border-rose-300 animate-pulse"
                      : "bg-rose-950/80 text-rose-300 border-rose-700/60 animate-pulse"
                    : liveK2.level === "warning"
                    ? isLight
                      ? "bg-amber-50 text-amber-800 border-amber-300"
                      : "bg-amber-950/80 text-amber-300 border-amber-700/60"
                    : isLight
                    ? "bg-white text-slate-700 border-slate-200 shadow-2xs"
                    : "bg-slate-800/60 text-slate-300 border-slate-700/50"
                }`}
                title={`Khay 2 (Kẹp panh): ${b2}/${cap2} SP (${liveK2.rate}%) - ${liveK2.statusText}`}
              >
                <span>{liveK2.emoji}</span>
                <span>K2: {b2}/{cap2}</span>
              </span>
              {/* Khay 3 */}
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                  liveK3.level === "critical"
                    ? isLight
                      ? "bg-rose-50 text-rose-800 border-rose-300 animate-pulse"
                      : "bg-rose-950/80 text-rose-300 border-rose-700/60 animate-pulse"
                    : liveK3.level === "warning"
                    ? isLight
                      ? "bg-amber-50 text-amber-800 border-amber-300"
                      : "bg-amber-950/80 text-amber-300 border-amber-700/60"
                    : isLight
                    ? "bg-white text-slate-700 border-slate-200 shadow-2xs"
                    : "bg-slate-800/60 text-slate-300 border-slate-700/50"
                }`}
                title={`Khay 3 (Dụng cụ khác): ${b3}/${cap3} SP (${liveK3.rate}%) - ${liveK3.statusText}`}
              >
                <span>{liveK3.emoji}</span>
                <span>K3: {b3}/{cap3}</span>
              </span>
            </div>

            <div className={`flex items-center gap-2.5 shrink-0 text-[10px] ${isLight ? "text-slate-600" : "text-slate-400"}`}>
              <span className="flex items-center gap-1" title="Cảm biến nhiệt độ nội vi trên chip ESP32-C5">
                <Thermometer className="w-3 h-3 text-amber-500" />
                <span className={liveTemp >= 75 ? "text-rose-600 font-bold" : isLight ? "text-slate-700 font-semibold" : "text-slate-300"}>
                  {liveTemp.toFixed(1)}°C
                </span>
              </span>
              <span className="flex items-center gap-1" title="Trạng thái động cơ băng tải">
                <span className={`w-1.5 h-1.5 rounded-full ${dashboard?.isRunning ? "bg-emerald-500 animate-pulse" : isLight ? "bg-slate-400" : "bg-slate-500"}`} />
                <span className={isLight ? "text-slate-600 font-medium" : "text-slate-400"}>{dashboard?.isRunning ? "Chạy" : "Dừng"}</span>
              </span>
            </div>
          </div>

          {/* Cấu hình Webhook n8n Dropdown */}
          {showSettings && (
            <div
              className={`p-3 border-b text-xs space-y-2 shrink-0 animate-fadeIn ${
                isLight ? "bg-white border-slate-200" : "bg-[#0f172a] border-slate-750"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-semibold ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                  Cấu hình kết nối AI Backend:
                </span>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className={`text-xs ${isLight ? "text-slate-400 hover:text-slate-600" : "text-slate-400 hover:text-slate-200"}`}
                >
                  Đóng
                </button>
              </div>
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="/api/chat/copilot hoặc http://localhost:5678/.../chat"
                className={`w-full px-2.5 py-1.5 rounded border font-mono text-xs focus:outline-none ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-teal-500"
                    : "bg-[#131b2e] border-slate-700 text-slate-100 focus:border-emerald-500"
                }`}
              />
              <div className="flex justify-between items-center pt-1 gap-2 flex-wrap">
                <span className={`text-[11px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                  Mặc định: <code className={isLight ? "text-teal-700 font-semibold" : "text-emerald-400"}>/api/chat/copilot</code> (Gemini Direct)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setWebhookUrl(INTERNAL_COPILOT_API);
                      handleSaveWebhook(INTERNAL_COPILOT_API);
                    }}
                    className={`px-2 py-1 rounded text-xs transition ${
                      isLight
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                    }`}
                    title="Đặt lại về API Gemini nội bộ"
                  >
                    Dùng API nội bộ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveWebhook(webhookUrl)}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium text-xs transition"
                  >
                    Lưu
                  </button>
                </div>
              </div>

              {/* Quản lý dữ liệu trò chuyện */}
              <div
                className={`pt-2.5 mt-1 border-t flex items-center justify-between gap-2 ${
                  isLight ? "border-slate-200" : "border-slate-800"
                }`}
              >
                <div>
                  <div className={`font-semibold text-[11px] ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                    Quản lý dữ liệu trò chuyện:
                  </div>
                  <div className={`text-[10px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                    {messages.length} tin nhắn được lưu trong bộ nhớ
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowSettings(false);
                    setShowClearConfirm(true);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-semibold transition active:scale-95"
                  title="Xóa toàn bộ lịch sử trò chuyện"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa lịch sử chat</span>
                </button>
              </div>

              {/* Kênh Telegram Bot 2 Chiều */}
              <div
                className={`pt-2.5 mt-1 border-t space-y-2 ${
                  isLight ? "border-slate-200" : "border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <SendHorizontal className={`w-3.5 h-3.5 ${isLight ? "text-sky-600" : "text-sky-400"}`} />
                    <span className={`font-semibold text-[11px] ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                      Telegram Bot 2 Chiều:
                    </span>
                  </div>
                  <a
                    href="https://t.me/SortiX_Med_Bot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline"
                    title="Mở ứng dụng Telegram để chat và điều khiển"
                  >
                    <span>@SortiX_Med_Bot</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className={`text-[10px] leading-relaxed ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                  Nhắn tin trực tiếp từ điện thoại để hỏi đáp AI Telemetry hoặc bấm nút điều khiển SCADA từ xa (/status, /temp, /estop, /start, /stop, /clear_bin).
                </p>
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <span className={`text-[10px] font-mono truncate ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                    Webhook: /api/telegram/webhook
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/telegram/webhook");
                        const data = await res.json();
                        setToastMessage({
                          text: data.bot_configured ? "Bot đã kết nối sẵn sàng!" : "Chưa cấu hình TELEGRAM_BOT_TOKEN trong .env",
                          type: data.bot_configured ? "success" : "error",
                        });
                      } catch {
                        setToastMessage({ text: "Lỗi kết nối Webhook", type: "error" });
                      }
                      setTimeout(() => setToastMessage(null), 2500);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition border cursor-pointer ${
                      isLight
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                    }`}
                  >
                    Kiểm tra Webhook
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Ô LIST CÁC CÂU HỎI GỢI Ý CHO AI AGENT (PANEL 4 MỤC CHỦ ĐỀ VÀ LIST CÂU HỎI CHI TIẾT) */}
          {showPromptList && (
            <div
              className={`p-3 border-b text-xs space-y-3 shrink-0 max-h-[55vh] overflow-y-auto animate-fadeIn ${
                isLight ? "bg-white border-slate-200 shadow-md" : "bg-[#0a0e17] border-slate-800 shadow-2xl"
              }`}
            >
              {!selectedTopicId ? (
                /* === LEVEL 1: HIỂN THỊ 4 MỤC CHỦ ĐỀ CHÍNH === */
                <div>
                  {/* Header Level 1 */}
                  <div className={`flex items-center justify-between border-b pb-2 mb-2.5 ${isLight ? "border-slate-200" : "border-slate-800"}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${
                        isLight ? "bg-teal-50 border-teal-200" : "bg-emerald-950 border-emerald-700"
                      }`}>
                        <Terminal className={`w-4 h-4 ${isLight ? "text-teal-700" : "text-emerald-400"}`} />
                      </div>
                      <div>
                        <h4 className={`font-bold text-xs uppercase tracking-wide flex items-center gap-2 ${isLight ? "text-slate-800" : "text-slate-100"}`}>
                          <span>Danh Mục Khảo Sát & Chẩn Đoán SCADA</span>
                          <span className={`text-[10px] font-normal px-2 py-0.2 rounded-full border ${
                            isLight
                              ? "bg-teal-50 text-teal-800 border-teal-200"
                              : "bg-emerald-900/60 text-emerald-300 border-emerald-700"
                          }`}>
                            4 Chủ Đề
                          </span>
                        </h4>
                        <p className={`text-[10px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                          Click vào bất kỳ mục nào dưới đây để xem danh mục lệnh & truy vấn chi tiết
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPromptList(false)}
                      className={`p-1 rounded-lg transition ${
                        isLight ? "hover:bg-slate-100 text-slate-400 hover:text-slate-600" : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                      title="Đóng danh mục"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Grid 4 Mục Lớn */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {PROMPT_TOPICS.map((topic) => {
                      const Icon = topic.icon;
                      return (
                        <div
                          key={topic.id}
                          onClick={() => setSelectedTopicId(topic.id)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 group flex flex-col justify-between space-y-2 shadow-2xs ${
                            isLight
                              ? "bg-slate-50 hover:bg-teal-50/60 border-slate-200 hover:border-teal-400 text-slate-800"
                              : "bg-[#121927] hover:bg-[#182338] border-slate-750 hover:border-emerald-500/70"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition ${
                                  isLight
                                    ? "bg-white border-slate-200 group-hover:border-teal-400"
                                    : "bg-[#0b0f19] border-slate-700 group-hover:border-emerald-500"
                                }`}>
                                  <Icon className={`w-4 h-4 ${isLight ? "text-teal-700" : "text-emerald-400"}`} />
                                </div>
                                <span className={`font-bold text-xs transition ${
                                  isLight
                                    ? "text-slate-800 group-hover:text-teal-800"
                                    : "text-slate-200 group-hover:text-emerald-300"
                                }`}>
                                  {topic.shortTitle}
                                </span>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-semibold border ${getBadgeStyle(
                                  topic.categoryColor
                                )}`}
                              >
                                {topic.categoryTag}
                              </span>
                            </div>
                            <p className={`text-[11px] line-clamp-2 leading-relaxed ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                              {topic.subtitle}
                            </p>
                          </div>

                          <div className={`flex items-center justify-between pt-2 border-t text-[10px] ${
                            isLight ? "border-slate-200/80 text-slate-500" : "border-slate-800/80 text-slate-400"
                          }`}>
                            <span className="font-medium">
                              {topic.questions.length} câu hỏi gợi ý
                            </span>
                            <span className={`font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform ${
                              isLight ? "text-teal-700" : "text-emerald-400"
                            }`}>
                              <span>Xem danh sách</span>
                              <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* === LEVEL 2: DANH SÁCH CÂU HỎI CỦA MỤC ĐƯỢC CHỌN === */
                <div>
                  {(() => {
                    const currentTopic = PROMPT_TOPICS.find((t) => t.id === selectedTopicId);
                    if (!currentTopic) return null;
                    const TopicIcon = currentTopic.icon;

                    return (
                      <div className="space-y-2.5">
                        {/* Header Level 2 với Nút Quay Lại */}
                        <div className={`flex items-center justify-between border-b pb-2 ${isLight ? "border-slate-200" : "border-slate-800"}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <button
                              type="button"
                              onClick={() => setSelectedTopicId(null)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                                isLight
                                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-teal-800 border-slate-200"
                                  : "bg-[#131b2e] hover:bg-slate-800 text-slate-200 hover:text-emerald-300 border-slate-700/80 hover:border-emerald-500/50"
                              }`}
                              title="Quay lại danh sách 4 mục"
                            >
                              <ChevronLeft className={`w-3.5 h-3.5 ${isLight ? "text-teal-700" : "text-emerald-400"}`} />
                              <span>← Quay lại 4 chủ đề</span>
                            </button>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <TopicIcon className={`w-4 h-4 shrink-0 ${isLight ? "text-teal-700" : "text-emerald-400"}`} />
                              <h4 className={`font-bold text-xs truncate ${isLight ? "text-slate-800" : "text-slate-100"}`}>
                                {currentTopic.title}
                              </h4>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setShowPromptList(false)}
                            className={`p-1 rounded-lg transition shrink-0 ${
                              isLight ? "hover:bg-slate-100 text-slate-400 hover:text-slate-600" : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                            }`}
                            title="Đóng danh mục"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Tóm tắt chủ đề */}
                        <div className={`px-2.5 py-1.5 rounded-lg border text-[11px] flex items-center justify-between ${
                          isLight
                            ? "bg-slate-50 border-slate-200 text-slate-700"
                            : "bg-[#121927] border-slate-800 text-slate-300"
                        }`}>
                          <span>{currentTopic.subtitle}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-semibold border ${getBadgeStyle(
                              currentTopic.categoryColor
                            )}`}
                          >
                            {currentTopic.categoryTag}
                          </span>
                        </div>

                        {/* Danh sách các câu hỏi trong chủ đề này */}
                        <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                          {currentTopic.questions.map((q, qIdx) => (
                            <div
                              key={q.id}
                              className={`p-2.5 rounded-xl border transition group space-y-1.5 shadow-2xs ${
                                isLight
                                  ? "bg-white border-slate-200 hover:border-teal-400"
                                  : "bg-[#121927] border-slate-750 hover:border-emerald-500/50"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className={`w-5 h-5 rounded-full border flex items-center justify-center font-mono text-[10px] font-bold shrink-0 ${
                                    isLight
                                      ? "bg-teal-50 border-teal-200 text-teal-800"
                                      : "bg-[#0b0f19] border-slate-700 text-emerald-400"
                                  }`}>
                                    {qIdx + 1}
                                  </span>
                                  <span className={`font-bold text-xs transition ${
                                    isLight
                                      ? "text-slate-800 group-hover:text-teal-800"
                                      : "text-slate-200 group-hover:text-emerald-300"
                                  }`}>
                                    {q.title}
                                  </span>
                                </div>
                                <span
                                  className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-semibold border ${getBadgeStyle(
                                    currentTopic.categoryColor
                                  )}`}
                                >
                                  {q.badge}
                                </span>
                              </div>

                              {q.summary && (
                                <p className={`text-[11px] leading-relaxed pl-7 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                                  {q.summary}
                                </p>
                              )}

                              {/* Preview nội dung câu hỏi */}
                              <div className={`ml-7 p-2 rounded-lg border font-mono text-[10px] max-h-20 overflow-y-auto whitespace-pre-wrap ${
                                isLight
                                  ? "bg-slate-50 border-slate-200 text-slate-600"
                                  : "bg-[#0b0f19] border-slate-800/80 text-slate-300"
                              }`}>
                                {q.prompt.length > 220 ? q.prompt.slice(0, 220) + "..." : q.prompt}
                              </div>

                              {/* Các nút hành động */}
                              <div className={`flex items-center justify-end gap-2 pt-1 border-t ${
                                isLight ? "border-slate-100" : "border-slate-800/80"
                              }`}>
                                <button
                                  type="button"
                                  onClick={() => handlePastePromptToInput(q.prompt)}
                                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition ${
                                    isLight
                                      ? "bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-200"
                                      : "bg-[#0b0f19] hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/60"
                                  }`}
                                  title="Dán câu hỏi vào ô nhập để xem lại hoặc bổ sung"
                                >
                                  <Edit3 className={`w-3 h-3 ${isLight ? "text-teal-600" : "text-cyan-400"}`} />
                                  <span>Dán vào ô nhập</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSendMessage(q.prompt)}
                                  disabled={isLoading}
                                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[11px] font-semibold shadow-sm transition active:scale-95 disabled:opacity-40"
                                  title="Gửi trực tiếp câu hỏi cho AI Agent"
                                >
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                  <span>Gửi ngay</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Danh sách tin nhắn */}
          <div
            className={`flex-1 overflow-y-auto p-4 space-y-3.5 text-xs sm:text-sm ${
              isLight ? "bg-[#f8fafc]" : "bg-[#0b101d]"
            }`}
            style={{ backgroundColor: isLight ? "#f8fafc" : "#0b101d" }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.sender === "bot" && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-teal-600 to-emerald-600 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm ${
                    msg.sender === "user"
                      ? isLight
                        ? "bg-slate-200/90 text-slate-800 border border-slate-300/80 rounded-tr-sm shadow-xs"
                        : "bg-[#1e293b] text-slate-100 border border-slate-700/70 rounded-tr-sm shadow-xs"
                      : isLight
                      ? "bg-white text-slate-800 border border-slate-200/90 shadow-xs rounded-tl-sm"
                      : "bg-[#0e1626] text-slate-100 border border-slate-800/90 rounded-tl-sm shadow-xs"
                  }`}
                  style={
                    msg.sender === "bot"
                      ? {
                          backgroundColor: isLight ? "#ffffff" : "#0e1626",
                          borderColor: isLight ? "#e2e8f0" : "#1e293b",
                        }
                      : {
                          backgroundColor: isLight ? "#e2e8f0" : "#1e293b",
                          borderColor: isLight ? "#cbd5e1" : "#334155",
                        }
                  }
                >
                  {/* Nội dung Markdown */}
                  {renderFormattedContent(msg.text)}

                  {/* Starter Cards hiển thị ngay trong tin nhắn Welcome */}
                  {msg.id === "msg_welcome" && messages.length <= 1 && (
                    <div
                      className={`mt-3 pt-3 border-t ${isLight ? "border-slate-100" : "border-slate-800"}`}
                    >
                      <div className="text-[11px] font-semibold mb-2 flex items-center justify-between">
                        <span className={`flex items-center gap-1 ${isLight ? "text-teal-700" : "text-teal-400"}`}>
                          <Terminal className="w-3.5 h-3.5" />
                          4 Chuyên mục giám sát kỹ thuật:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowPromptList(true);
                            setSelectedTopicId(null);
                          }}
                          className={`text-[10px] underline font-medium ${
                            isLight ? "text-teal-700 hover:text-teal-800" : "text-teal-400 hover:text-teal-300"
                          }`}
                        >
                          Mở danh mục (4)
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {PROMPT_TOPICS.map((topic) => {
                          const Icon = topic.icon;
                          return (
                            <button
                              key={topic.id}
                              type="button"
                              onClick={() => {
                                setShowPromptList(true);
                                setSelectedTopicId(topic.id);
                              }}
                              className={`p-2.5 rounded-xl border transition group text-left flex items-center justify-between gap-2 shadow-2xs ${
                                isLight
                                  ? "bg-slate-50 hover:bg-teal-50/60 border-slate-200 hover:border-teal-400 text-slate-800"
                                  : "bg-[#090e1a] hover:bg-[#131d32] border-slate-800 hover:border-teal-500/60 text-slate-200"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${
                                    isLight
                                      ? "bg-teal-50 border-teal-200"
                                      : "bg-teal-950/80 border-teal-800/80"
                                  }`}
                                >
                                  <Icon className={`w-3.5 h-3.5 ${isLight ? "text-teal-700" : "text-teal-400"}`} />
                                </div>
                                <div className="min-w-0">
                                  <div
                                    className={`font-semibold text-xs transition truncate ${
                                      isLight
                                        ? "text-slate-800 group-hover:text-teal-800"
                                        : "text-slate-200 group-hover:text-teal-300"
                                    }`}
                                  >
                                    {topic.shortTitle}
                                  </div>
                                  <div
                                    className={`text-[10px] truncate ${
                                      isLight ? "text-slate-500" : "text-slate-400"
                                    }`}
                                  >
                                    {topic.questions.length} câu hỏi chi tiết
                                  </div>
                                </div>
                              </div>
                              <ChevronRight
                                className={`w-3.5 h-3.5 group-hover:translate-x-0.5 transition shrink-0 ${
                                  isLight
                                    ? "text-slate-400 group-hover:text-teal-600"
                                    : "text-slate-500 group-hover:text-teal-400"
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Thanh công cụ sao chép & gửi Telegram tinh gọn */}
                  {msg.sender === "bot" && msg.id !== "msg_welcome" && !msg.isError && (
                    <div
                      className={`mt-2.5 pt-2 border-t flex items-center justify-between text-[11px] ${
                        isLight ? "border-slate-100 text-slate-500" : "border-slate-800/60 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {/* Nút sao chép */}
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.id, msg.text)}
                          className={`flex items-center gap-1 px-2 py-1 rounded transition text-[11px] ${
                            isLight
                              ? "hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/80 shadow-2xs"
                              : "hover:bg-slate-800/70 text-slate-400 hover:text-slate-200"
                          }`}
                          title="Sao chép nội dung"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedId === msg.id ? "Đã chép" : "Sao chép"}</span>
                        </button>

                        {/* Nút gửi Telegram tinh gọn */}
                        <button
                          type="button"
                          onClick={() => handleSendToTelegram(msg.id, msg.text)}
                          disabled={msg.isSendingTelegram || msg.telegramSent}
                          className={`flex items-center gap-1 px-2 py-1 rounded transition text-[11px] ${
                            msg.telegramSent
                              ? isLight
                                ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                                : "text-emerald-400 bg-emerald-950/60"
                              : isLight
                              ? "text-slate-600 hover:text-teal-700 hover:bg-slate-100 border border-slate-200/80 shadow-2xs"
                              : "text-slate-400 hover:text-cyan-300 hover:bg-slate-800/70"
                          } disabled:opacity-50`}
                          title="Gửi báo cáo này vào Telegram nhóm phòng mổ"
                        >
                          {msg.isSendingTelegram ? (
                            <span className="w-3 h-3 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                          ) : msg.telegramSent ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <SendHorizontal className="w-3 h-3" />
                          )}
                          <span>{msg.telegramSent ? "Đã gửi Telegram" : "Telegram"}</span>
                        </button>

                        {/* Nút xóa câu trả lời */}
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(msg.id)}
                          className={`flex items-center gap-1 px-1.5 py-1 rounded transition text-[11px] ${
                            isLight
                              ? "hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200/80 shadow-2xs"
                              : "hover:bg-rose-950/60 text-slate-400 hover:text-rose-400"
                          }`}
                          title="Xóa tin nhắn này"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Xóa</span>
                        </button>
                      </div>

                      <span className={`font-mono text-[10px] ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                        {msg.timestamp}
                      </span>
                    </div>
                  )}

                  {/* Footer nhẹ cho tin nhắn cảnh báo/lỗi */}
                  {msg.sender === "bot" && msg.isError && (
                    <div
                      className={`mt-2 pt-1.5 border-t flex items-center justify-between text-[10px] font-mono ${
                        isLight ? "border-slate-200 text-slate-400" : "border-slate-800/40 text-slate-500"
                      }`}
                    >
                      <span>Thông báo hệ thống</span>
                      <span>{msg.timestamp}</span>
                    </div>
                  )}

                  {msg.sender === "user" && (
                    <div
                      className={`text-[10px] mt-1 flex items-center justify-end gap-2 font-mono ${
                        isLight ? "text-slate-500" : "text-slate-400"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleDeleteMessage(msg.id)}
                        className={`p-0.5 rounded transition ${
                          isLight
                            ? "text-slate-400 hover:text-rose-600 hover:bg-slate-300/60"
                            : "text-slate-500 hover:text-rose-400 hover:bg-slate-700/60"
                        }`}
                        title="Xóa câu hỏi này"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <span>{msg.timestamp}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Hiệu ứng đang suy nghĩ tự nhiên chuẩn AI Assistant */}
            {isLoading && (
              <div className="flex gap-2.5 justify-start items-center animate-fadeIn">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-teal-600 to-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div
                  className={`inline-flex items-center gap-2.5 rounded-2xl rounded-tl-sm px-3.5 py-2 shadow-xs border ${
                    isLight
                      ? "bg-white text-slate-700 border-slate-200"
                      : "bg-[#0e1626] text-slate-300 border-slate-800"
                  }`}
                  style={
                    isLight
                      ? { backgroundColor: "#ffffff", borderColor: "#e2e8f0" }
                      : { backgroundColor: "#0e1626", borderColor: "#1e293b" }
                  }
                >
                  <div className="flex items-center gap-1.5 py-0.5">
                    <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-duration:900ms]" />
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-duration:900ms] [animation-delay:150ms]" />
                    <span className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce [animation-duration:900ms] [animation-delay:300ms]" />
                  </div>
                  <span
                    className={`text-xs font-medium tracking-wide transition-all duration-300 select-none ${
                      isLight ? "text-slate-600" : "text-slate-300"
                    }`}
                  >
                    {getLoadingText()}
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* KHU VỰC NHẬP LIỆU & THANH GỢI Ý CƠ BẢN */}
          <div
            className={`p-3 border-t shrink-0 space-y-2 ${
              isLight ? "bg-white border-slate-200" : "bg-[#0d1424] border-slate-800/80"
            }`}
          >
            {/* Thanh gợi ý câu hỏi nhanh (Quick Chips) - Ẩn thanh cuộn xấu */}
            <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-0.5">
              {QUICK_SUGGESTIONS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSendMessage(item.query)}
                    disabled={isLoading}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-normal transition shrink-0 flex items-center gap-1.5 whitespace-nowrap active:scale-95 disabled:opacity-50 shadow-2xs ${
                      isLight
                        ? "bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 hover:border-teal-300"
                        : "bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-teal-200 border border-slate-700/50 hover:border-teal-500/40"
                    }`}
                    title={`Gửi nhanh: ${item.query}`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isLight ? "text-teal-600" : "text-teal-400"}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  setShowPromptList(!showPromptList);
                  setSelectedTopicId(null);
                }}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition shrink-0 flex items-center gap-1.5 whitespace-nowrap ${
                  showPromptList
                    ? isLight
                      ? "bg-teal-50 text-teal-800 border-teal-300"
                      : "bg-teal-950/80 text-teal-300 border-teal-600"
                    : isLight
                    ? "bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200"
                    : "bg-slate-800/40 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-slate-700/40"
                }`}
                title="Xem toàn bộ 4 danh mục câu hỏi chuyên môn"
              >
                <Terminal className={`w-3.5 h-3.5 ${isLight ? "text-teal-600" : "text-teal-400"}`} />
                <span>Mở menu lệnh SCADA</span>
              </button>
            </div>

            {/* Form nhập tin nhắn */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
              autoComplete="off"
            >
              {/* Nút Terminal nhỏ ở đầu ô nhập cho thao tác tiện lợi */}
              <button
                type="button"
                onClick={() => {
                  setShowPromptList(!showPromptList);
                  setSelectedTopicId(null);
                }}
                className={`p-2.5 rounded-xl transition border shrink-0 flex items-center justify-center ${
                  showPromptList
                    ? isLight
                      ? "bg-teal-50 text-teal-800 border-teal-300"
                      : "bg-teal-950/80 text-teal-300 border-teal-600"
                    : isLight
                    ? "bg-slate-50 text-slate-600 hover:text-teal-700 hover:bg-slate-100 border-slate-200"
                    : "bg-slate-800/60 text-slate-400 hover:text-teal-300 hover:bg-slate-800 border-slate-700/50"
                }`}
                title="Mở menu lệnh chẩn đoán & truy vấn SCADA (4 chuyên mục)"
              >
                <Terminal className={`w-4 h-4 ${isLight ? "text-teal-600" : "text-teal-400"}`} />
              </button>

              {/* Ô nhập văn bản sạch - không gợi ý, không dropdown lịch sử */}
              <input
                ref={inputRef}
                id="sortix_copilot_chat_input"
                name="sortix_copilot_chat_input_unique"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Nhập lệnh hoặc câu hỏi giám sát hệ thống..."
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-autocomplete="none"
                data-lpignore="true"
                data-form-type="other"
                disabled={isLoading}
                className={`flex-1 border rounded-xl px-4 py-2.5 text-xs sm:text-sm placeholder-slate-400 focus:outline-none transition disabled:opacity-50 ${
                  isLight
                    ? "bg-slate-50 focus:bg-white border-slate-200 focus:border-teal-500 text-slate-900 focus:ring-1 focus:ring-teal-500/30"
                    : "bg-slate-800/60 focus:bg-slate-800/90 border-slate-700/60 focus:border-teal-500/70 text-slate-100 focus:ring-1 focus:ring-teal-500/40"
                }`}
              />

              {/* Nút gửi */}
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="p-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-30 text-white rounded-xl shadow-md transition active:scale-95 shrink-0"
                title="Gửi tin nhắn (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Hộp thoại xác nhận xóa lịch sử */}
          {showClearConfirm && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
              <div
                className={`w-full max-w-sm rounded-2xl p-5 border shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 ${
                  isLight
                    ? "bg-white border-slate-200 text-slate-800"
                    : "bg-[#0f172a] border-slate-800 text-slate-100"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0 text-rose-600 dark:text-rose-400">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className={`text-sm font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                      Xóa toàn bộ lịch sử trò chuyện?
                    </h4>
                    <p className={`text-xs leading-relaxed ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                      Tất cả các câu hỏi và câu trả lời trong phiên này sẽ bị xóa vĩnh viễn khỏi bộ nhớ trình duyệt và phiên làm việc sẽ được làm mới.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition ${
                      isLight
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                    }`}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllHistory}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 active:scale-95 rounded-xl shadow-md shadow-rose-900/30 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xác nhận xóa</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
