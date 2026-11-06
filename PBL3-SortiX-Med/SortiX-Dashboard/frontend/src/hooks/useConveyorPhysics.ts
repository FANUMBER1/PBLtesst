"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { VisualItem, TelemetryData, SorterConfig, CATALOG_BRANDS, JamDetectedPayload } from "@/lib/types";
import { determineTargetBin } from "@/lib/dataProcessor";
import { industrialAudio } from "@/lib/audioService";
import { updateSyncState, syncSpawnItemToServer } from "@/services/apiSyncClient";

export interface UseConveyorPhysicsProps {
  telemetryRef: React.MutableRefObject<TelemetryData>;
  setTelemetry: React.Dispatch<React.SetStateAction<TelemetryData>>;
  configRef: React.MutableRefObject<SorterConfig>;
  isSimulationRef: React.MutableRefObject<boolean>;
  simRecordsRef: React.MutableRefObject<unknown[]>;
  simBinCountsRef: React.MutableRefObject<{ bin1: number; bin2: number; bin3: number }>;
  realBinCountsRef: React.MutableRefObject<{ bin1: number; bin2: number; bin3: number }>;
  binCapacitiesRef?: React.MutableRefObject<{ bin1: number; bin2: number; bin3: number }>;
  onItemSorted: (item: VisualItem, actualBin: number) => void;
  onPublishCommand?: (cmd: string, value?: number) => void;
  onJamDetected?: (payload: JamDetectedPayload) => void;
  isJammed?: boolean;
  isBinFull?: boolean;
  onBinFullDetected?: (binIdx: 1 | 2 | 3) => void;
}

