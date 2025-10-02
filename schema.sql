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