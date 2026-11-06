idf_component_register(
    SRCS "http_telemetry.c"
    INCLUDE_DIRS "include"
    REQUIRES esp_http_client json nvs_config state_machine safety_monitor encoder sensors mbedtls
)
