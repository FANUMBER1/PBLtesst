#include "unity.h"
#include "sorting_engine.h"
#include <string.h>

TEST_CASE("Sorting Engine Initialization and Line Empty", "[sorting_engine]")
{
    esp_err_t ret = sorting_engine_init();
    TEST_ASSERT_EQUAL(ESP_OK, ret);
    TEST_ASSERT_TRUE(sorting_engine_is_line_empty());
    TEST_ASSERT_EQUAL_UINT32(1, sorting_engine_get_active_config_version());
}

TEST_CASE("Sorting Engine S1 Entry and Vision Matching", "[sorting_engine]")
{
    sorting_engine_init();

    // Sự kiện vật phẩm đi qua S1
    esp_err_t ret = sorting_engine_on_s1_entry(100, 500000);
    TEST_ASSERT_EQUAL(ESP_OK, ret);
    TEST_ASSERT_FALSE(sorting_engine_is_line_empty());

    // Ghép cặp với kết quả AI thị giác cho "brand_a" (mặc định cấu hình vào Bin 2)
    ret = sorting_engine_on_vision_result("uuid_123", "brand_a", 0.95f);
    TEST_ASSERT_EQUAL(ESP_OK, ret);
}

TEST_CASE("Dynamic SorterConfig JSON Parser", "[sorting_engine]")
{
    sorting_engine_init();

    const char *test_config =
        "{"
        "  \"config_version\": 2,"
        "  \"bins\": ["
        "    { \"bin_id\": 1, \"brand_ids\": [\"syringe\", \"scalpel\"] },"
        "    { \"bin_id\": 2, \"brand_ids\": [\"forceps\"] }"
        "  ],"
        "  \"default_bin\": 3,"
        "  \"apply_mode\": \"immediate\""
        "}";

    bool applied = false;
    char reason[64] = {0};
    esp_err_t ret = sorting_engine_apply_config_json(test_config, &applied, reason, sizeof(reason));

    TEST_ASSERT_EQUAL(ESP_OK, ret);
    TEST_ASSERT_TRUE(applied);
    TEST_ASSERT_EQUAL_UINT32(2, sorting_engine_get_active_config_version());
}

TEST_CASE("Dynamic SorterConfig Rejection on Malformed JSON", "[sorting_engine]")
{
    sorting_engine_init();

    const char *bad_config = "{ \"invalid\": true }";
    bool applied = false;
    char reason[64] = {0};
    esp_err_t ret = sorting_engine_apply_config_json(bad_config, &applied, reason, sizeof(reason));

    TEST_ASSERT_EQUAL(ESP_FAIL, ret);
    TEST_ASSERT_FALSE(applied);
}
