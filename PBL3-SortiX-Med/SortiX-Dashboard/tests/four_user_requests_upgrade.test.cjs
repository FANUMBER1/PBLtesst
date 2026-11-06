const { describe, it } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

describe("Four User Requests Verification (Ảnh 1, 2, 3, 4)", () => {
  it("Ảnh 1: Sidebar hiển thị khối 'Hệ thống trực tuyến' tinh tế, hiện đại", () => {
    const sidebarPath = path.resolve(__dirname, "../frontend/src/components/layout/Sidebar.tsx");
    assert.strictEqual(fs.existsSync(sidebarPath), true, "Sidebar.tsx must exist");
    const content = fs.readFileSync(sidebarPath, "utf8");

    assert.match(
      content,
      /Hệ thống trực tuyến/,
      "Sidebar.tsx phải chứa 'Hệ thống trực tuyến'"
    );
  });

  it("Ảnh 2: Băng chuyền chỉ chuyển động khi có mẫu vật/phôi trên băng, dừng chờ khi rỗng", () => {
    const physicsPath = path.resolve(__dirname, "../frontend/src/hooks/useConveyorPhysics.ts");
    assert.strictEqual(fs.existsSync(physicsPath), true, "useConveyorPhysics.ts must exist");
    const physicsContent = fs.readFileSync(physicsPath, "utf8");

    assert.match(
      physicsContent,
      /hasActiveItems\s*=\s*visualItemsRef\.current\.some/,
      "useConveyorPhysics must compute hasActiveItems from active visual items"
    );
    assert.match(
      physicsContent,
      /isSimulation\s*\?\s*hasActiveItems/,
      "useConveyorPhysics must require hasActiveItems for isBeltMoving in simulation mode"
    );

    const visualizerPath = path.resolve(__dirname, "../frontend/src/components/ConveyorVisualizer.tsx");
    assert.strictEqual(fs.existsSync(visualizerPath), true, "ConveyorVisualizer.tsx must exist");
    const visContent = fs.readFileSync(visualizerPath, "utf8");

    assert.match(
      visContent,
      /hasActiveItems\s*=\s*items\.some/,
      "ConveyorVisualizer must compute hasActiveItems from items prop"
    );
    assert.match(
      visContent,
      /Băng tải chờ phôi mẫu/,
      "ConveyorVisualizer must show standby message when no items on belt"
    );
  });

  it("Ảnh 3: Thiết kế lại logo SortixLogo 3D isometric cao cấp và tích hợp vào Sidebar", () => {
    const logoPath = path.resolve(__dirname, "../frontend/src/components/ui/SortixLogo.tsx");
    assert.strictEqual(fs.existsSync(logoPath), true, "SortixLogo.tsx must exist");
    const logoContent = fs.readFileSync(logoPath, "utf8");

    assert.match(logoContent, /SortixLogo/, "Must export SortixLogo component");
    assert.match(logoContent, /NHÓM 5/, "Must include NHÓM 5 badge");
    assert.match(logoContent, /BĂNG CHUYỀN PHÂN LOẠI DỤNG CỤ Y TẾ/, "Must include BĂNG CHUYỀN PHÂN LOẠI DỤNG CỤ Y TẾ subtitle");
    assert.match(logoContent, /topFacetGrad/, "Must render 3D isometric SVG gradients");

    const sidebarPath = path.resolve(__dirname, "../frontend/src/components/layout/Sidebar.tsx");
    const sidebarContent = fs.readFileSync(sidebarPath, "utf8");
    assert.match(sidebarContent, /<SortixLogo/, "Sidebar.tsx must use SortixLogo component");
  });

  it("Ảnh 4: EmergencyUnlockToast mở khóa ngay không bắt buộc nhập chữ và còi hú liên tục khi có sự cố", () => {
    const toastPath = path.resolve(__dirname, "../frontend/src/components/ui/EmergencyUnlockToast.tsx");
    assert.strictEqual(fs.existsSync(toastPath), true, "EmergencyUnlockToast.tsx must exist");
    const toastContent = fs.readFileSync(toastPath, "utf8");

    // Tiêu đề và nội dung modal dạng gốc
    assert.match(toastContent, /Xác nhận mở khóa \(Admin\)/, "Modal phải có tiêu đề Xác nhận mở khóa (Admin)");
    assert.match(toastContent, /Ghi chú kiểm tra hiện trường \(tùy chọn\):/, "Modal có ô ghi chú kiểm tra hiện trường");

    // Đoạn này ko cần nhập chữ cũng được: Nút mở khóa không bị chặn bởi ghi chú rỗng
    assert.doesNotMatch(
      toastContent,
      /disabled=\{isUnlocking\s*\|\|\s*!safetyNote\.trim\(\)\}/,
      "Unlock button không bị chặn khi chưa nhập ghi chú"
    );
    assert.match(
      toastContent,
      /safetyNote\.trim\(\)\s*\|\|\s*"Đã kiểm tra/,
      "Tự động điền ghi chú an toàn mặc định nếu người dùng để trống"
    );

    // Còi kêu liên tục lúc sự cố diễn ra
    assert.match(
      toastContent,
      /startContinuousEmergencyAlarm\(\)/,
      "Còi hú khẩn cấp phải kêu liên tục khi sự cố E-Stop đang diễn ra"
    );

    // Không nhét bộ chỉnh còi vào modal làm rối giao diện
    assert.doesNotMatch(toastContent, /Điều chỉnh còi cảnh báo/, "Không nhúng khối chỉnh còi vào trong modal mở khóa");
  });

  it("AudioService: Tích hợp đầy đủ thuộc tính và phương thức điều khiển còi buzzer", () => {
    const audioPath = path.resolve(__dirname, "../frontend/src/lib/audioService.ts");
    assert.strictEqual(fs.existsSync(audioPath), true, "audioService.ts must exist");
    const audioContent = fs.readFileSync(audioPath, "utf8");

    assert.match(audioContent, /buzzerVolume/, "Must have buzzerVolume property");
    assert.match(audioContent, /buzzerEnabled/, "Must have buzzerEnabled property");
    assert.match(audioContent, /setBuzzerVolume/, "Must export setBuzzerVolume");
    assert.match(audioContent, /getBuzzerVolume/, "Must export getBuzzerVolume");
    assert.match(audioContent, /setBuzzerEnabled/, "Must export setBuzzerEnabled");
    assert.match(audioContent, /isBuzzerEnabled/, "Must export isBuzzerEnabled");
    assert.match(audioContent, /isAlarmSounding/, "Must export isAlarmSounding");
  });
});
