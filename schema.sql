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


-- Stores new user registration requests
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
    -- removed `order` column; account_number will determine ordering
    statement ENUM('IS', 'BS', 'RE') NOT NULL,     -- Income Statement, Balance Sheet, etc.
    comment TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (added_by) REFERENCES Users(id)
) AUTO_INCREMENT = 6001;


CREATE TABLE Transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    credit_account_id INT NOT NULL,
    credit DECIMAL(15,2) DEFAULT 0.00,
    debit_account_id INT NOT NULL,
    debit DECIMAL(15,2) DEFAULT 0.00,
    description TEXT,
    created_by INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    approved_by INT,
    approved_date DATETIME,
    FOREIGN KEY (credit_account_id) REFERENCES Accounts(id),
    FOREIGN KEY (debit_account_id) REFERENCES Accounts(id),
    FOREIGN KEY (created_by) REFERENCES Users(id),
    FOREIGN KEY (approved_by) REFERENCES Users(id)
) AUTO_INCREMENT = 7001;

CREATE TABLE Event_Logs (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INT,
    action VARCHAR(100) NOT NULL,
    before_image JSON,
    after_image JSON NOT NULL,
    changed_by INT NOT NULL,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (changed_by) REFERENCES Users(id)
) AUTO_INCREMENT = 8001;

/*
CREATE TABLE Ledger (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_id INT NOT NULL,
    credit_transaction_ids JSON,
    debit_transaction_ids JSON,
    debit DECIMAL(15,2) DEFAULT 0.00,
    credit DECIMAL(15,2) DEFAULT 0.00,
    balance DECIMAL(15,2) NOT NULL,
    FOREIGN KEY (account_id) REFERENCES Accounts(id),
    FOREIGN KEY (transaction_id) REFERENCES Transactions(id)
) AUTO_INCREMENT = 9001;
*/