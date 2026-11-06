#include "captive_portal.h"
#include "nvs_config.h"
#include "esp_http_server.h"
#include "esp_log.h"
#include "esp_system.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <ctype.h>

static const char *TAG = "CAPTIVE_PORTAL";
static httpd_handle_t s_server = NULL;

static const char s_html_page[] =
"<!DOCTYPE html><html><head><meta charset='utf-8'>"
"<meta name='viewport' content='width=device-width,initial-scale=1'>"
"<title>SortiX Config Portal</title>"
"<style>body{font-family:sans-serif;background:#0f172a;color:#f8fafc;padding:20px;max-width:520px;margin:auto;}"
"h2{color:#38bdf8;}label{display:block;margin-top:12px;font-size:14px;color:#cbd5e1;}"
"input{width:100%;padding:10px;margin-top:4px;border:1px solid #334155;border-radius:6px;background:#1e293b;color:#fff;box-sizing:border-box;}"
".check{width:auto;}button{width:100%;padding:12px;margin-top:20px;background:#0284c7;color:#fff;border:0;border-radius:6px;font-size:16px;font-weight:bold;}"
"small{color:#94a3b8;}</style></head><body><h2>SortiX Device Setup</h2>"
"<p><small>Để trống trường mật khẩu/khóa để giữ cấu hình hiện có. MQTT và telemetry chỉ chấp nhận TLS.</small></p>"
"<form method='POST' action='/save'>"
"<label>WiFi SSID</label><input type='text' name='ssid' maxlength='32' required>"
"<label>WiFi Password</label><input type='password' name='pass' maxlength='64'>"
"<label><input class='check' type='checkbox' name='clear_wifi' value='1'> Dùng WiFi không mật khẩu</label>"
"<label>MQTT TLS URI</label><input type='text' name='mqtt' maxlength='127' required placeholder='mqtts://broker.example.com:8883'>"
"<label>MQTT Username</label><input type='text' name='mqtt_user' maxlength='63'>"
"<label>MQTT Password</label><input type='password' name='mqtt_pass' maxlength='63'>"
"<label>Control Secret</label><input type='password' name='control_secret' maxlength='63' minlength='16' autocomplete='new-password'>"
"<small>Phải trùng SORTIX_CONTROL_SECRET trên Dashboard/backend; tối thiểu 16 ký tự.</small>"
"<label>Device API Token</label><input type='password' name='device_token' maxlength='63' minlength='16' autocomplete='new-password'>"
"<small>Phải trùng DEVICE_TOKEN trên backend; dùng riêng, không dùng Control Secret.</small>"
"<label>HTTPS Telemetry URL</label><input type='text' name='http' maxlength='127' placeholder='https://api.example.com/api/telemetry'>"
"<label><input class='check' type='checkbox' name='disable_http' value='1'> Tắt HTTP telemetry</label>"
"<button type='submit'>Save &amp; Restart</button></form></body></html>";

typedef struct {
    char ssid[128];
    char pass[256];
    char mqtt[384];
    char mqtt_user[192];
    char mqtt_pass[192];
    char control_secret[192];
    char device_token[192];
    char http[384];
    char clear_wifi[8];
    char disable_http[8];
} raw_form_t;

static int hex_value(char ch)
{
    if (ch >= '0' && ch <= '9') return ch - '0';
    if (ch >= 'a' && ch <= 'f') return ch - 'a' + 10;
    if (ch >= 'A' && ch <= 'F') return ch - 'A' + 10;
    return -1;
}

static bool url_decode(char *dst, size_t dst_len, const char *src)
{
    size_t out = 0;
    if (dst == NULL || dst_len == 0 || src == NULL) return false;

    while (*src != '\0') {
        unsigned char value;
        if (*src == '+') {
            value = ' ';
            src++;
        } else if (*src == '%') {
            if (src[1] == '\0' || src[2] == '\0') return false;
            int hi = hex_value(src[1]);
            int lo = hex_value(src[2]);
            if (hi < 0 || lo < 0) return false;
            value = (unsigned char)((hi << 4) | lo);
            if (value == '\0') return false;
            src += 3;
        } else {
            value = (unsigned char)*src++;
        }
        if (out + 1 >= dst_len) return false;
        dst[out++] = (char)value;
    }
    dst[out] = '\0';
    return true;
}

