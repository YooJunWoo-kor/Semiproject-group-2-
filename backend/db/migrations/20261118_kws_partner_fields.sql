-- KWS + KKB : finance partner creation compatibility for the uploaded kws schema
-- Run on the same MySQL database as backend/.env DB_NAME.
-- Back up the database first. DDL auto-commits; there is no transactional rollback.
-- Adds only missing fields; does not delete or overwrite any partners.
-- Executable with MySQL 8.x and MySQL Workbench/DBeaver as a script.

SELECT DATABASE() AS current_database;

SET @partner_migration_sql = IF(
    EXISTS (
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'partners'
          AND COLUMN_NAME = 'bank_name'
    ),
    'SELECT ''partners.bank_name already exists'' AS info',
    'ALTER TABLE partners ADD COLUMN bank_name VARCHAR(100) NULL'
);
PREPARE partner_stmt FROM @partner_migration_sql;
EXECUTE partner_stmt;
DEALLOCATE PREPARE partner_stmt;


SET @partner_migration_sql = IF(
    EXISTS (
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'partners'
          AND COLUMN_NAME = 'account_number'
    ),
    'SELECT ''partners.account_number already exists'' AS info',
    'ALTER TABLE partners ADD COLUMN account_number VARCHAR(100) NULL'
);
PREPARE partner_stmt FROM @partner_migration_sql;
EXECUTE partner_stmt;
DEALLOCATE PREPARE partner_stmt;


SET @partner_migration_sql = IF(
    EXISTS (
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'partners'
          AND COLUMN_NAME = 'account_holder'
    ),
    'SELECT ''partners.account_holder already exists'' AS info',
    'ALTER TABLE partners ADD COLUMN account_holder VARCHAR(100) NULL'
);
PREPARE partner_stmt FROM @partner_migration_sql;
EXECUTE partner_stmt;
DEALLOCATE PREPARE partner_stmt;


SET @partner_migration_sql = IF(
    EXISTS (
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'partners'
          AND COLUMN_NAME = 'calendar_type_id'
    ),
    'SELECT ''partners.calendar_type_id already exists'' AS info',
    'ALTER TABLE partners ADD COLUMN calendar_type_id TINYINT UNSIGNED NULL'
);
PREPARE partner_stmt FROM @partner_migration_sql;
EXECUTE partner_stmt;
DEALLOCATE PREPARE partner_stmt;

SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'partners'
  AND COLUMN_NAME IN ('bank_name','account_number','account_holder','calendar_type_id')
ORDER BY ORDINAL_POSITION;
