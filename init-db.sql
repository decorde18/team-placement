CREATE DATABASE IF NOT EXISTS my_database;
USE my_database;

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    name VARCHAR(191),
    email VARCHAR(191) UNIQUE,
    password_hash VARCHAR(191),
    reset_token VARCHAR(191),
    reset_token_expiry DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert a default admin user (password: 'password') for testing purposes if bypass is disabled
-- password_hash was generated via bcrypt for 'password'
INSERT IGNORE INTO users (id, name, email, password_hash)
VALUES ('1', 'Admin', 'admin@example.com', '$2a$10$wEwEZF.tU./M4y2lY1x21eXh.5c8JXY77qgOMn/VdWe2QIt4A5SgK');
