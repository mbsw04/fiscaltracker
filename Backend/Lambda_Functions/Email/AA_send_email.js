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
  // Parse body
  let body = event;
  if (event.body) {
    try {
      body = JSON.parse(event.body);
    } catch (err) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid JSON body" }),
      };
    }
  }

  const { admin_id, admin_email, first_name, last_name, user_email, message } = body;

  // Validate required fields
  if (!admin_id || !user_email || !message) {
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

    // Validate admin_id
    const [adminCheck] = await connection.execute(
      "SELECT role, email FROM Users WHERE id = ?",
      [admin_id]
    );

    if (adminCheck.length === 0) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "Invalid admin_id" }),
      };
    }

    // Use admin_email provided, otherwise fallback to DB or default
    const senderEmail = admin_email || adminCheck[0].email || 'admin@example.com';
    

    // Send email
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
      to: user_email,
      subject: `Message from ${senderEmail}`,
      text: message,
    };

    await transporter.sendMail(mailOptions);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Email sent successfully" }),
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
