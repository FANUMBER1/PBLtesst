idf_component_register(
    SRCS "main.c"
    INCLUDE_DIRS "."
    REQUIRES
        motor_control
        encoder
        servo
        sensors
        button
        led_indicator
        wifi_manager
        mqtt_handler
        http_telemetry
        sorting_engine
        state_machine
        safety_monitor
        nvs_config
        captive_portal
        esp_timer
        nvs_flash
        driver
        esp_wifi
        esp_netif
        mqtt
        esp_http_client
        json
)
