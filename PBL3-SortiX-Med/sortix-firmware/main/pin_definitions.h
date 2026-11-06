#pragma once

#include "driver/gpio.h"

/**
 * =============================================================================
 * Định nghĩa sơ đồ chân phần cứng (Pinout) SortiX
 * Bo mạch mục tiêu: WeAct Studio ESP32-C5-A-N8R8 (ESP32-C5-WROOM-1-N8R8)
 * Tài liệu tham chiếu BOM linh kiện: danh-sach-linh-kien.md
 * =============================================================================
 *
 * ⚠ CÁC CHÂN CẤM SỬ DỤNG (TUYỆT ĐỐI KHÔNG DÙNG TRONG MỌI TRƯỜNG HỢP):
 *  - GPIO15 (SPICS1): Đã nối cứng bên trong với chip 8 MB Quad SPI PSRAM dưới seal kim loại.
 *  - GPIO13, GPIO14: Cổng USB Native (D-, D+) phục vụ nạp flash firmware, JTAG và USB-CDC console.
 *  - GPIO11, GPIO12: Cổng UART0 Debug Console (TX0, RX0 qua chip nạp CH343).
 *  - GPIO26, GPIO27, GPIO28: Các chân Strapping khởi động (Boot Mode), log ROM, nút RGB/BOOT.
 */

// --- Cảm biến (Sensors) ---
#define PIN_IR_S1               GPIO_NUM_0   // Hàng chân trái Pin 5: Cảm biến vật cản hồng ngoại S1 (Active Low)
#define PIN_ENCODER_A           GPIO_NUM_1   // Hàng chân trái Pin 6: Encoder Phase A (Tín hiệu xung)
#define PIN_ENCODER_B           GPIO_NUM_4   // Hàng chân phải Pin 8: Encoder Phase B (Tín hiệu chiều quay)
#define PIN_LDR_DO              GPIO_NUM_5   // Hàng chân phải Pin 9: Cảm biến ánh sáng quang trở LDR (DO)

// --- Cơ cấu chấp hành & Driver động cơ ---
#define PIN_SERVO_1             GPIO_NUM_6   // Hàng chân trái Pin 7: Xung PWM Servo 1 (Cần gạt 1 - Khay 1)
#define PIN_MOTOR_IN1           GPIO_NUM_8   // Hàng chân trái Pin 9: L298N IN1 (Chiều quay/PWM)
#define PIN_MOTOR_IN2           GPIO_NUM_9   // Hàng chân trái Pin 10: L298N IN2 (Chiều quay/PWM)
#define PIN_SERVO_2             GPIO_NUM_7   // Hàng chân trái Pin 8: Xung PWM Servo 2 (Cần gạt 2 - Khay 2)

// --- Giao diện người dùng & Đèn báo ---
#define PIN_LED_STATUS          GPIO_NUM_10  // Hàng chân trái Pin 11: LED trạng thái (Màu xanh lá)
#define PIN_BTN_START           GPIO_NUM_23  // Hàng chân phải Pin 5: Nút nhấn Start (NO, Pull-up 10k + mạch lọc RC)
