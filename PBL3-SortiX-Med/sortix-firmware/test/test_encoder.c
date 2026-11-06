#include "unity.h"
#include "encoder.h"

TEST_CASE("Encoder count to distance conversion", "[encoder]")
{
    encoder_set_counts_per_mm(31.5f);
    TEST_ASSERT_FLOAT_WITHIN(0.01f, 31.5f, encoder_get_counts_per_mm());

    // 315 xung phải tương đương chính xác 10.0 mm
    float dist = encoder_counts_to_mm(315);
    TEST_ASSERT_FLOAT_WITHIN(0.05f, 10.0f, dist);

    // 200 mm phải tương đương 6300 xung
    int64_t counts = encoder_mm_to_counts(200.0f);
    TEST_ASSERT_EQUAL_INT64(6300, counts);
}

TEST_CASE("Encoder zero count conversion", "[encoder]")
{
    float dist = encoder_counts_to_mm(0);
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, dist);

    int64_t counts = encoder_mm_to_counts(0.0f);
    TEST_ASSERT_EQUAL_INT64(0, counts);
}
