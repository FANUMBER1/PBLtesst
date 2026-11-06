// Tiện ích xuất dữ liệu ra file Excel / CSV (kèm UTF-8 BOM hiển thị chuẩn tiếng Việt)
import { ClassificationRecord, AlertEvent, ShiftSummaryPayload } from "./types";

export function exportClassificationToCSV(
  records: ClassificationRecord[],
  filename = "SortiX_LichSu_ToanBo.csv"
): boolean {
  if (!records || records.length === 0) {
    return false;
  }

  // Nhóm và tính toán số thứ tự theo từng ngày (#1, #2, #3...)
  // Sắp xếp theo thời gian tăng dần để đánh số thứ tự chuẩn xác cho từng ngày
  const sorted = [...records].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const dayCounters: Record<string, number> = {};
  const recordDaySeq: Record<string, number> = {};

  for (const r of sorted) {
    const dKey = r.timestamp ? r.timestamp.slice(0, 10) : "unknown";
    dayCounters[dKey] = (dayCounters[dKey] || 0) + 1;
    recordDaySeq[r.id] = dayCounters[dKey];
  }

  const headers = [
    "STT",
    "Mã Sản Phẩm",
    "Ngày",
    "Giờ",
    "Thương Hiệu",
    "Mã Nhãn",
    "Độ Tin Cậy (%)",
    "Khay Chỉ Định",
    "Hướng Firmware",
    "Khay Thực Tế",
    "Trạng Thái",
    "Thời Gian Ghi Nhận",
  ];

  const statusMap: Record<string, string> = {
    success: "Phân loại thành công",
    diverted_default: "Hướng mặc định, chưa xác minh vào khay",
    rejected: "Từ chối / Nhãn lạ",
    jammed: "Sự cố kẹt phôi",
    unverified: "Đã điều hướng, chưa xác minh vào khay",
    held_timeout: "Đã giữ do hết thời gian chờ",
    servo_failed: "Lỗi cơ cấu gạt",
  };

  const rows = records.map((r, idx) => {
    const d = new Date(r.timestamp);
    const dayStr = !isNaN(d.getTime()) ? d.toLocaleDateString("vi-VN") : "";
    const timeStr = !isNaN(d.getTime()) ? d.toLocaleTimeString("vi-VN") : "";
    const seq = recordDaySeq[r.id] || idx + 1;
    const dayId = `#${seq}`;

    return [
      idx + 1,
      `"${dayId}"`,
      `"${dayStr}"`,
      `"${timeStr}"`,
      `"${r.brand_name}"`,
      `"${r.brand_id}"`,
      r.confidence ? (r.confidence * 100).toFixed(1) : "0.0",
      r.target_bin,
      (r.routed_bin ?? r.actual_bin) > 0 ? (r.routed_bin ?? r.actual_bin) : "Chưa điều hướng",
      r.actual_bin === 0 ? "Chưa xác minh" : r.actual_bin,
      `"${statusMap[r.status] || r.status}"`,
      `"${r.timestamp}"`,
    ];
  });

  const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename);
  return true;
}

export function exportAlertsToCSV(
  alerts: AlertEvent[],
  filename = "SortiX_LichSu_CanhBao.csv"
): boolean {
  if (!alerts || alerts.length === 0) {
    return false;
  }

  const headers = ["STT", "Mã Sự Kiện", "Loại Sự Kiện", "Mức Độ", "Mô Tả", "Thời Gian"];
  const rows = alerts.map((a, idx) => [
    idx + 1,
    `"${a.event_id}"`,
    `"${a.event_type}"`,
    `"${a.severity.toUpperCase()}"`,
    `"${a.description.replace(/"/g, '""')}"`,
    `"${new Date(a.timestamp).toLocaleString("vi-VN")}"`,
  ]);

  const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename);
  return true;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportShiftSummaryToCSV(
  summary: ShiftSummaryPayload,
  filename = `SortiX_BaoCao_1Ngay_${new Date().toISOString().slice(0, 10)}.csv`
): boolean {
  if (!summary) return false;

  const now = new Date(summary.timestamp || Date.now()).toLocaleString("vi-VN");
  const headers = ["Chỉ Số Báo Cáo Ngày", "Giá Trị Thống Kê", "Đơn Vị / Ghi Chú"];
  const rows = [
    ["Tên Báo Cáo", `"${summary.shift_name}"`, "Kỳ báo cáo"],
    ["Thời Điểm Báo Cáo", `"${now}"`, "Thời gian hệ thống"],
    ["Tổng Sản Lượng", summary.total_products, "Sản phẩm"],
    ["Sản Phẩm Đạt Chuẩn (Good)", summary.sorted_good, "Sản phẩm"],
    ["Sản Phẩm Phế Phẩm / Lỗi (Defect)", summary.sorted_defect, "Sản phẩm"],
    ["Tỷ Lệ Phân Loại Chính Xác", `"${summary.accuracy_rate}"`, "Phần trăm đạt"],
    ["Số Lần Dừng Khẩn Cấp (E-Stop)", summary.emergency_stops_count, "Lần"],
    ["Tổng Thời Gian Vận Hành", `"${summary.operating_hours}"`, "Giờ hoạt động"],
    ["Chế Độ Hệ Thống", `"${summary.mode === "simulation" ? "Mô phỏng" : "Thực tế"}"`, "Môi trường"],
  ];

  const csvContent = [
    `"BÁO CÁO 1 NGÀY LÀM VIỆC - HỆ THỐNG SORTIX IOT"`,
    `"Ngày xuất: ${now}"`,
    "",
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename);
  return true;
}

