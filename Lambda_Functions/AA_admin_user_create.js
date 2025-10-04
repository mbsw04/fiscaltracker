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

  const { admin_id, first_name, last_name, email, dob, role } = body;

  if (!admin_id || !first_name || !last_name || !email || !dob || !role) {
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

    // Validate admin_id BEFORE doing anything else
    const [adminCheck] = await connection.execute(
      "SELECT role FROM Users WHERE id = ?",
      [admin_id]
    );

    if (adminCheck.length === 0) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "Invalid admin_id" }),
      };
    }

    if (adminCheck[0].role !== "administrator") {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "Only administrators can create users" }),
      };
    }

    // Check for duplicate email
    const [existing] = await connection.execute(
      "SELECT id FROM Users WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: "Email already exists" }),
      };
    }

    // Generate username based on current date
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yy = String(now.getFullYear()).slice(-2);
    const username =
      first_name.charAt(0).toLowerCase() +
      last_name.toLowerCase() +
      mm +
      yy;

    // Generate & hash temporary password
    const tempPassword = "temp_" + Math.random().toString().slice(2, 10);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Insert user
    await connection.execute(
      `INSERT INTO Users (username, first_name, last_name, email, dob, role, password_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [username, first_name, last_name, email, dob, role, passwordHash]
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
      to: email,
      subject: "Your Account Has Been Created",
      text: `Hello ${first_name},

Your account has been created by an administrator. Here are your login credentials:

Username: ${username}
Temporary Password: ${tempPassword}

Please log in and change your password as soon as possible.

Thanks,
Admin Team at Fiscal Tracker`,
    };

    await transporter.sendMail(mailOptions);

    return {
      statusCode: 201,
      body: JSON.stringify({ message: "User created and email sent" }),
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
