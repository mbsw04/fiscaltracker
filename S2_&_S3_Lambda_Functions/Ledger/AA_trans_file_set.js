import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import mysql from "mysql2/promise";

const { RDS_HOST, RDS_USER, RDS_PASSWORD, RDS_DB, S3_BUCKET_NAME, AWS_REGION } = process.env;

const s3Client = new S3Client({ region: AWS_REGION || 'us-east-1' });

export const handler = async (event) => {
  let body = event;
  if (event.body) {
    try { body = JSON.parse(event.body); } 
    catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) }; }
  }

  const { transaction_id, file_name, file_content, content_type, uploaded_by } = body;

  // Validate required fields
  if (!transaction_id || !file_name || !file_content || !uploaded_by) {
    return { 
      statusCode: 400, 
      body: JSON.stringify({ 
        error: "transaction_id, file_name, file_content, and uploaded_by are required" 
      }) 
    };
  }

  let conn;
  try {
    conn = await mysql.createConnection({ host: RDS_HOST, user: RDS_USER, password: RDS_PASSWORD, database: RDS_DB });

    // Verify transaction exists
    const [transRows] = await conn.execute(`SELECT id FROM Transactions WHERE id = ?`, [transaction_id]);
    if (!transRows || transRows.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Transaction not found' }) };
    }

    // Use transaction ID as filename with original extension
    const fileExtension = file_name.includes('.') ? file_name.split('.').pop() : '';
    const s3Key = `transactions/${transaction_id}${fileExtension ? '.' + fileExtension : ''}`;

    // Decode base64 file content if provided as base64
    let fileBuffer;
    try {
      fileBuffer = Buffer.from(file_content, 'base64');
    } catch (decodeErr) {
      // If not base64, treat as raw content
      fileBuffer = Buffer.from(file_content, 'utf8');
    }

    // Upload to S3 with public-read ACL for public bucket
    const uploadParams = {
      Bucket: S3_BUCKET_NAME,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: content_type || 'application/octet-stream',
      ACL: 'public-read',
      Metadata: {
        'transaction-id': String(transaction_id),
        'uploaded-by': String(uploaded_by),
        'original-filename': file_name
      }
    };

    const uploadResult = await s3Client.send(new PutObjectCommand(uploadParams));

    // Generate public URL for the uploaded file
    const publicUrl = `https://${S3_BUCKET_NAME}.s3.${AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;

    // Log the file upload event
    await conn.execute(
      `INSERT INTO Event_Logs (table_name, record_id, action, after_image, changed_by)
       VALUES (?, ?, ?, ?, ?)`,
      [
        'Transactions',
        transaction_id,
        'UPLOAD FILE',
        JSON.stringify({
          s3_key: s3Key,
          file_name: file_name,
          content_type: content_type,
          file_size: fileBuffer.length,
          etag: uploadResult.ETag,
          public_url: publicUrl
        }),
        uploaded_by
      ]
    );

    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        message: "File uploaded successfully",
        s3_key: s3Key,
        public_url: publicUrl,
        file_name: file_name,
        file_size: fileBuffer.length,
        transaction_id: transaction_id
      }) 
    };
  } catch (err) {
    console.error('Error in AA_trans_file_set:', err);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ 
        error: err.message, 
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
      }) 
    };
  } finally {
    if (conn) try { await conn.end(); } catch (e) { console.warn('Error closing connection', e); }
  }
};