export function printShiftSummaryReport(summary: ShiftSummaryPayload): void {
  if (typeof window === "undefined" || !summary) return;

  const printWindow = window.open("", "_blank", "width=850,height=750");
  if (!printWindow) return;

  const now = new Date(summary.timestamp || Date.now()).toLocaleString("vi-VN");
  const goodPct = summary.total_products > 0
    ? ((summary.sorted_good / summary.total_products) * 100).toFixed(1)
    : "0";
  const defectPct = summary.total_products > 0
    ? ((summary.sorted_defect / summary.total_products) * 100).toFixed(1)
    : "0";

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Báo Cáo 1 Ngày Làm Việc - ${summary.shift_name}</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
          .header { border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; }
          .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
          .badge { background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 9999px; font-weight: 700; font-size: 12px; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
          .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #f8fafc; }
          .card-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 6px; }
          .card-val { font-size: 24px; font-weight: 800; color: #0f172a; }
          .card-val.good { color: #2563eb; }
          .card-val.defect { color: #e11d48; }
          .card-val.rate { color: #0284c7; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #cbd5e1; padding: 10px 14px; text-align: left; font-size: 13px; }
          th { background: #f1f5f9; font-weight: 700; color: #334155; }
          .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">BÁO CÁO 1 NGÀY LÀM VIỆC & PHÂN LOẠI</h1>
            <div class="subtitle">Hệ thống phân loại bưu kiện tự động SortiX Industrial IoT</div>
          </div>
          <span class="badge">${summary.shift_name}</span>
        </div>

        <div class="grid">
          <div class="card">
            <div class="card-title">Tổng sản phẩm</div>
            <div class="card-val">${summary.total_products.toLocaleString("vi-VN")}</div>
          </div>
          <div class="card">
            <div class="card-title">Đạt chuẩn (Good)</div>
            <div class="card-val good">${summary.sorted_good.toLocaleString("vi-VN")}</div>
          </div>
          <div class="card">
            <div class="card-title">Phế phẩm (Defect)</div>
            <div class="card-val defect">${summary.sorted_defect.toLocaleString("vi-VN")}</div>
          </div>
          <div class="card">
            <div class="card-title">Tỷ lệ chính xác</div>
            <div class="card-val rate">${summary.accuracy_rate}</div>
          </div>
        </div>

        <h3>Chi Tiết Vận Hành & An Toàn Ca Làm Việc</h3>
        <table>
          <thead>
            <tr>
              <th>Hạng mục</th>
              <th>Giá trị ghi nhận</th>
              <th>Đánh giá chất lượng</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Sản phẩm Đạt chuẩn</td>
              <td><strong>${summary.sorted_good.toLocaleString("vi-VN")} SP</strong></td>
              <td>Tỷ lệ ${goodPct}% sản lượng</td>
            </tr>
            <tr>
              <td>Sản phẩm Lỗi / Chuyển máng lỗi</td>
              <td><strong>${summary.sorted_defect.toLocaleString("vi-VN")} SP</strong></td>
              <td>Tỷ lệ ${defectPct}% phế phẩm</td>
            </tr>
            <tr>
              <td>Số lần dừng khẩn cấp (E-Stop)</td>
              <td><strong>${summary.emergency_stops_count} lần</strong></td>
              <td>${summary.emergency_stops_count === 0 ? "Vận hành an toàn tuyệt đối" : "Có ghi nhận sự cố an toàn"}</td>
            </tr>
            <tr>
              <td>Tổng thời gian máy chạy</td>
              <td><strong>${summary.operating_hours}</strong></td>
              <td>Đạt định mức ca</td>
            </tr>
            <tr>
              <td>Thời gian xuất báo cáo</td>
              <td><strong>${now}</strong></td>
              <td>Tự động xác thực bởi hệ thống</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <span>SortiX Industrial Control System • PBL3 Automation & IoT</span>
          <span>Người phê duyệt: Quản trị viên hệ thống (Admin)</span>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
