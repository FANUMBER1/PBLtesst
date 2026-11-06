#pragma once

// Đồng bộ toàn bộ ứng dụng và các component firmware trên cùng một định nghĩa giao thức và cấu hình.
// Header cục bộ của component là nguồn chuẩn duy nhất (single source of truth) và được expose cho main qua dependency nvs_config.
#include "../components/nvs_config/include/app_config.h"
