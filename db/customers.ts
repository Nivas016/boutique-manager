import { getDatabase } from './connection';
import { Customer, CustomerWithStats } from '../types';

export async function getCustomers(
  search?: string,
  activeOnly: boolean = true
): Promise<CustomerWithStats[]> {
  const db = await getDatabase();
  let query = `
    SELECT c.*,
           COALESCE(o.active_orders, 0) as active_orders,
           COALESCE(p.total_spent, 0)   as total_spent
    FROM customers c
    LEFT JOIN (
      SELECT customer_id, COUNT(*) as active_orders
      FROM orders
      WHERE status NOT IN ('delivered', 'cancelled')
      GROUP BY customer_id
    ) o ON o.customer_id = c.id
    LEFT JOIN (
      SELECT ord.customer_id, SUM(pay.amount) as total_spent
      FROM payments pay
      JOIN orders ord ON ord.id = pay.order_id
      GROUP BY ord.customer_id
    ) p ON p.customer_id = c.id
  `;

  const conditions: string[] = [];
  const params: any[] = [];

  if (activeOnly) {
    conditions.push('c.is_active = 1');
  }

  if (search && search.trim().length > 0) {
    conditions.push('(c.name LIKE ? OR c.phone LIKE ?)');
    const term = `%${search.trim()}%`;
    params.push(term, term);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY c.name COLLATE NOCASE ASC';

  return db.getAllAsync<CustomerWithStats>(query, ...params);
}

export async function getCustomerById(id: number): Promise<Customer | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Customer>(
    `SELECT * FROM customers WHERE id = ?`,
    id
  );
}

export async function createCustomer(data: {
  name: string;
  phone: string;
  address?: string;
  notes?: string;
  occasion?: string;
}): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO customers (name, phone, address, notes, occasion)
     VALUES (?, ?, ?, ?, ?)`,
    data.name.trim(),
    data.phone.trim(),
    data.address?.trim() || null,
    data.notes?.trim() || null,
    data.occasion?.trim() || null
  );
  return result.lastInsertRowId;
}

export async function updateCustomer(
  id: number,
  data: Partial<{
    name: string;
    phone: string;
    address: string;
    notes: string;
    occasion: string;
  }>
): Promise<void> {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(typeof value === 'string' ? value.trim() : value);
    }
  }

  if (fields.length === 0) return;
  values.push(id);

  await db.runAsync(
    `UPDATE customers SET ${fields.join(', ')} WHERE id = ?`,
    ...values
  );
}

export async function softDeleteCustomer(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE customers SET is_active = 0 WHERE id = ?`,
    id
  );
}

export async function isPhoneUnique(phone: string, excludeId?: number): Promise<boolean> {
  const db = await getDatabase();
  const query = excludeId
    ? `SELECT COUNT(*) as cnt FROM customers WHERE phone = ? AND id != ? AND is_active = 1`
    : `SELECT COUNT(*) as cnt FROM customers WHERE phone = ? AND is_active = 1`;
  const params = excludeId ? [phone.trim(), excludeId] : [phone.trim()];
  const row = await db.getFirstAsync<{ cnt: number }>(query, ...params);
  return row ? row.cnt === 0 : true;
}
