idf_component_register(
    SRCS "captive_portal.c"
    INCLUDE_DIRS "include"
    REQUIRES esp_http_server nvs_config esp_system
)
