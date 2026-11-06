"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  Layers,
  Wifi,
  Cpu,
  AlertOctagon,
  AlertTriangle,
  Boxes,
} from "lucide-react";
import { useDashboard } from "@/components/layout/DashboardLayout";
import { KpiStatGrid } from "@/components/overview/KpiStatGrid";
import { LiveHealthAndBinWidget } from "@/components/overview/LiveHealthAndBinWidget";
import { RecentActivityList } from "@/components/overview/RecentActivityList";
import { TemperatureGaugeWidget, HardwareDeviceStatus } from "@/components/ui/TemperatureGaugeWidget";
import { calculateDailyTotalProduction } from "@/lib/history";

export default function DashboardPage() {
  const {
    telemetry,
    mqttStatus,
    records,
    binCounts,
    routedBinCounts,
    visualItems,
    isRunning,
    conveyorSpeed,
    sorterConfig,
    pingMs,
    isSimulation,
    isDeviceOffline,
    isSystemLocked,
    isJammed,
    binCapacities,
    handleSetBinCapacity,
    handleClearBin,
    handleConfirmBinReplaced,
    handleTriggerTemperatureWarning,
    handleCoolDownTemperature,
    arm1Active,
    arm2Active,
  } = useDashboard();

  // Tổng sản lượng tích lũy trong ca/ngày
  const totalSorted = useMemo(() => {
    return calculateDailyTotalProduction(records, binCounts);
  }, [records, binCounts]);

  // Xác định ESP32 có đang online thực sự hay không
  const isEspConnected =
    !isDeviceOffline &&
    !isSimulation &&
    mqttStatus === "connected" &&
    telemetry.last_heartbeat !== "" &&
    Date.now() - new Date(telemetry.last_heartbeat).getTime() < 6000;

  // Tính độ tin cậy AI trung bình thực tế chỉ trên các record có confidence hợp lệ
  const validRecords = records.filter(
    (r) => typeof r.confidence === "number" && r.confidence > 0 && !isNaN(r.confidence)
  );
  const avgConfidence =
    !isEspConnected && !isSimulation && validRecords.length === 0
      ? "--"
      : validRecords.length > 0
      ? (
          (validRecords.reduce((acc, r) => acc + (r.confidence as number), 0) / validRecords.length) *
          100
        ).toFixed(1) + "%"
      : "--";

  // Nhãn phân loại theo từng máng
  const bin1Brands = sorterConfig?.bins?.[0]?.brand_ids || [];
  const bin2Brands = sorterConfig?.bins?.[1]?.brand_ids || [];
  const bin3Brands = sorterConfig?.bins?.[2]?.brand_ids || [];

  // Trạng thái khay đầy
  const cap1 = binCapacities.bin1 || 50;
  const cap2 = binCapacities.bin2 || 50;
  const cap3 = binCapacities.bin3 || 50;
  const isBinFull = binCounts.bin1 >= cap1 || binCounts.bin2 >= cap2 || binCounts.bin3 >= cap3;
  // Trạng thái phần cứng, cơ cấu chấp hành và cảm biến (ON / OFF)
  const isConveyorActive = isRunning || telemetry.conveyor_running;
  const isArm1On = arm1Active || telemetry.arm1_active;
  const isArm2On = arm2Active || telemetry.arm2_active;
  const isS1Detected = telemetry.s1_entry || visualItems.some((item) => item.s1Triggered || (item.progress >= 5 && item.progress <= 20));
  const isEstopActive = isSystemLocked || telemetry.estop_pressed;
  const isEncoderActive = isConveyorActive && (telemetry.encoder_count ?? 0) > 0;
  const isLdrActive = Boolean(telemetry.ldr_active);
  const isStartBtnActive = Boolean(telemetry.start_btn_pressed);
  const isLedStatusActive = isConveyorActive || isEstopActive;

  const hardwareDeviceList: HardwareDeviceStatus[] = useMemo(() => [
    {
      id: "servo_1",
      name: "Servo Gạt 1 (MG996R)",
      pin: "GPIO6",
      category: "actuator",
      type: "servo",
      isOn: isArm1On,
      description: "Gạt phân loại phôi vào Khay 1 (Vị trí 200mm)",
    },
    {
      id: "servo_2",
      name: "Servo Gạt 2 (MG996R)",
      pin: "GPIO7",
      category: "actuator",
      type: "servo",
      isOn: isArm2On,
      description: "Gạt phân loại phôi vào Khay 2 (Vị trí 400mm)",
    },
    {
      id: "conveyor_motor",
      name: "Động cơ Băng Tải L298N",
      pin: "GPIO8/9",
      category: "actuator",
      type: "motor",
      isOn: isConveyorActive,
      description: "Động cơ DC JGB37-520 12V 66RPM kéo băng tải",
    },
    {
      id: "s1_entry",
      name: "Cảm biến vật cản IR LM393",
      pin: "GPIO0",
      category: "sensor",
      type: "sensor",
      isOn: isS1Detected,
      description: "Phát hiện phôi đầu băng tải trước cổng quét AI",
    },
    {
      id: "encoder",
      name: "Encoder Động cơ (2 Pha A/B)",
      pin: "GPIO1/4",
      category: "sensor",
      type: "sensor",
      isOn: isEncoderActive,
      description: "Đếm xung định vị phôi chính xác theo mm di chuyển",
    },
    {
      id: "ldr_sensor",
      name: "Cảm biến ánh sáng LDR",
      pin: "GPIO5",
      category: "sensor",
      type: "sensor",
      isOn: isLdrActive,
      description: "Giám sát ngưỡng sáng buồng chụp ảnh nhận diện phôi",
    },
    {
      id: "btn_start",
      name: "Nút nhấn Khởi Động (Start)",
      pin: "GPIO23",
      category: "sensor",
      type: "sensor",
      isOn: isStartBtnActive,
      description: "Nút nhấn cứng tái khởi động hệ thống sau dừng máy",
    },
    {
      id: "led_status",
      name: "Đèn LED Trạng Thái",
      pin: "GPIO10",
      category: "alarm",
      type: "led",
      isOn: isLedStatusActive,
      description: "Đèn LED xanh lá báo trạng thái vận hành & cảnh báo sự cố",
    },
    {
      id: "estop",
      name: "Nút Dừng Khẩn Cấp (E-Stop)",
      pin: "Cắt 12V",
      category: "sensor",
      type: "estop",
      isOn: isEstopActive,
      description: "Tiếp điểm NC ngắt nguồn lực 12V an toàn phần cứng",
    },
  ], [isArm1On, isArm2On, isConveyorActive, isS1Detected, isEncoderActive, isLdrActive, isStartBtnActive, isLedStatusActive, isEstopActive]);

  return (
    <div className="space-y-5 page-transition-enter pb-6">
      {/* CẢNH BÁO SỰ CỐ VẬN HÀNH (CHỈ HIỂN THỊ KHI CÓ SỰ CỐ KHẨN CẤP THỰC TẾ) */}
      {(telemetry.estop_pressed || isSystemLocked || isJammed || isBinFull) && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 shadow-sm animate-pulse">
          <div className="flex items-center gap-2.5">
            <AlertOctagon className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <div className="text-xs font-semibold">
              <span className="font-bold uppercase tracking-wider mr-2">[Cảnh báo vận hành]</span>
              {telemetry.estop_pressed || isSystemLocked
                ? "Hệ thống đang dừng khẩn cấp (E-Stop). Vui lòng kiểm tra an toàn trước khi mở khóa."
                : isJammed
                ? "Phát hiện kẹt phôi trên đường băng tải. Vui lòng gỡ phôi tại trạm cảm biến."
                : "Khay chứa đã đạt sức chứa định mức. Vui lòng dọn khay để tiếp tục phân loại."}
            </div>
          </div>
          <Link
            href="/conveyor"
            className="text-xs font-bold underline hover:text-rose-800 dark:hover:text-rose-200"
          >
            Đến trạm băng tải →
          </Link>
        </div>
      )}

      {/* HÀNG 1: 4 THẺ KPI TINH GỌN */}
      <KpiStatGrid
        totalSorted={totalSorted}
        binCounts={binCounts}
        telemetry={telemetry}
        isEspConnected={isEspConnected}
        isSimulation={isSimulation}
        isRunning={isRunning}
        conveyorSpeed={conveyorSpeed}
        visualItemsCount={visualItems.length}
        avgConfidence={avgConfidence}
        sampleCount={validRecords.length}
        pingMs={pingMs}
        isDeviceOffline={isDeviceOffline}
      />

      {/* HÀNG 2: GIÁM SÁT TOÀN DIỆN KHAY CHỨA & PHẦN CỨNG (READ-ONLY) */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 items-stretch">
        {/* Cột 1 (2/3 chiều rộng): Live Sorter Health & 3 Bins */}
        <div className="xl:col-span-2 flex flex-col">
          <LiveHealthAndBinWidget
            telemetry={telemetry}
            mqttStatus={mqttStatus}
            isEspConnected={isEspConnected}
            isSimulation={isSimulation}
            isRunning={isRunning}
            binCounts={binCounts}
            routedBinCounts={routedBinCounts}
            bin1Brands={bin1Brands}
            bin2Brands={bin2Brands}
            bin3Brands={bin3Brands}
            isDeviceOffline={isDeviceOffline}
            binCapacities={binCapacities}
            onSetBinCapacity={handleSetBinCapacity}
            onClearBin={handleClearBin}
            onConfirmBinReplaced={handleConfirmBinReplaced}
            records={records}
          />
        </div>

        {/* Cột 2 (1/3 chiều rộng): Đồng Hồ Đo Nhiệt Độ Gauge */}
        <div className="flex flex-col h-full">
          <TemperatureGaugeWidget
            className="h-full justify-between"
            currentTemp={telemetry.cpu_temp}
            thresholdTemp={75.0}
            deviceName="Cảm biến nhiệt độ nội vi ESP32-C5"
            isOnline={isEspConnected || isSimulation}
            isSimulation={isSimulation}
            showSimulationControls={false}
            lastUpdated={telemetry.last_heartbeat ? new Date(telemetry.last_heartbeat).toLocaleTimeString("vi-VN") : undefined}
            hardwareDevices={hardwareDeviceList}
            onSimulateTempChange={
              isSimulation
                ? (temp) => {
                    void handleTriggerTemperatureWarning(
                      {
                        device_name: "Main_Drive_Motor / Edge_AI_Box",
                        current_temp: temp,
                        threshold_temp: 75.0,
                        unit: "°C",
                        mode: "simulation",
                      },
                      "sim_slider"
                    );
                  }
                : undefined
            }
            onCoolDown={isSimulation ? handleCoolDownTemperature : undefined}
          />
        </div>
      </div>

      {/* HÀNG 3: NHẬT KÝ HOẠT ĐỘNG MỚI NHẤT */}
      <RecentActivityList records={records} isSimulation={isSimulation} />
    </div>
  );
}

