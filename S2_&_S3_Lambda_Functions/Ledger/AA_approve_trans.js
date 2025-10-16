import mysql from "mysql2/promise";
const { RDS_HOST, RDS_USER, RDS_PASSWORD, RDS_DB } = process.env;

export const handler = async (event) => {
  let body = event;
  if (event.body) {
    try { body = JSON.parse(event.body); } 
    catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) }; }
  }

  const { manager_id, trans_id } = body;

  

  let conn;
  try {
    conn = await mysql.createConnection({ host: RDS_HOST, user: RDS_USER, password: RDS_PASSWORD, database: RDS_DB });

    const [userRows] = await conn.execute(`SELECT id, role FROM Users WHERE id = ?`, [manager_id]);
    const user = userRows && userRows[0] ? userRows[0] : null;
    if (!user) {
      return { statusCode: 404, body: JSON.stringify({ error: 'User not found' }) };
    } else if (String(user.role).toLowerCase() !== 'manager') {
      return { statusCode: 403, body: JSON.stringify({ error: 'User not authorized to approve transactions' }) };
    }

    // capture before image (check existence and status before starting transactional work)
    const [beforeRows] = await conn.execute(`SELECT * FROM Transactions WHERE id = ?`, [trans_id]);
    const beforeRow = beforeRows && beforeRows[0] ? beforeRows[0] : null;
    if (!beforeRow) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Transaction not found' }) };
    }
    if (String(beforeRow.status).toLowerCase() !== 'pending') {
      return { statusCode: 409, body: JSON.stringify({ error: `Transaction already ${beforeRow.status}` }) };
    }

    // Begin transaction to ensure atomicity across updates
    await conn.beginTransaction();

    // perform approval
    await conn.execute(`UPDATE Transactions SET approved_by=?, approved_date=NOW(), status='approved' WHERE id=?`, [manager_id, trans_id]);

    // fetch updated transaction
    const [updatedRows] = await conn.execute(`SELECT * FROM Transactions WHERE id = ?`, [trans_id]);
    const updatedRow = updatedRows && updatedRows[0] ? updatedRows[0] : null;

    // Update account balances and credit/debit totals for debit and credit accounts
    const creditAccountId = updatedRow ? updatedRow.credit_account_id : null;
    const debitAccountId = updatedRow ? updatedRow.debit_account_id : null;
    const creditAmt = updatedRow ? Number((parseFloat(updatedRow.credit) || 0).toFixed(2)) : 0;
    const debitAmt = updatedRow ? Number((parseFloat(updatedRow.debit) || 0).toFixed(2)) : 0;

    const computeNewBalance = (acct, amount, isDebitOp) => {
      const normal = acct && acct.normal_side ? String(acct.normal_side).toLowerCase() : 'debit';
      let bal = acct && acct.balance != null ? parseFloat(acct.balance) : 0;
      if (isDebitOp) {
        if (normal === 'debit') bal += amount; else bal -= amount;
      } else {
        if (normal === 'credit') bal += amount; else bal -= amount;
      }
      return bal;
    };

    // process credited account: increment credit column and adjust balance
    if (creditAccountId) {
      const [cRows] = await conn.execute(`SELECT * FROM Accounts WHERE id = ? FOR UPDATE`, [creditAccountId]);
      const beforeAcct = cRows && cRows[0] ? cRows[0] : null;
      if (beforeAcct) {
        const newCredit = (parseFloat(beforeAcct.credit) || 0) + creditAmt;
        const newCreditRounded = Number(newCredit.toFixed(2));
        const newBal = computeNewBalance(beforeAcct, creditAmt, false);
        const newBalRounded = Number(newBal.toFixed(2));
        await conn.execute(`UPDATE Accounts SET credit = ?, balance = ? WHERE id = ?`, [newCreditRounded, newBalRounded, creditAccountId]);
        const [afterC] = await conn.execute(`SELECT * FROM Accounts WHERE id = ?`, [creditAccountId]);
        const afterAcct = afterC && afterC[0] ? afterC[0] : null;
        await conn.execute(
          `INSERT INTO Event_Logs (table_name, record_id, action, before_image, after_image, changed_by)
           VALUES (?, ?, ?, ?, ?, ?)`,
          ['Accounts', creditAccountId, 'UPDATE ACCOUNT BALANCE (CREDIT)', JSON.stringify(beforeAcct || {}), JSON.stringify(afterAcct || {}), manager_id]
        );
      }
    }

    // process debited account: increment debit column and adjust balance
    if (debitAccountId) {
      const [dRows] = await conn.execute(`SELECT * FROM Accounts WHERE id = ? FOR UPDATE`, [debitAccountId]);
      const beforeAcct = dRows && dRows[0] ? dRows[0] : null;
      if (beforeAcct) {
        const newDebit = (parseFloat(beforeAcct.debit) || 0) + debitAmt;
        const newDebitRounded = Number(newDebit.toFixed(2));
        const newBal = computeNewBalance(beforeAcct, debitAmt, true);
        const newBalRounded = Number(newBal.toFixed(2));
        await conn.execute(`UPDATE Accounts SET debit = ?, balance = ? WHERE id = ?`, [newDebitRounded, newBalRounded, debitAccountId]);
        const [afterD] = await conn.execute(`SELECT * FROM Accounts WHERE id = ?`, [debitAccountId]);
        const afterAcct = afterD && afterD[0] ? afterD[0] : null;
        await conn.execute(
          `INSERT INTO Event_Logs (table_name, record_id, action, before_image, after_image, changed_by)
           VALUES (?, ?, ?, ?, ?, ?)`,
          ['Accounts', debitAccountId, 'UPDATE ACCOUNT BALANCE (DEBIT)', JSON.stringify(beforeAcct || {}), JSON.stringify(afterAcct || {}), manager_id]
        );
      }
    }

    // finally, log the transaction approval (before and after)
    await conn.execute(
      `INSERT INTO Event_Logs (table_name, record_id, action, before_image, after_image, changed_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['Transactions', trans_id, 'APPROVE TRANSACTION', JSON.stringify(beforeRow || {}), JSON.stringify(updatedRow || {}), manager_id]
    );

    // commit all changes
    await conn.commit();

    return { statusCode: 200, body: JSON.stringify({ message: "Transaction approved" }) };
  } catch (err) {
    console.error('Error in AA_approve_trans:', err);
    if (conn) {
      try { await conn.rollback(); } catch (rbErr) { console.warn('Rollback error', rbErr); }
    }
    return { statusCode: 500, body: JSON.stringify({ error: err.message, stack: err.stack }) };
  } finally {
    if (conn) try { await conn.end(); } catch (e) { console.warn('Error closing connection', e); }
  }
};