static bool copy_raw(char *dst, size_t dst_len, const char *src, size_t src_len)
{
    if (src_len >= dst_len) return false;
    memcpy(dst, src, src_len);
    dst[src_len] = '\0';
    return true;
}

static bool uri_has_host(const char *uri, size_t scheme_len)
{
    if (uri == NULL || uri[scheme_len] == '\0' || uri[scheme_len] == '/' ||
        uri[scheme_len] == '?' || uri[scheme_len] == '#' || uri[scheme_len] == ':') return false;
    for (const unsigned char *p = (const unsigned char *)uri + scheme_len;
         *p != '\0' && *p != '/' && *p != '?' && *p != '#'; p++) {
        if (*p == '@' || isspace(*p)) return false;
    }
    return true;
}

static bool is_secure_mqtt_uri(const char *uri)
{
    if (uri == NULL) return false;
    if (strncmp(uri, "mqtts://", 8) == 0) return uri_has_host(uri, 8);
    if (strncmp(uri, "wss://", 6) == 0) return uri_has_host(uri, 6);
    return false;
}

static bool is_https_url(const char *url)
{
    return url != NULL && strncmp(url, "https://", 8) == 0 && uri_has_host(url, 8);
}

static void set_bad_request(httpd_req_t *req, const char *message)
{
    httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, message);
}

static esp_err_t root_get_handler(httpd_req_t *req)
{
    httpd_resp_set_type(req, "text/html; charset=utf-8");
    httpd_resp_set_hdr(req, "Cache-Control", "no-store");
    httpd_resp_set_hdr(req, "X-Content-Type-Options", "nosniff");
    httpd_resp_send(req, s_html_page, HTTPD_RESP_USE_STRLEN);
    return ESP_OK;
}

