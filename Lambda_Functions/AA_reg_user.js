import mysql from "mysql2/promise";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";

const {
  RDS_HOST,
  RDS_USER,
  RDS_PASSWORD,
  RDS_DB,
  GMAIL_USER,
  GMAIL_PASS
} = process.env;

export const handler = async (event) => {
  // Parse body
  let body = event;
  if (event.body) {
    try {
      body = JSON.parse(event.body);
    } catch (e) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid JSON body" }),
      };
    }
  }

  const { admin_id, request_id, role } = body;

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

    // Get the user request
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

    // Generate username: first letter of first name + last name + MMYY
    const dobDate = new Date(request.dob);
    const mm = String(dobDate.getMonth() + 1).padStart(2, "0");
    const yy = String(dobDate.getFullYear()).slice(-2);
    const username =
      request.first_name.charAt(0).toLowerCase() +
      request.last_name.toLowerCase() +
      mm +
      yy;

    // Generate temporary password
    const tempPassword = "temp_" + Math.random().toString().slice(2, 10); // 8 digits

    // Hash password
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Insert new user
    await connection.execute(
      `INSERT INTO Users (username, first_name, last_name, email, dob, role, password_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [username, request.first_name, request.last_name, request.email, request.dob, role, passwordHash]
    );

    // Update request status
    await connection.execute(
      "UPDATE User_Requests SET status = 'approved', resolved_by = ?, resolved_at = NOW() WHERE id = ?",
      [admin_id, request_id]
    );

    // Send email
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
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
        Link to login page

        Thanks,
        Admin Team at Fiscal Tracker`,
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