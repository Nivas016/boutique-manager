import { getDatabase } from './connection';
import { Payment } from '../types';

export async function getPaymentsByOrder(orderId: number): Promise<Payment[]> {
  const db = await getDatabase();
  return db.getAllAsync<Payment>(
    `SELECT * FROM payments WHERE order_id = ? ORDER BY paid_at ASC`,
    orderId
  );
}

export async function getOrderBalance(orderId: number): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ balance: number }>(
    `SELECT (o.total_amount - COALESCE(SUM(p.amount), 0)) as balance
     FROM orders o
     LEFT JOIN payments p ON p.order_id = o.id
     WHERE o.id = ?
     GROUP BY o.id`,
    orderId
  );
  return row?.balance || 0;
}

export async function createPayment(data: {
  order_id: number;
  amount: number;
  mode: string;
  notes?: string;
}): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO payments (order_id, amount, mode, notes) VALUES (?, ?, ?, ?)`,
    data.order_id,
    data.amount,
    data.mode,
    data.notes?.trim() || null
  );
  return result.lastInsertRowId;
}

export async function deletePayment(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM payments WHERE id = ?`, id);
}