export function useConveyorPhysics({
  telemetryRef,
  setTelemetry,
  configRef,
  isSimulationRef,
  simRecordsRef,
  simBinCountsRef,
  realBinCountsRef,
  binCapacitiesRef,
  onItemSorted,
  onPublishCommand,
  onJamDetected,
  isJammed = false,
  isBinFull = false,
  onBinFullDetected,
}: UseConveyorPhysicsProps) {
  const onItemSortedRef = useRef(onItemSorted);

  onItemSortedRef.current = onItemSorted;
  const onPublishCommandRef = useRef(onPublishCommand);
  onPublishCommandRef.current = onPublishCommand;
  const onJamDetectedRef = useRef(onJamDetected);
  onJamDetectedRef.current = onJamDetected;
  const isJammedRef = useRef(isJammed);
  isJammedRef.current = isJammed;
  const isBinFullRef = useRef(isBinFull);
  isBinFullRef.current = isBinFull;
  const onBinFullDetectedRef = useRef(onBinFullDetected);
  onBinFullDetectedRef.current = onBinFullDetected;
  const sensor2BlockedSinceRef = useRef<number | null>(null);

  const [isRunning, setIsRunning] = useState(true);
  const [conveyorSpeed, setConveyorSpeed] = useState(65);
  const [arm1Active, setArm1Active] = useState(false);
  const [arm2Active, setArm2Active] = useState(false);
  const [visualItems, _setVisualItems] = useState<VisualItem[]>([]);

  // Refs for requestAnimationFrame loop
  const animFrameRef = useRef<number | null>(null);
  const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]); // BUG-03: Track timeouts
  const visualItemsRef = useRef<VisualItem[]>([]);
  
  const setVisualItems = useCallback((action: React.SetStateAction<VisualItem[]>) => {
    const next = typeof action === "function" ? action(visualItemsRef.current) : action;
    visualItemsRef.current = next;
    _setVisualItems(next);
  }, []);
  const isRunningRef = useRef<boolean>(isRunning);
  isRunningRef.current = isRunning;
  const speedRef = useRef<number>(conveyorSpeed);
  speedRef.current = conveyorSpeed;
  const productSeqRef = useRef<number>(0);
  const lastRenderTimeRef = useRef<number>(0);
  const hadActiveItemsRef = useRef<boolean>(false);
  const prevBeltMovingRef = useRef<boolean>(false);

  // BUG-03: Helper to schedule tracked timeouts (auto-cleaned on unmount)
  const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      fn();
      timeoutIdsRef.current = timeoutIdsRef.current.filter((tid) => tid !== id);
    }, ms);
    timeoutIdsRef.current.push(id);
    return id;
  }, []);

  // Spawn visual package (Simulation mode & Cảm biến quang S1 test)
  const spawnVisualPackage = useCallback(
    (brandKey?: string, productId?: string) => {

      const brands = Object.keys(CATALOG_BRANDS);
      const chosenBrand = brandKey || brands[Math.floor(Math.random() * brands.length)];
      const todayStr = new Date().toISOString().slice(0, 10);
      const todaySimRecords = (simRecordsRef.current as { timestamp?: string }[]).filter(
        (r) => r.timestamp && r.timestamp.slice(0, 10) === todayStr
      );
      const currentSeq = todaySimRecords.length + visualItemsRef.current.length + 1;
      const chosenId = productId || `#${currentSeq}`;
      const target = determineTargetBin(chosenBrand, configRef.current);

      const newItem: VisualItem = {
        id: chosenId,
        brandKey: chosenBrand,
        progress: 0,
        targetBin: target,
        yOffset: 0,
        opacity: 1,
        deflected: false,
        sorted: false,
        isSim: true,
      };
      setVisualItems((prev) => [...prev, newItem]);
      hadActiveItemsRef.current = true;
      if (!isRunningRef.current) {
        setIsRunning(true);
        isRunningRef.current = true;
        setTelemetry((prev) => ({ ...prev, conveyor_running: true }));
        onPublishCommandRef.current?.("START");
        void updateSyncState({ isRunning: true });
      }
      industrialAudio.playClick();
      void syncSpawnItemToServer(newItem);
    },
    [configRef, simRecordsRef, setVisualItems, setTelemetry]
  );

  // Controls
  const handleToggleRun = useCallback(() => {
    industrialAudio.playClick();
    const nextState = !isRunningRef.current;
    if (nextState && visualItemsRef.current.length > 0) {
      hadActiveItemsRef.current = true;
    }
    setIsRunning(nextState);
    setTelemetry((prev) => ({ ...prev, conveyor_running: nextState }));
    onPublishCommand?.(nextState ? "START" : "STOP");
    void updateSyncState({ isRunning: nextState });
  }, [onPublishCommand, setTelemetry]);

  const handleEmergencyStop = useCallback(() => {
    if (telemetryRef.current.estop_pressed) {
      industrialAudio.silenceAll();
      industrialAudio.playClick();
      setTelemetry((prev) => ({
        ...prev,
        estop_pressed: false,
      }));
      onPublishCommand?.("ESTOP_RELEASE");
    } else {
      industrialAudio.playEmergencyAlarm();
      setIsRunning(false);
      setTelemetry((prev) => ({
        ...prev,
        estop_pressed: true,
        conveyor_running: false,
      }));
      onPublishCommand?.("ESTOP");
    }
  }, [onPublishCommand, setTelemetry, telemetryRef]);

  const handleSpeedChange = useCallback(
    (newSpeed: number) => {
      setConveyorSpeed(newSpeed);
      setTelemetry((prev) => ({ ...prev, conveyor_speed: newSpeed }));
      onPublishCommand?.("SET_SPEED", newSpeed);
      void updateSyncState({ speed: newSpeed });
    },
    [onPublishCommand, setTelemetry]
  );

  const handleResetActuatorStates = useCallback(() => {
    setArm1Active(false);
    setArm2Active(false);
    setTelemetry((prev) => ({
      ...prev,
      s1_entry: false,
      s2_sorter1: false,
      s3_sorter2: false,
      arm1_active: false,
      arm2_active: false,
      estop_pressed: false,
    }));
  }, [setTelemetry]);

  // Main Conveyor Physics Loop
  useEffect(() => {
    let lastTime = performance.now();
    const loop = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      // Xác định phôi mẫu đang có mặt trên mặt băng chuyền (chưa phân loại vào khay)
      const hasActiveItems = visualItemsRef.current.some(
        (it) => !it.sorted && !it.deflected && (it.progress ?? 0) < 96
      );

      // TỰ ĐỘNG KÍCH HOẠT LẠI KHI CÓ PHÔI MẪU ĐẶT LÊN BĂNG TẢI
      if (hasActiveItems && !isRunningRef.current && !telemetryRef.current.estop_pressed) {
        setIsRunning(true);
        isRunningRef.current = true;
        void updateSyncState({ isRunning: true });
      }

      // Yêu cầu: Có mẫu vật thì băng chuyền mới chạy (ở cả User & Admin, cả Mô phỏng và Thực tế)
      const isSimulation = isSimulationRef.current;
      const isBeltMoving =
        isRunningRef.current &&
        (isSimulation ? hasActiveItems : hasActiveItems) &&
        !telemetryRef.current.estop_pressed &&
        !isJammedRef.current &&
        !isBinFullRef.current;

      // Đồng bộ trạng thái chuyển động của băng tải vào telemetry
      if (telemetryRef.current.conveyor_running !== isBeltMoving) {
        setTelemetry((prev) => (prev.conveyor_running === isBeltMoving ? prev : { ...prev, conveyor_running: isBeltMoving }));
      }

      // TỰ ĐỘNG CHẠY KHI ĐẶT THÊM MẪU VẬT LÊN - TỰ ĐỘNG DỪNG KHI TOÀN BỘ PHÔI VÀO KHAY HẾT
      if (prevBeltMovingRef.current !== isBeltMoving) {
        if (isBeltMoving) {
          // BĂNG TẢI TỰ ĐỘNG CHẠY TIẾP KHI ĐẶT THÊM MẪU VẬT LÊN
          onPublishCommandRef.current?.("START");
          industrialAudio.playClick();
        } else if (!telemetryRef.current.estop_pressed && !isJammedRef.current && !isBinFullRef.current) {
          // BĂNG TẢI TỰ ĐỘNG DỪNG KHI TOÀN BỘ PHÔI MẪU ĐÃ VÀO KHAY HẾT
          onPublishCommandRef.current?.("STOP");
        }
        prevBeltMovingRef.current = isBeltMoving;
      }

      // Kiểm tra phôi bị tắc nghẽn liên tục tại Cảm biến #02 / Zone A (Chỉ chạy ở chế độ Mô phỏng ảo)
      // Ở chế độ Thực tế: Tín hiệu kẹt phôi hoàn toàn phụ thuộc vào cảm biến quang học vật lý qua MQTT
      if (isSimulationRef.current) {
        if (isBinFullRef.current) {
          // Băng tải đang dừng do Khay đầy, không kích hoạt cảnh báo kẹt phôi ảo
          sensor2BlockedSinceRef.current = null;
        } else {
          const itemsInZoneA = visualItemsRef.current.filter(
            (it) => !it.sorted && !it.deflected && it.progress >= 42 && it.progress <= 48
          );

          if (isBeltMoving && itemsInZoneA.length > 0) {
            if (!sensor2BlockedSinceRef.current) {
              sensor2BlockedSinceRef.current = time;
            } else {
              const blockedDurationMs = time - sensor2BlockedSinceRef.current;
              if (blockedDurationMs >= 5000 && !isJammedRef.current) {
                // Đã đứng yên / che khuất liên tục quá 5 giây -> Kích hoạt cảnh báo kẹt phôi
                itemsInZoneA[0].isJammed = true;
                setIsRunning(false);
                isRunningRef.current = false;
                setTelemetry((prev) => ({ ...prev, conveyor_running: false, s2_sorter1: true }));
                onPublishCommandRef.current?.("STOP");

                onJamDetectedRef.current?.({
                  event: "jam_detected",
                  section: "Conveyor_Belt_Zone_A",
                  duration_seconds: 5,
                  sensor_id: "OPTICAL_JAM_02",
                  mode: "simulation",
                  timestamp: new Date().toISOString(),
                });
              }
            }
          } else {
            // Băng tải đang dừng chủ động (STOP/PAUSE), không phải lỗi kẹt phôi
            sensor2BlockedSinceRef.current = null;
          }
        }
      }

      const moveStep = isBeltMoving ? delta * (speedRef.current * 0.35) : 0;
      const currentItems = visualItemsRef.current;
      const updatedItems: VisualItem[] = [];

      for (let i = 0; i < currentItems.length; i++) {
        const item = { ...currentItems[i] };

        // 1. Phôi đã được gạt / phân loại: Luôn trượt trọng lực vào khay và biến mất (kể cả khi băng tải dừng)
        if (item.deflected || item.sorted) {
          item.yOffset = (item.yOffset || 0) + delta * 200;
          item.opacity = Math.max(0, (item.opacity ?? 1) - delta * 5.0);
          // Đã trượt sâu vào khay hoặc mờ hoàn toàn -> Loại bỏ vĩnh viễn khỏi danh sách phôi
          if (item.yOffset >= 35 || (item.opacity ?? 1) <= 0.05) {
            continue;
          }
          updatedItems.push(item);
          continue;
        }

        // 2. Phôi đang di chuyển trên mặt băng tải (chỉ tiến tới khi băng tải chuyển động)
        if (isBeltMoving) {
          item.progress += moveStep;

          // Sensor 1 Entry (14% - 17%)
          if (item.progress >= 14 && item.progress <= 17 && !item.s1Triggered) {
            item.s1Triggered = true;
            setTelemetry((prev) => ({ ...prev, s1_entry: true }));
            industrialAudio.playSensorBeep();
            scheduleTimeout(() => setTelemetry((prev) => ({ ...prev, s1_entry: false })), 300);
          }

          // Sensor 2 / Diverter Arm 1 (43% - 47%)
          if (item.progress >= 43 && item.progress <= 47 && !item.sorted) {
            if (!item.s2Triggered) {
              item.s2Triggered = true;
              setTelemetry((prev) => ({ ...prev, s2_sorter1: true }));
              scheduleTimeout(() => setTelemetry((prev) => ({ ...prev, s2_sorter1: false })), 250);
            }
            if (item.targetBin === 1) {
              const currentCounts = isSimulationRef.current ? simBinCountsRef.current : realBinCountsRef.current;
              const capacities = binCapacitiesRef?.current || { bin1: 50, bin2: 50, bin3: 50 };
              const cap1 = capacities.bin1 || 50;
              const count1 = currentCounts.bin1 || 0;

              if (count1 < cap1) {
                // Khay 1 chưa đầy -> Gạt phôi vào khay bình thường
                item.sorted = true;
                item.deflected = true;
                item.waitingForBin = undefined;
                setArm1Active(true);
                industrialAudio.playServoArm();
                scheduleTimeout(() => setArm1Active(false), 450);
                onItemSortedRef.current?.(item, 1);
                updatedItems.push(item);
                continue;
              } else {
                // KHAY 1 ĐÃ ĐẦY ĐỊNH MỨC -> Dừng băng tải bảo vệ phôi mẫu, giữ nguyên toàn bộ phôi trên băng
                item.progress = 44;
                item.waitingForBin = 1;
                updatedItems.push(item);
                for (let j = i + 1; j < currentItems.length; j++) {
                  updatedItems.push(currentItems[j]);
                }
                setIsRunning(false);
                isRunningRef.current = false;
                setTelemetry((prev) => ({ ...prev, conveyor_running: false }));
                onPublishCommandRef.current?.("STOP");
                onBinFullDetectedRef.current?.(1);
                break;
              }
            }
          }

          // Sensor 3 / Diverter Arm 2 (70% - 74%)
          if (item.progress >= 70 && item.progress <= 74 && !item.sorted) {
            if (!item.s3Triggered) {
              item.s3Triggered = true;
              setTelemetry((prev) => ({ ...prev, s3_sorter2: true }));
              scheduleTimeout(() => setTelemetry((prev) => ({ ...prev, s3_sorter2: false })), 250);
            }
            if (item.targetBin === 2) {
              const currentCounts = isSimulationRef.current ? simBinCountsRef.current : realBinCountsRef.current;
              const capacities = binCapacitiesRef?.current || { bin1: 50, bin2: 50, bin3: 50 };
              const cap2 = capacities.bin2 || 50;
              const count2 = currentCounts.bin2 || 0;

              if (count2 < cap2) {
                // Khay 2 chưa đầy -> Gạt phôi vào khay bình thường
                item.sorted = true;
                item.deflected = true;
                item.waitingForBin = undefined;
                setArm2Active(true);
                industrialAudio.playServoArm();
                scheduleTimeout(() => setArm2Active(false), 450);
                onItemSortedRef.current?.(item, 2);
                updatedItems.push(item);
                continue;
              } else {
                // KHAY 2 ĐÃ ĐẦY ĐỊNH MỨC -> Dừng băng tải bảo vệ phôi mẫu, giữ nguyên toàn bộ phôi trên băng
                item.progress = 71;
                item.waitingForBin = 2;
                updatedItems.push(item);
                for (let j = i + 1; j < currentItems.length; j++) {
                  updatedItems.push(currentItems[j]);
                }
                setIsRunning(false);
                isRunningRef.current = false;
                setTelemetry((prev) => ({ ...prev, conveyor_running: false }));
                onPublishCommandRef.current?.("STOP");
                onBinFullDetectedRef.current?.(2);
                break;
              }
            }
          }

          // End of belt / Default Bin 3 (96%)
          if (item.progress >= 96 && !item.sorted) {
            const currentCounts = isSimulationRef.current ? simBinCountsRef.current : realBinCountsRef.current;
            const capacities = binCapacitiesRef?.current || { bin1: 50, bin2: 50, bin3: 50 };
            const cap3 = capacities.bin3 || 50;
            const count3 = currentCounts.bin3 || 0;

            if (count3 < cap3) {
              // Khay 3 chưa đầy -> Cho phôi trượt rơi trọng lực mượt mà vào máng Khay 3
              item.sorted = true;
              item.deflected = true;
              item.waitingForBin = undefined;
              onItemSortedRef.current?.(item, 3);
              updatedItems.push(item);
              continue;
            } else {
              // KHAY 3 ĐÃ ĐẦY ĐỊNH MỨC -> Dừng băng tải bảo vệ phôi mẫu, giữ nguyên toàn bộ phôi trên băng
              item.progress = 95;
              item.waitingForBin = 3;
              updatedItems.push(item);
              for (let j = i + 1; j < currentItems.length; j++) {
                updatedItems.push(currentItems[j]);
              }
              setIsRunning(false);
              isRunningRef.current = false;
              setTelemetry((prev) => ({ ...prev, conveyor_running: false }));
              onPublishCommandRef.current?.("STOP");
              onBinFullDetectedRef.current?.(3);
              break;
            }
          }

          if (item.progress < 100) updatedItems.push(item);
        } else {
          // Băng tải đang dừng: Giữ nguyên phôi chưa phân loại trên mặt băng
          updatedItems.push(item);
        }
      }

      // Cập nhật DOM ảo (React state) và đồng bộ ngay lập tức khi số lượng phôi thay đổi hoặc khi rỗng
      const countChanged = updatedItems.length !== visualItemsRef.current.length;
      const isNowEmpty = updatedItems.length === 0 && visualItemsRef.current.length > 0;

      if (isNowEmpty || countChanged || !lastRenderTimeRef.current || time - lastRenderTimeRef.current > 33) {
        setVisualItems(updatedItems);
        lastRenderTimeRef.current = time;
      }
      // Luôn cập nhật ref ngay lập tức cho logic physics (chạy 60fps)
      visualItemsRef.current = updatedItems;

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      // BUG-03: Cleanup all tracked timeouts on unmount
      timeoutIdsRef.current.forEach((id) => clearTimeout(id));
      timeoutIdsRef.current = [];
    };
  }, [scheduleTimeout, setTelemetry, telemetryRef, isSimulationRef, realBinCountsRef, setVisualItems, simBinCountsRef, binCapacitiesRef]);

  // Kích hoạt giả lập kẹt phôi thủ công (Demo & Test - Chỉ cho phép ở Chế độ Mô phỏng)
  const triggerJamDemo = useCallback(
    (customPayload?: Partial<JamDetectedPayload>) => {
      if (!isSimulationRef.current) return;

      setIsRunning(false);
      isRunningRef.current = false;
      setTelemetry((prev) => ({ ...prev, conveyor_running: false, s2_sorter1: true }));
      onPublishCommandRef.current?.("STOP");

      let hasZoneAItem = false;
      const updated = visualItemsRef.current.map((it) => {
        if (!hasZoneAItem && !it.sorted && it.progress >= 30 && it.progress <= 60) {
          hasZoneAItem = true;
          return { ...it, progress: 45, isJammed: true };
        }
        return it;
      });

      if (!hasZoneAItem) {
        const demoJammedItem: VisualItem = {
          id: `#JAM_${Date.now().toString().slice(-4)}`,
          brandKey: "med_syringe", // Bơm kim tiêm / Dao mổ
          progress: 45,
          targetBin: 1,
          yOffset: 0,
          opacity: 1,
          deflected: false,
          sorted: false,
          isSim: true,
          isJammed: true,
        };
        setVisualItems([...updated, demoJammedItem]);
      } else {
        setVisualItems(updated);
      }

      const payload: JamDetectedPayload = {
        event: "jam_detected",
        section: customPayload?.section || "Conveyor_Belt_Zone_A",
        duration_seconds: customPayload?.duration_seconds ?? 5,
        sensor_id: customPayload?.sensor_id || "OPTICAL_JAM_02",
        mode: customPayload?.mode || (isSimulationRef.current ? "simulation" : "realtime"),
        timestamp: customPayload?.timestamp || new Date().toISOString(),
      };
      onJamDetectedRef.current?.(payload);
    },
    [isSimulationRef, setTelemetry, setVisualItems]
  );

  // Xóa kẹt phôi & khôi phục trạng thái
  const clearJam = useCallback(() => {
    sensor2BlockedSinceRef.current = null;
    setVisualItems((prev) =>
      prev.map((it) => (it.isJammed || (it as { isBlockedByFullBin?: boolean }).isBlockedByFullBin ? { ...it, isJammed: false, isBlockedByFullBin: false, progress: 49 } : it))
    );
    setTelemetry((prev) => ({ ...prev, s2_sorter1: false }));
  }, [setTelemetry, setVisualItems]);

  return {
    isRunning,
    setIsRunning,
    conveyorSpeed,
    setConveyorSpeed,
    arm1Active,
    arm2Active,
    setArm1Active,
    setArm2Active,
    visualItems,
    setVisualItems,
    visualItemsRef,
    isRunningRef,
    speedRef,
    productSeqRef,
    spawnVisualPackage,
    handleToggleRun,
    handleEmergencyStop,
    handleSpeedChange,
    handleResetActuatorStates,
    triggerJamDemo,
    clearJam,
  };
}
