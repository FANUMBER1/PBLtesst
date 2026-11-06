idf_component_register(
    SRCS "mqtt_handler.c"
    INCLUDE_DIRS "include"
    REQUIRES mqtt json wifi_manager nvs_config state_machine sorting_engine encoder safety_monitor sensors servo esp_timer mbedtls led_indicator
)
