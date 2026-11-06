#include "unity.h"
#include "state_machine.h"
#include "motor_control.h"

TEST_CASE("State Machine Boot Safety", "[state_machine]")
{
    motor_control_init();
    esp_err_t ret = state_machine_init();
    TEST_ASSERT_EQUAL(ESP_OK, ret);
    // Trạng thái khởi động LUÔN LUÔN phải là IDLE
    TEST_ASSERT_EQUAL(SYSTEM_STATE_IDLE, state_machine_get_state());
    TEST_ASSERT_EQUAL_STRING("IDLE", state_machine_get_state_str(SYSTEM_STATE_IDLE));
}

TEST_CASE("State Machine Normal Transitions", "[state_machine]")
{
    motor_control_init();
    state_machine_init();

    // IDLE -> RUNNING
    esp_err_t ret = state_machine_process_event(SYSTEM_EVENT_START);
    TEST_ASSERT_EQUAL(ESP_OK, ret);
    TEST_ASSERT_EQUAL(SYSTEM_STATE_RUNNING, state_machine_get_state());

    // RUNNING -> STOPPED
    ret = state_machine_process_event(SYSTEM_EVENT_STOP);
    TEST_ASSERT_EQUAL(ESP_OK, ret);
    TEST_ASSERT_EQUAL(SYSTEM_STATE_STOPPED, state_machine_get_state());

    // STOPPED -> RUNNING
    ret = state_machine_process_event(SYSTEM_EVENT_START);
    TEST_ASSERT_EQUAL(ESP_OK, ret);
    TEST_ASSERT_EQUAL(SYSTEM_STATE_RUNNING, state_machine_get_state());
}

TEST_CASE("State Machine Jam and E-Stop Safety Logic", "[state_machine]")
{
    motor_control_init();
    state_machine_init();
    state_machine_process_event(SYSTEM_EVENT_START);
    TEST_ASSERT_EQUAL(SYSTEM_STATE_RUNNING, state_machine_get_state());

    // Kích hoạt sự cố kẹt phôi khẩn cấp (Emergency Jam)
    esp_err_t ret = state_machine_process_event(SYSTEM_EVENT_JAM_DETECTED);
    TEST_ASSERT_EQUAL(ESP_OK, ret);
    TEST_ASSERT_EQUAL(SYSTEM_STATE_JAMMED, state_machine_get_state());

    // Lệnh START phải bị từ chối khi đang trong trạng thái JAMMED
    ret = state_machine_process_event(SYSTEM_EVENT_START);
    TEST_ASSERT_EQUAL(ESP_ERR_INVALID_STATE, ret);
    TEST_ASSERT_EQUAL(SYSTEM_STATE_JAMMED, state_machine_get_state());

    // ESTOP_RELEASE phải chuyển về IDLE (TUYỆT ĐỐI KHÔNG nhảy trực tiếp sang RUNNING)
    ret = state_machine_process_event(SYSTEM_EVENT_ESTOP_RELEASE);
    TEST_ASSERT_EQUAL(ESP_OK, ret);
    TEST_ASSERT_EQUAL(SYSTEM_STATE_IDLE, state_machine_get_state());
    TEST_ASSERT_FALSE(motor_control_is_running());
}
