const mysql = require("mysql2/promise");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");

const {
  RDS_HOST,
  RDS_USER,
  RDS_PASSWORD,
  RDS_DB,
  GMAIL_USER,
  GMAIL_PASS
} = process.env;

exports.handler = async (event) => {
  const { admin_id, request_id, role } = event;

  if (!admin_id || !request_id || !role) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing required fields" }),
    };
  }

  const validRoles = ["administrator", "manager", "accountant"];
  if (!validRoles.includes(role)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid role" }),
    };
  }

  let connection;

  try {
    connection = await mysql.createConnection({
      host: RDS_HOST,
      user: RDS_USER,
      password: RDS_PASSWORD,
      database: RDS_DB,
    });

    // get the request
    const [rows] = await connection.execute(
      "SELECT * FROM User_Requests WHERE id = ?",
      [request_id]
    );

    if (rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Request not found" }),
      };
    }

    const request = rows[0];

    // Generate username
    // first letter of first name + full last name + MMYY (from dob)
    const dobDate = new Date(request.dob);
    const mm = String(dobDate.getMonth() + 1).padStart(2, "0");
    const yy = String(dobDate.getFullYear()).slice(-2);
    const username =
      request.first_name.charAt(0).toLowerCase() +
      request.last_name.toLowerCase() +
      mm +
      yy;

    // Generate temporary plaintext password
    const tempPassword = "temp_" + Math.random().toString().slice(2, 10); // 8 digits

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    // Insert into Users
    const insertSql = `
      INSERT INTO Users 
        (username, first_name, last_name, email, dob, role, password_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await connection.execute(insertSql, [
      username,
      request.first_name,
      request.last_name,
      request.email,
      request.dob,
      role,
      passwordHash,
    ]);

    // Update User_Requests
    await connection.execute(
      "UPDATE User_Requests SET status = 'approved', resolved_by = ?, resolved_at = NOW() WHERE id = ?",
      [admin_id, request_id]
    );

    // Send email with username + temp password
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS,
      },
    });

    const mailOptions = {
      from: GMAIL_USER,
      to: request.email,
      subject: "Your Account Has Been Approved",
      text: `Hello ${request.first_name},

      Your account has been approved. Here are your login credentials:

      Username: ${username}
      Temporary Password: ${tempPassword}

      Please log in and change your password and add a security question and answer as soon as possible.

      Thanks,
      Admin Team at Fiscal Tracker
      `,
    };

    await transporter.sendMail(mailOptions);

    return {
      statusCode: 201,
      body: JSON.stringify({ message: "User registered and email sent" }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };

  } finally {
    if (connection) await connection.end();
  }
};