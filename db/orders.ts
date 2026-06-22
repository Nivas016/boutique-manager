import { getDatabase } from './connection';
import { Order, OrderItemInput, OrderWithDetails } from '../types';
import { OrderStatusKey } from '../constants/statuses';
import { getSetting, setSetting } from './settings';
import { replaceOrderItems } from './order_items';

export async function getOrders(options?: {
  search?: string;
  status?: string;
  customerId?: number;
  overdueOnly?: boolean;
  dueTodayOnly?: boolean;
  dueTomorrowOnly?: boolean;
  promisedDate?: string;
}): Promise<OrderWithDetails[]> {
  const db = await getDatabase();
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  let query = `
    SELECT o.*,
           c.name   as customer_name,
           c.phone  as customer_phone,
           e.name   as employee_name,
           emb.name as embroidery_employee_name,
           COALESCE(p.total_paid, 0) as total_paid,
           (o.total_amount - COALESCE(p.total_paid, 0)) as balance
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    LEFT JOIN employees e   ON e.id   = o.employee_id
    LEFT JOIN employees emb ON emb.id = o.embroidery_employee_id
    LEFT JOIN (
      SELECT order_id, SUM(amount) as total_paid
      FROM payments
      GROUP BY order_id
    ) p ON p.order_id = o.id
  `;

  const conditions: string[] = [];
  const params: any[] = [];

  if (options?.search) {
    conditions.push(
      `(o.order_number LIKE ? OR c.name LIKE ? OR c.phone LIKE ? OR o.design_serial_number LIKE ?)`
    );
    const term = `%${options.search.trim()}%`;
    params.push(term, term, term, term);
  }

  if (options?.status && options.status !== 'all') {
    if (options.status === 'active') {
      conditions.push(`o.status NOT IN ('delivered', 'cancelled')`);
    } else if (options.status === 'overdue') {
      conditions.push(`o.promised_date < ? AND o.status NOT IN ('delivered', 'cancelled')`);
      params.push(today);
    } else if (options.status === 'today') {
      conditions.push(`o.promised_date = ? AND o.status NOT IN ('delivered', 'cancelled')`);
      params.push(today);
    } else if (options.status === 'tomorrow') {
      conditions.push(`o.promised_date = ? AND o.status NOT IN ('delivered', 'cancelled')`);
      params.push(tomorrow);
    } else {
      conditions.push(`o.status = ?`);
      params.push(options.status);
    }
  }

  if (options?.customerId) {
    conditions.push('o.customer_id = ?');
    params.push(options.customerId);
  }

  if (options?.overdueOnly) {
    conditions.push(`o.promised_date < ? AND o.status NOT IN ('delivered', 'cancelled')`);
    params.push(today);
  }

  if (options?.dueTodayOnly) {
    conditions.push(`o.promised_date = ? AND o.status NOT IN ('delivered', 'cancelled')`);
    params.push(today);
  }

  if (options?.dueTomorrowOnly) {
    conditions.push(`o.promised_date = ? AND o.status NOT IN ('delivered', 'cancelled')`);
    params.push(tomorrow);
  }

  if (options?.promisedDate) {
    conditions.push(`o.promised_date = ?`);
    params.push(options.promisedDate);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY o.promised_date ASC, o.created_at DESC';

  return db.getAllAsync<OrderWithDetails>(query, ...params);
}

export async function getOrderById(id: number): Promise<OrderWithDetails | null> {
  const db = await getDatabase();
  return db.getFirstAsync<OrderWithDetails>(
    `SELECT o.*,
            c.name   as customer_name,
            c.phone  as customer_phone,
            e.name   as employee_name,
            emb.name as embroidery_employee_name,
            COALESCE(p.total_paid, 0) as total_paid,
            (o.total_amount - COALESCE(p.total_paid, 0)) as balance
     FROM orders o
     JOIN customers c ON c.id = o.customer_id
     LEFT JOIN employees e   ON e.id   = o.employee_id
     LEFT JOIN employees emb ON emb.id = o.embroidery_employee_id
     LEFT JOIN (
       SELECT order_id, SUM(amount) as total_paid
       FROM payments
       GROUP BY order_id
     ) p ON p.order_id = o.id
     WHERE o.id = ?`,
    id
  );
}

export async function generateOrderNumber(): Promise<string> {
  const prefix = (await getSetting('order_number_prefix')) || 'ORD';
  const counter = parseInt((await getSetting('order_number_counter')) || '1', 10);
  const orderNumber = `${prefix}-${String(counter).padStart(4, '0')}`;
  await setSetting('order_number_counter', (counter + 1).toString());
  return orderNumber;
}

export async function createOrder(data: {
  customer_id: number;
  items: OrderItemInput[];
  design_serial_number?: string;
  fabric_details?: string;
  embroidery_details?: string;
  promised_date: string;
  trial_date?: string;
  total_amount: number;
  notes?: string;
  advance_amount?: number;
  advance_mode?: string;
}): Promise<number> {
  const db = await getDatabase();
  const orderNumber = await generateOrderNumber();

  const primaryItem = data.items[0];
  // Store first item's employee on orders table for display in list views
  const result = await db.runAsync(
    `INSERT INTO orders
     (order_number, customer_id, employee_id, employee_share,
      embroidery_employee_id, embroidery_share,
      design_serial_number, fabric_details, embroidery_details,
      garment_type, promised_date, trial_date, total_amount, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    orderNumber,
    data.customer_id,
    primaryItem?.employee_id ?? null,
    primaryItem?.employee_share ?? 0,
    primaryItem?.embroidery_employee_id ?? null,
    primaryItem?.embroidery_share ?? 0,
    data.design_serial_number?.trim() || null,
    data.fabric_details?.trim() || null,
    data.embroidery_details?.trim() || null,
    primaryItem?.garment_type ?? '',
    data.promised_date,
    data.trial_date || null,
    data.total_amount,
    data.notes?.trim() || null
  );

  const orderId = result.lastInsertRowId;

  await replaceOrderItems(orderId, data.items);

  if (data.advance_amount && data.advance_amount > 0) {
    await db.runAsync(
      `INSERT INTO payments (order_id, amount, mode, notes) VALUES (?, ?, ?, 'Advance')`,
      orderId,
      data.advance_amount,
      data.advance_mode || 'Cash'
    );
  }

  return orderId;
}

export async function updateOrderStatus(
  id: number,
  status: OrderStatusKey
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE orders SET
       status = ?,
       stitching_completed_at = CASE
         WHEN stitching_completed_at IS NULL AND status = 'stitching'
         THEN datetime('now','localtime') ELSE stitching_completed_at END,
       embroidery_completed_at = CASE
         WHEN embroidery_completed_at IS NULL AND status = 'embroidery'
         THEN datetime('now','localtime') ELSE embroidery_completed_at END,
       delivered_at = CASE
         WHEN ? = 'delivered' THEN datetime('now','localtime') ELSE delivered_at END
     WHERE id = ?`,
    status, status, id
  );
}

export async function updateOrder(
  id: number,
  data: Partial<Order> & { items?: OrderItemInput[] }
): Promise<void> {
  const db = await getDatabase();

  if (data.items && data.items.length > 0) {
    await replaceOrderItems(id, data.items);
    // Sync denormalized columns from first item
    const primary = data.items[0];
    await db.runAsync(
      `UPDATE orders SET garment_type = ?, employee_id = ?, employee_share = ?,
         embroidery_employee_id = ?, embroidery_share = ? WHERE id = ?`,
      primary.garment_type,
      primary.employee_id ?? null,
      primary.employee_share ?? 0,
      primary.embroidery_employee_id ?? null,
      primary.embroidery_share ?? 0,
      id
    );
  }

  const fields: string[] = [];
  const values: any[] = [];

  const allowed = [
    'design_serial_number', 'fabric_details', 'embroidery_details',
    'status', 'promised_date', 'trial_date',
    'alteration_notes', 'total_amount', 'notes', 'delivered_at',
  ];

  for (const [key, value] of Object.entries(data)) {
    if (allowed.includes(key) && value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(typeof value === 'string' ? value.trim() : value);
    }
  }

  if (fields.length === 0) return;
  values.push(id);

  await db.runAsync(
    `UPDATE orders SET ${fields.join(', ')} WHERE id = ?`,
    ...values
  );
}

export async function getDashboardStats(): Promise<{
  overdue: number;
  dueToday: number;
  dueTomorrow: number;
  active: number;
}> {
  const db = await getDatabase();
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const row = await db.getFirstAsync<{
    overdue: number;
    dueToday: number;
    dueTomorrow: number;
    active: number;
  }>(`
    SELECT
      SUM(CASE WHEN promised_date < ? AND status NOT IN ('delivered','cancelled') THEN 1 ELSE 0 END) as overdue,
      SUM(CASE WHEN promised_date = ? AND status NOT IN ('delivered','cancelled') THEN 1 ELSE 0 END) as dueToday,
      SUM(CASE WHEN promised_date = ? AND status NOT IN ('delivered','cancelled') THEN 1 ELSE 0 END) as dueTomorrow,
      SUM(CASE WHEN status NOT IN ('delivered','cancelled') THEN 1 ELSE 0 END) as active
    FROM orders
  `, today, today, tomorrow);

  return {
    overdue: row?.overdue || 0,
    dueToday: row?.dueToday || 0,
    dueTomorrow: row?.dueTomorrow || 0,
    active: row?.active || 0,
  };
}

export async function getCalendarDates(year: number, month: number): Promise<
  Record<string, { count: number; hasOverdue: boolean }>
> {
  const db = await getDatabase();
  const today = new Date().toISOString().split('T')[0];
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-31`;

  const rows = await db.getAllAsync<{
    promised_date: string;
    cnt: number;
    overdue_cnt: number;
  }>(`
    SELECT promised_date,
           COUNT(*) as cnt,
           SUM(CASE WHEN promised_date < ? AND status NOT IN ('delivered','cancelled') THEN 1 ELSE 0 END) as overdue_cnt
    FROM orders
    WHERE promised_date BETWEEN ? AND ?
    GROUP BY promised_date
  `, today, startDate, endDate);

  const result: Record<string, { count: number; hasOverdue: boolean }> = {};
  for (const row of rows) {
    result[row.promised_date] = {
      count: row.cnt,
      hasOverdue: row.overdue_cnt > 0,
    };
  }
  return result;
}
