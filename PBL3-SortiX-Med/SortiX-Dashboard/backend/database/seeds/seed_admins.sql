-- ============================================================================
-- Seeder: seed_admins.sql
-- Description: Idempotent seed script to insert exactly 4 initial Admin accounts.
-- Default Password: 123456
-- Bcrypt Hash (Salt rounds 10): $2b$10$pPw2AmBT1scTY5wU5cmpb.iLoWJZDwaVaGTxb0iT/diTyE2GKpECO
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. POSTGRESQL IDEMPOTENT SEED (ON CONFLICT DO UPDATE / DO NOTHING)
-- ----------------------------------------------------------------------------
/*
INSERT INTO users (id, username, full_name, email, password_hash, role, status, created_at, updated_at)
VALUES 
    (gen_random_uuid(), 'admin1', 'Nguyễn Tá Duy Phong', 'admin1@system.local', '$2b$10$99OI5VV7ywqNghc0MPOQAef3HGT8/Z3DSWLGq/g3OvDOYoF7E/qiG', 'admin', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'admin2', 'Nguyễn Nhật Minh', 'admin2@system.local', '$2b$10$99OI5VV7ywqNghc0MPOQAef3HGT8/Z3DSWLGq/g3OvDOYoF7E/qiG', 'admin', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'admin3', 'Trần Đăng Lợi', 'admin3@system.local', '$2b$10$99OI5VV7ywqNghc0MPOQAef3HGT8/Z3DSWLGq/g3OvDOYoF7E/qiG', 'admin', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'admin4', 'Nguyễn Đình Anh Tuấn', 'admin4@system.local', '$2b$10$99OI5VV7ywqNghc0MPOQAef3HGT8/Z3DSWLGq/g3OvDOYoF7E/qiG', 'admin', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (username) DO UPDATE 
SET 
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = 'admin',
    status = 'active',
    updated_at = CURRENT_TIMESTAMP;
*/

-- ----------------------------------------------------------------------------
-- 2. MYSQL / MARIADB IDEMPOTENT SEED (ON DUPLICATE KEY UPDATE)
-- ----------------------------------------------------------------------------
/*
INSERT INTO users (id, username, full_name, email, password_hash, role, status, created_at, updated_at)
VALUES 
    (UUID(), 'admin1', 'Nguyễn Tá Duy Phong', 'admin1@system.local', '$2b$10$99OI5VV7ywqNghc0MPOQAef3HGT8/Z3DSWLGq/g3OvDOYoF7E/qiG', 'admin', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (UUID(), 'admin2', 'Nguyễn Nhật Minh', 'admin2@system.local', '$2b$10$99OI5VV7ywqNghc0MPOQAef3HGT8/Z3DSWLGq/g3OvDOYoF7E/qiG', 'admin', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (UUID(), 'admin3', 'Trần Đăng Lợi', 'admin3@system.local', '$2b$10$99OI5VV7ywqNghc0MPOQAef3HGT8/Z3DSWLGq/g3OvDOYoF7E/qiG', 'admin', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (UUID(), 'admin4', 'Nguyễn Đình Anh Tuấn', 'admin4@system.local', '$2b$10$99OI5VV7ywqNghc0MPOQAef3HGT8/Z3DSWLGq/g3OvDOYoF7E/qiG', 'admin', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE 
    full_name = VALUES(full_name),
    email = VALUES(email),
    role = 'admin',
    status = 'active',
    updated_at = CURRENT_TIMESTAMP;
*/

-- ----------------------------------------------------------------------------
-- 3. SQLITE IDEMPOTENT SEED (ON CONFLICT DO NOTHING)
-- ----------------------------------------------------------------------------
INSERT INTO users (id, username, full_name, email, password_hash, role, status, created_at, updated_at)
VALUES 
    ('admin-id-001', 'admin1', 'Nguyễn Tá Duy Phong', 'admin1@system.local', '$2b$10$99OI5VV7ywqNghc0MPOQAef3HGT8/Z3DSWLGq/g3OvDOYoF7E/qiG', 'admin', 'active', datetime('now'), datetime('now')),
    ('admin-id-002', 'admin2', 'Nguyễn Nhật Minh', 'admin2@system.local', '$2b$10$99OI5VV7ywqNghc0MPOQAef3HGT8/Z3DSWLGq/g3OvDOYoF7E/qiG', 'admin', 'active', datetime('now'), datetime('now')),
    ('admin-id-003', 'admin3', 'Trần Đăng Lợi', 'admin3@system.local', '$2b$10$99OI5VV7ywqNghc0MPOQAef3HGT8/Z3DSWLGq/g3OvDOYoF7E/qiG', 'admin', 'active', datetime('now'), datetime('now')),
    ('admin-id-004', 'admin4', 'Nguyễn Đình Anh Tuấn', 'admin4@system.local', '$2b$10$99OI5VV7ywqNghc0MPOQAef3HGT8/Z3DSWLGq/g3OvDOYoF7E/qiG', 'admin', 'active', datetime('now'), datetime('now'))
ON CONFLICT(username) DO UPDATE 
SET 
    full_name = excluded.full_name,
    email = excluded.email,
    role = 'admin',
    status = 'active',
    updated_at = datetime('now');
