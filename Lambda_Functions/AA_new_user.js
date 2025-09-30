import mysql from "mysql2/promise";
import nodemailer from "nodemailer";

const {
  RDS_HOST,      // Public endpoint of your RDS
  RDS_USER,
  RDS_PASSWORD,
  RDS_DB,
  GMAIL_USER,    // fiscaltracker@gmail.com
  GMAIL_PASS     // Gmail App Password (no spaces)
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
    // Connect to public RDS
    connection = await mysql.createConnection({
      host: RDS_HOST,
      user: RDS_USER,
      password: RDS_PASSWORD,
      database: RDS_DB,
    });

    // Insert new user request
    const sql = `
      INSERT INTO User_Requests (first_name, last_name, email, dob)
      VALUES (?, ?, ?, ?)
    `;
    await connection.execute(sql, [first_name, last_name, email, dob]);

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