static esp_err_t save_post_handler(httpd_req_t *req)
{
    int total_len = req->content_len;
    if (total_len <= 0 || total_len > 4096) {
        set_bad_request(req, "Invalid content length");
        return ESP_FAIL;
    }

    char *buf = malloc((size_t)total_len + 1);
    if (buf == NULL) {
        httpd_resp_send_500(req);
        return ESP_FAIL;
    }

    int cur_len = 0;
    while (cur_len < total_len) {
        int received = httpd_req_recv(req, buf + cur_len, total_len - cur_len);
        if (received <= 0) {
            if (received == HTTPD_SOCK_ERR_TIMEOUT) continue;
            free(buf);
            httpd_resp_send_500(req);
            return ESP_FAIL;
        }
        cur_len += received;
    }
    buf[total_len] = '\0';

    raw_form_t raw = {0};
    bool form_valid = true;
    char *part = strtok(buf, "&");
    while (part != NULL && form_valid) {
        char *eq = strchr(part, '=');
        if (eq != NULL) {
            *eq = '\0';
            const char *key = part;
            const char *value = eq + 1;
            size_t value_len = strlen(value);
#define COPY_FORM_FIELD(field) \
            if (strcmp(key, #field) == 0) form_valid = copy_raw(raw.field, sizeof(raw.field), value, value_len)
            COPY_FORM_FIELD(ssid);
            else COPY_FORM_FIELD(pass);
            else COPY_FORM_FIELD(mqtt);
            else COPY_FORM_FIELD(mqtt_user);
            else COPY_FORM_FIELD(mqtt_pass);
            else COPY_FORM_FIELD(control_secret);
            else COPY_FORM_FIELD(device_token);
            else COPY_FORM_FIELD(http);
            else COPY_FORM_FIELD(clear_wifi);
            else COPY_FORM_FIELD(disable_http);
#undef COPY_FORM_FIELD
        }
        part = strtok(NULL, "&");
    }
    free(buf);
    if (!form_valid) {
        set_bad_request(req, "Form field is too long");
        return ESP_FAIL;
    }

    char ssid[sizeof(((sortix_sys_config_t *)0)->wifi_ssid)] = {0};
    char pass[sizeof(((sortix_sys_config_t *)0)->wifi_pass)] = {0};
    char mqtt[sizeof(((sortix_sys_config_t *)0)->mqtt_broker_uri)] = {0};
    char mqtt_user[sizeof(((sortix_sys_config_t *)0)->mqtt_user)] = {0};
    char mqtt_pass[sizeof(((sortix_sys_config_t *)0)->mqtt_pass)] = {0};
    char control_secret[sizeof(((sortix_sys_config_t *)0)->control_secret)] = {0};
    char device_token[64] = {0};
    char http[sizeof(((sortix_sys_config_t *)0)->http_telemetry_url)] = {0};
    if (!url_decode(ssid, sizeof(ssid), raw.ssid) ||
        !url_decode(pass, sizeof(pass), raw.pass) ||
        !url_decode(mqtt, sizeof(mqtt), raw.mqtt) ||
        !url_decode(mqtt_user, sizeof(mqtt_user), raw.mqtt_user) ||
        !url_decode(mqtt_pass, sizeof(mqtt_pass), raw.mqtt_pass) ||
        !url_decode(control_secret, sizeof(control_secret), raw.control_secret) ||
        !url_decode(device_token, sizeof(device_token), raw.device_token) ||
        !url_decode(http, sizeof(http), raw.http)) {
        set_bad_request(req, "Invalid or oversized URL-encoded form value");
        return ESP_FAIL;
    }

    size_t ssid_len = strlen(ssid);
    if (ssid_len == 0 || ssid_len > 32) {
        set_bad_request(req, "WiFi SSID must contain 1-32 characters");
        return ESP_FAIL;
    }
    if (pass[0] != '\0' && (strlen(pass) < 8 || strlen(pass) > 64)) {
        set_bad_request(req, "WiFi password must contain 8-64 characters");
        return ESP_FAIL;
    }
    if ((mqtt[0] != '\0') && (strlen(mqtt) > 127 || !is_secure_mqtt_uri(mqtt))) {
        set_bad_request(req, "MQTT URI must use mqtts:// or wss://");
        return ESP_FAIL;
    }
    if ((mqtt_user[0] == '\0') != (mqtt_pass[0] == '\0')) {
        set_bad_request(req, "Set both MQTT username and password, or leave both empty to keep current values");
        return ESP_FAIL;
    }
    if (http[0] != '\0' && (strlen(http) > 127 || !is_https_url(http))) {
        set_bad_request(req, "Telemetry URL must use https://");
        return ESP_FAIL;
    }
    if (control_secret[0] != '\0' && (strlen(control_secret) < 16 || strlen(control_secret) > 63)) {
        set_bad_request(req, "Control Secret must contain 16-63 characters");
        return ESP_FAIL;
    }
    if (device_token[0] != '\0' && (strlen(device_token) < 16 || strlen(device_token) > 63)) {
        set_bad_request(req, "Device API Token must contain 16-63 characters");
        return ESP_FAIL;
    }

    sortix_sys_config_t new_cfg;
    memcpy(&new_cfg, nvs_config_get(), sizeof(new_cfg));
    char new_device_token[64];
    strncpy(new_device_token, nvs_config_get_device_token(), sizeof(new_device_token) - 1);
    new_device_token[sizeof(new_device_token) - 1] = '\0';

    strncpy(new_cfg.wifi_ssid, ssid, sizeof(new_cfg.wifi_ssid) - 1);
    new_cfg.wifi_ssid[sizeof(new_cfg.wifi_ssid) - 1] = '\0';
    if (strcmp(raw.clear_wifi, "1") == 0) {
        new_cfg.wifi_pass[0] = '\0';
    } else if (pass[0] != '\0') {
        strncpy(new_cfg.wifi_pass, pass, sizeof(new_cfg.wifi_pass) - 1);
        new_cfg.wifi_pass[sizeof(new_cfg.wifi_pass) - 1] = '\0';
    }
    if (mqtt[0] != '\0') {
        strncpy(new_cfg.mqtt_broker_uri, mqtt, sizeof(new_cfg.mqtt_broker_uri) - 1);
        new_cfg.mqtt_broker_uri[sizeof(new_cfg.mqtt_broker_uri) - 1] = '\0';
    }
    if (mqtt_user[0] != '\0') {
        strncpy(new_cfg.mqtt_user, mqtt_user, sizeof(new_cfg.mqtt_user) - 1);
        new_cfg.mqtt_user[sizeof(new_cfg.mqtt_user) - 1] = '\0';
        strncpy(new_cfg.mqtt_pass, mqtt_pass, sizeof(new_cfg.mqtt_pass) - 1);
        new_cfg.mqtt_pass[sizeof(new_cfg.mqtt_pass) - 1] = '\0';
    }
    if (control_secret[0] != '\0') {
        strncpy(new_cfg.control_secret, control_secret, sizeof(new_cfg.control_secret) - 1);
        new_cfg.control_secret[sizeof(new_cfg.control_secret) - 1] = '\0';
    }
    if (device_token[0] != '\0') {
        strncpy(new_device_token, device_token, sizeof(new_device_token) - 1);
        new_device_token[sizeof(new_device_token) - 1] = '\0';
    }
    if (strcmp(raw.disable_http, "1") == 0) {
        new_cfg.http_telemetry_url[0] = '\0';
    } else if (http[0] != '\0') {
        strncpy(new_cfg.http_telemetry_url, http, sizeof(new_cfg.http_telemetry_url) - 1);
        new_cfg.http_telemetry_url[sizeof(new_cfg.http_telemetry_url) - 1] = '\0';
    }

    if (strlen(new_cfg.control_secret) < 16) {
        set_bad_request(req, "Provision a Control Secret of at least 16 characters before saving");
        return ESP_FAIL;
    }
    if (new_cfg.http_telemetry_url[0] != '\0' && strlen(new_device_token) < 16) {
        set_bad_request(req, "Set a separate Device API Token before enabling HTTPS telemetry");
        return ESP_FAIL;
    }
    if (!is_secure_mqtt_uri(new_cfg.mqtt_broker_uri)) {
        set_bad_request(req, "Provision an MQTT broker URI using TLS (mqtts:// or wss://)");
        return ESP_FAIL;
    }

    esp_err_t ret = nvs_config_save_portal_config(&new_cfg, new_device_token);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to persist portal configuration: %s", esp_err_to_name(ret));
        httpd_resp_send_500(req);
        return ret;
    }

    httpd_resp_set_type(req, "text/html; charset=utf-8");
    httpd_resp_send(req, "<h3>Đã lưu cấu hình. Thiết bị đang khởi động lại...</h3>", HTTPD_RESP_USE_STRLEN);
    vTaskDelay(pdMS_TO_TICKS(1500));
    esp_restart();
    return ESP_OK;
}

esp_err_t captive_portal_start(void)
{
    if (s_server != NULL) return ESP_OK;
    httpd_config_t config = HTTPD_DEFAULT_CONFIG();
    config.max_uri_handlers = 2;
    config.max_req_hdr_len = 1024;
    config.max_uri_len = 512;

    esp_err_t ret = httpd_start(&s_server, &config);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to start HTTP server: %s", esp_err_to_name(ret));
        return ret;
    }

    const httpd_uri_t root_uri = {
        .uri = "/",
        .method = HTTP_GET,
        .handler = root_get_handler,
    };
    ret = httpd_register_uri_handler(s_server, &root_uri);
    if (ret != ESP_OK) goto fail;

    const httpd_uri_t save_uri = {
        .uri = "/save",
        .method = HTTP_POST,
        .handler = save_post_handler,
    };
    ret = httpd_register_uri_handler(s_server, &save_uri);
    if (ret != ESP_OK) goto fail;

    ESP_LOGI(TAG, "Captive portal HTTP server started on port 80");
    return ESP_OK;

fail:
    httpd_stop(s_server);
    s_server = NULL;
    return ret;
}

void captive_portal_stop(void)
{
    if (s_server != NULL) {
        httpd_stop(s_server);
        s_server = NULL;
        ESP_LOGI(TAG, "Captive portal HTTP server stopped");
    }
}
