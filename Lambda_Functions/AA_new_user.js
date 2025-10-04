import mysql from "mysql2/promise";
import nodemailer from "nodemailer";

const {
  RDS_HOST,    
  RDS_USER,
  RDS_PASSWORD,
  RDS_DB,
  GMAIL_USER,
  GMAIL_PASS
} = process.env;

export const handler = async (event) => {
  // Parse request body
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

  const { first_name, last_name, email, dob } = body;

  if (!first_name || !last_name || !email || !dob) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing required fields" }),
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

    // Check for duplicate email in Users table (already registered)
    const [existingUsers] = await connection.execute(
      "SELECT id FROM Users WHERE email = ?",
      [email]
    );
    if (existingUsers.length > 0) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: "Email already registered as a user" }),
      };
    }

    // ✅ Insert new user request (no check against User_Requests)
    await connection.execute(
      `INSERT INTO User_Requests (first_name, last_name, email, dob)
       VALUES (?, ?, ?, ?)`,
      [first_name, last_name, email, dob]
    );

    // Send email via Gmail SMTP
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS,
      },
    });

    const mailOptions = {
      from: GMAIL_USER,
      to: email,
      subject: "Your User Request Has Been Received",
      text: `Hello ${first_name},

      Your registration request has been submitted successfully.
      We will review it and get back to you soon!
      
      Thanks,
      Support Team at Fiscal Tracker`,
    };

    await transporter.sendMail(mailOptions);

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "User request submitted successfully and email sent",
      }),
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
