idf_component_register(
    SRCS "safety_monitor.c"
    INCLUDE_DIRS "include"
    REQUIRES driver encoder motor_control state_machine esp_timer
)
