import { getDatabase } from './connection';
import { OrderItem, OrderItemInput } from '../types';

export async function getOrderItems(orderId: number): Promise<OrderItem[]> {
  const db = await getDatabase();
  return db.getAllAsync<OrderItem>(
    `SELECT oi.*,
            e.name   as employee_name,
            emb.name as embroidery_employee_name
     FROM order_items oi
     LEFT JOIN employees e   ON e.id   = oi.employee_id
     LEFT JOIN employees emb ON emb.id = oi.embroidery_employee_id
     WHERE oi.order_id = ?
     ORDER BY oi.sort_order ASC, oi.id ASC`,
    orderId
  );
}

export async function replaceOrderItems(orderId: number, items: OrderItemInput[]): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM order_items WHERE order_id = ?`, orderId);
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    await db.runAsync(
      `INSERT INTO order_items
         (order_id, garment_type, quantity, unit_price, employee_id, employee_share,
          embroidery_employee_id, embroidery_share, notes, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      orderId,
      item.garment_type,
      item.quantity ?? 1,
      item.unit_price ?? 0,
      item.employee_id ?? null,
      item.employee_share ?? 0,
      item.embroidery_employee_id ?? null,
      item.embroidery_share ?? 0,
      item.notes?.trim() || null,
      i
    );
  }
}
