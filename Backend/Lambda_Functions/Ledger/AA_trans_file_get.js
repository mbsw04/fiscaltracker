import { S3Client, HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import mysql from "mysql2/promise";

const { RDS_HOST, RDS_USER, RDS_PASSWORD, RDS_DB, S3_BUCKET_NAME } = process.env;

const s3Client = new S3Client({ region: 'us-east-1' });

export const handler = async (event) => {
  let body = event;
  if (event.body) {
    try { body = JSON.parse(event.body); } 
    catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) }; }
  }

  const { transaction_id, s3_key, requested_by, list_files_only } = body;

  // Validate required fields
  if (!transaction_id || !requested_by) {
    return { 
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: "transaction_id and requested_by are required" 
      }) 
    };
  }

  let conn;
  try {
    conn = await mysql.createConnection({ host: RDS_HOST, user: RDS_USER, password: RDS_PASSWORD, database: RDS_DB });

    // Verify transaction exists
    const [transRows] = await conn.execute(`SELECT id FROM Transactions WHERE id = ?`, [transaction_id]);
    if (!transRows || transRows.length === 0) {
      return { 
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Transaction not found' }) 
      };
    }

    if (list_files_only) {
      // Check for zip file for this transaction
      const zipKey = `transactions/${transaction_id}.zip`;
      
      try {
        // Check if zip file exists
        const headResult = await s3Client.send(new HeadObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: zipKey
        }));
        
        // Return zip file info
        const zipFile = {
          s3_key: zipKey,
          file_name: `${transaction_id}.zip`,
          size: headResult.ContentLength,
          last_modified: headResult.LastModified,
          content_type: headResult.ContentType,
          file_count: headResult.Metadata ? parseInt(headResult.Metadata['file-count'] || '0') : 0,
          public_url: `https://${S3_BUCKET_NAME}.s3.us-east-1.amazonaws.com/${zipKey}`
        };

        // Log the file list access
        await conn.execute(
          `INSERT INTO Event_Logs (table_name, record_id, action, after_image, changed_by)
           VALUES (?, ?, ?, ?, ?)`,
          [
            'Transactions',
            transaction_id,
            'LIST FILES',
            JSON.stringify({ 
              has_zip: true, 
              file_count: zipFile.file_count,
              zip_size: zipFile.size 
            }),
            requested_by
          ]
        );

        return { 
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ 
            transaction_id: transaction_id,
            has_files: true,
            zip_file: zipFile
          }) 
        };
      } catch (s3Error) {
        if (s3Error.name === 'NoSuchKey' || s3Error.name === 'NotFound') {
          // No zip file exists for this transaction
          await conn.execute(
            `INSERT INTO Event_Logs (table_name, record_id, action, after_image, changed_by)
             VALUES (?, ?, ?, ?, ?)`,
            [
              'Transactions',
              transaction_id,
              'LIST FILES',
              JSON.stringify({ has_zip: false, file_count: 0 }),
              requested_by
            ]
          );

          return { 
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
              transaction_id: transaction_id,
              has_files: false,
              zip_file: null
            }) 
          };
        }
        throw s3Error;
      }
    } else {
      // Download the zip file content for this transaction
      const zipKey = `transactions/${transaction_id}.zip`;
      
      try {
        // Get the zip file from S3
        const getObjectResult = await s3Client.send(new GetObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: zipKey
        }));
        
        // Convert stream to buffer then to base64
        const chunks = [];
        for await (const chunk of getObjectResult.Body) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        const base64Content = buffer.toString('base64');
        
        // Get metadata from the object
        const metadata = getObjectResult.Metadata || {};

        // Log the file access
        await conn.execute(
          `INSERT INTO Event_Logs (table_name, record_id, action, after_image, changed_by)
           VALUES (?, ?, ?, ?, ?)`,
          [
            'Transactions',
            transaction_id,
            'DOWNLOAD ZIP',
            JSON.stringify({ 
              s3_key: zipKey, 
              access_type: 'content_download',
              file_size: buffer.length 
            }),
            requested_by
          ]
        );

        return { 
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ 
            zip_content: base64Content,
            metadata: {
              transaction_id: transaction_id,
              file_count: metadata['file-count'] || '0',
              uploader: metadata['uploader'] || 'unknown',
              upload_date: getObjectResult.LastModified
            },
            s3_key: zipKey,
            file_name: `${transaction_id}.zip`
          }) 
        };
      } catch (s3Error) {
        if (s3Error.name === 'NoSuchKey' || s3Error.name === 'NotFound') {
          return { 
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
              message: 'No files found for this transaction.'
            }) 
          };
        }
        throw s3Error;
      }
    }
  } catch (err) {
    console.error('Error in AA_trans_file_get:', err);
    return { 
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: err.message, 
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
      }) 
    };
  } finally {
    if (conn) try { await conn.end(); } catch (e) { console.warn('Error closing connection', e); }
  }
};