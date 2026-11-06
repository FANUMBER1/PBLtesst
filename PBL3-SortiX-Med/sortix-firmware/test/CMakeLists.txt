# Test CMakeLists.txt for SortiX firmware

idf_component_register(
    SRCS
        "test_encoder.c"
        "test_sorting_engine.c"
        "test_state_machine.c"
    INCLUDE_DIRS "."
    REQUIRES
        unity
        encoder
        sorting_engine
        state_machine
        motor_control
        led_indicator
)
