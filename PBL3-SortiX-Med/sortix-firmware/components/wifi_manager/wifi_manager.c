#include "wifi_manager.h"
#include "nvs_config.h"
#include "app_config.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_netif.h"
#include "esp_log.h"
#include "esp_random.h"
#include "freertos/FreeRTOS.h"
#include "freertos/event_groups.h"
#include "esp_mac.h"
#include <stdio.h>
#include <string.h>

static const char *TAG = "WIFI_MGR";

#define WIFI_CONNECTED_BIT      BIT0
#define WIFI_FAIL_BIT           BIT1
#define MAX_RETRY_COUNT         5

static EventGroupHandle_t s_wifi_event_group = NULL;
static esp_netif_t *s_sta_netif = NULL;
static esp_netif_t *s_ap_netif = NULL;

static int s_retry_num = 0;
static bool s_is_connected = false;
static char s_ip_address[32] = "0.0.0.0";
static bool s_is_5ghz = false;
static bool s_softap_started = false;
static char s_softap_password[17] = {0};

static void generate_softap_password(void)
{
    static const char alphabet[] = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    uint8_t random_bytes[sizeof(s_softap_password) - 1];
    esp_fill_random(random_bytes, sizeof(random_bytes));
    for (size_t i = 0; i < sizeof(random_bytes); i++) {
        s_softap_password[i] = alphabet[random_bytes[i] % (sizeof(alphabet) - 1)];
    }
    s_softap_password[sizeof(s_softap_password) - 1] = '\0';
}

static void wifi_event_handler(void *arg, esp_event_base_t event_base,
                               int32_t event_id, void *event_data)
{
    if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_START) {
        ESP_LOGI(TAG, "Wi-Fi Station started, connecting to AP...");
        esp_wifi_connect();
    } else if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_DISCONNECTED) {
        s_is_connected = false;
        strncpy(s_ip_address, "0.0.0.0", sizeof(s_ip_address));
        if (s_retry_num < MAX_RETRY_COUNT) {
            s_retry_num++;
            ESP_LOGW(TAG, "Reconnecting to AP (attempt %d/%d)...", s_retry_num, MAX_RETRY_COUNT);
            esp_wifi_connect();
        } else {
            ESP_LOGE(TAG, "Failed to connect to AP after %d attempts", MAX_RETRY_COUNT);
            xEventGroupSetBits(s_wifi_event_group, WIFI_FAIL_BIT);
        }
    } else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP) {
        ip_event_got_ip_t *event = (ip_event_got_ip_t *)event_data;
        snprintf(s_ip_address, sizeof(s_ip_address), IPSTR, IP2STR(&event->ip_info.ip));
        s_is_connected = true;
        s_retry_num = 0;
        ESP_LOGI(TAG, "Wi-Fi Connected! IP Address: %s", s_ip_address);

        // Kiểm tra xem có đang kết nối trên kênh tần số 5 GHz (Wi-Fi 6) không
        wifi_ap_record_t ap_info;
        if (esp_wifi_sta_get_ap_info(&ap_info) == ESP_OK) {
            s_is_5ghz = (ap_info.primary > 14);
            ESP_LOGI(TAG, "Connected to SSID: %s, Channel: %d (%s), RSSI: %d dBm",
                     ap_info.ssid, ap_info.primary,
                     s_is_5ghz ? "5.0 GHz (Wi-Fi 6)" : "2.4 GHz", ap_info.rssi);
        }

        xEventGroupSetBits(s_wifi_event_group, WIFI_CONNECTED_BIT);
    }
}

