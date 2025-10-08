-- Stores all system users (Admins, Managers, Accountants)
CREATE TABLE Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    dob DATE NOT NULL,
    role ENUM('administrator', 'manager', 'accountant') NOT NULL,
    avatar_url VARCHAR(500),
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_suspended BOOLEAN DEFAULT FALSE,
    suspended_from DATETIME,
    suspended_to DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    password_expires_at DATETIME,
    failed_login_attempts INT DEFAULT 0,
    locked_until DATETIME,
    security_question VARCHAR(255) NOT NULL,
    security_answer VARCHAR(255) NOT NULL
) AUTO_INCREMENT = 1001;


-- Tracks previous passwords for each user to prevent reuse
CREATE TABLE Password_History (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    current_password VARCHAR(255) NOT NULL,
    previous_password VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id)
) AUTO_INCREMENT = 4001;


-- Stores new user registration requests pending administrator approval
CREATE TABLE User_Requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    dob DATE NOT NULL,
    status ENUM('pending', 'approved') DEFAULT 'pending',
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_by INT,
    resolved_at DATETIME,
    FOREIGN KEY (resolved_by) REFERENCES Users(id)
) AUTO_INCREMENT = 5001;

-- Stores all accounts (Chart of Accounts)
CREATE TABLE Accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_number VARCHAR(32) NOT NULL UNIQUE,    -- Digits only, leading zeros allowed
    account_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    normal_side ENUM('debit', 'credit') NOT NULL,
    category VARCHAR(100) NOT NULL,                -- e.g. 'Asset'
    subcategory VARCHAR(100),                      -- e.g. 'Current Asset'
    initial_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    debit DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    credit DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    added_by INT NOT NULL,                         -- FK → Users.id
    order INT NOT NULL,                            -- e.g. '1'
    statement ENUM('IS', 'BS', 'RE') NOT NULL,     -- Income Statement, Balance Sheet, etc.
    comment TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (added_by) REFERENCES Users(id)
) AUTO_INCREMENT = 6001;

CREATE TABLE Transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    credit_account_id INT NOT NULL,
    debit_account_id INT NOT NULL,
    entry_date DATETIME,
    reference VARCHAR(100),
    description TEXT,
    debit DECIMAL(15,2) DEFAULT 0.00,
    credit DECIMAL(15,2) DEFAULT 0.00,
    created_by INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_by INT,
    FOREIGN KEY (credit_account_id) REFERENCES Accounts(id),
    FOREIGN KEY (credit_account_id) REFERENCES Accounts(id),
    FOREIGN KEY (created_by) REFERENCES Users(id),
    FOREIGN KEY (approved_by) REFERENCES Users(id)
) AUTO_INCREMENT = 7001;

CREATE TABLE Event_Logs (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INT,
    action ENUM('CREATE ACCOUNT', 'UPDATE ACCOUNT', 'DEACTIVATE ACCOUNT', 'CREATE TRANSACTION', 'UPDATE TRANSACTION', 'APPOROVE TRANSACTION') NOT NULL,
    before_image JSON,
    after_image JSON,
    changed_by INT NOT NULL,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (changed_by) REFERENCES Users(id)
) AUTO_INCREMENT = 8001;