esp_err_t wifi_manager_init(void)
{
    s_wifi_event_group = xEventGroupCreate();
    if (s_wifi_event_group == NULL) return ESP_ERR_NO_MEM;

    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    s_sta_netif = esp_netif_create_default_wifi_sta();
    if (s_sta_netif == NULL) return ESP_ERR_NO_MEM;

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));

    esp_event_handler_instance_t instance_any_id;
    esp_event_handler_instance_t instance_got_ip;
    ESP_ERROR_CHECK(esp_event_handler_instance_register(WIFI_EVENT,
                                                        ESP_EVENT_ANY_ID,
                                                        &wifi_event_handler,
                                                        NULL,
                                                        &instance_any_id));
    ESP_ERROR_CHECK(esp_event_handler_instance_register(IP_EVENT,
                                                        IP_EVENT_STA_GOT_IP,
                                                        &wifi_event_handler,
                                                        NULL,
                                                        &instance_got_ip));

    const sortix_sys_config_t *sys_cfg = nvs_config_get();
    wifi_config_t wifi_config = {0};
    strncpy((char *)wifi_config.sta.ssid, sys_cfg->wifi_ssid, sizeof(wifi_config.sta.ssid));
    strncpy((char *)wifi_config.sta.password, sys_cfg->wifi_pass, sizeof(wifi_config.sta.password));
    wifi_config.sta.threshold.authmode = WIFI_AUTH_WPA2_PSK;
    if (sys_cfg->wifi_pass[0] == '\0') {
        wifi_config.sta.threshold.authmode = WIFI_AUTH_OPEN;
    }

    ESP_LOGI(TAG, "Configured Wi-Fi Station target SSID: '%s'", sys_cfg->wifi_ssid);
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_config));
    ESP_ERROR_CHECK(esp_wifi_start());

    return ESP_OK;
}

bool wifi_manager_is_connected(void)
{
    return s_is_connected;
}

int8_t wifi_manager_get_rssi(void)
{
    if (!s_is_connected) return -100;
    wifi_ap_record_t ap_info;
    if (esp_wifi_sta_get_ap_info(&ap_info) == ESP_OK) {
        return ap_info.rssi;
    }
    return -100;
}

void wifi_manager_get_ip_str(char *buffer, size_t max_len)
{
    if (buffer == NULL || max_len == 0) return;
    strncpy(buffer, s_ip_address, max_len - 1);
    buffer[max_len - 1] = '\0';
}

const char *wifi_manager_get_band_str(void)
{
    return s_is_5ghz ? "5.0 GHz (Wi-Fi 6)" : "2.4 GHz";
}

esp_err_t wifi_manager_start_softap(void)
{
    if (s_softap_started) return ESP_OK;
    ESP_LOGI(TAG, "Starting SoftAP fallback mode");
    if (s_ap_netif == NULL) {
        s_ap_netif = esp_netif_create_default_wifi_ap();
        if (s_ap_netif == NULL) return ESP_ERR_NO_MEM;
    }

    bool has_configured_pass = (strlen(SOFTAP_PASS) >= 8);

    if (!has_configured_pass && s_softap_password[0] == '\0') {
        generate_softap_password();
    }
    wifi_config_t ap_config = {
        .ap = {
            .channel = 1,
            .max_connection = 4,
            .authmode = WIFI_AUTH_WPA2_PSK,
        },
    };

    // Sử dụng SOFTAP_SSID nếu đã cấu hình; ngược lại dùng tên mặc định gắn hậu tố địa chỉ MAC duy nhất
    if (strlen(SOFTAP_SSID) > 0) {
        strncpy((char *)ap_config.ap.ssid, SOFTAP_SSID, sizeof(ap_config.ap.ssid) - 1);
        ap_config.ap.ssid[sizeof(ap_config.ap.ssid) - 1] = '\0';
    } else {
        uint8_t mac[6] = {0};
        esp_read_mac(mac, ESP_MAC_WIFI_STA);
        snprintf((char *)ap_config.ap.ssid, sizeof(ap_config.ap.ssid), "SortiX-Setup-%02X%02X", mac[4], mac[5]);
    }
    ap_config.ap.ssid_len = strlen((char *)ap_config.ap.ssid);

    if (has_configured_pass) {
        strncpy((char *)ap_config.ap.password, SOFTAP_PASS, sizeof(ap_config.ap.password) - 1);
        ap_config.ap.password[sizeof(ap_config.ap.password) - 1] = '\0';
    } else {
        strncpy((char *)ap_config.ap.password, s_softap_password, sizeof(ap_config.ap.password) - 1);
        ap_config.ap.password[sizeof(ap_config.ap.password) - 1] = '\0';
    }

    esp_err_t ret = esp_wifi_set_mode(WIFI_MODE_APSTA);
    if (ret != ESP_OK) return ret;
    ret = esp_wifi_set_config(WIFI_IF_AP, &ap_config);
    if (ret != ESP_OK) return ret;
    s_softap_started = true;

    ESP_LOGI(TAG, "SoftAP '%s' ready (Password: '%s', IP: 192.168.4.1)", ap_config.ap.ssid, ap_config.ap.password);
    return ESP_OK;
}
