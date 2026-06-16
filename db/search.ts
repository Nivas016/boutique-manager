import { getDatabase } from './connection';
import { CustomerWithStats, OrderWithDetails } from '../types';

export async function globalSearch(query: string): Promise<{
  customers: CustomerWithStats[];
  orders: OrderWithDetails[];
}> {
  if (!query || query.trim().length < 2) {
    return { customers: [], orders: [] };
  }

  const db = await getDatabase();
  const term = `%${query.trim()}%`;

  const customers = await db.getAllAsync<CustomerWithStats>(
    `SELECT c.*, 0 as active_orders, 0 as total_spent
     FROM customers c
     WHERE c.is_active = 1 AND (c.name LIKE ? OR c.phone LIKE ?)
     ORDER BY
       CASE WHEN c.phone LIKE ? THEN 0 ELSE 1 END,
       c.name COLLATE NOCASE ASC
     LIMIT 10`,
    term, term, query.trim() + '%'
  );

  const orders = await db.getAllAsync<OrderWithDetails>(
    `SELECT o.*, c.name as customer_name, c.phone as customer_phone,
            e.name as employee_name,
            COALESCE(p.total_paid, 0) as total_paid,
            (o.total_amount - COALESCE(p.total_paid, 0)) as balance
     FROM orders o
     JOIN customers c ON c.id = o.customer_id
     LEFT JOIN employees e ON e.id = o.employee_id
     LEFT JOIN (
       SELECT order_id, SUM(amount) as total_paid
       FROM payments GROUP BY order_id
     ) p ON p.order_id = o.id
     WHERE o.order_number LIKE ? OR c.name LIKE ? OR o.design_serial_number LIKE ?
     ORDER BY o.created_at DESC
     LIMIT 10`,
    term, term, term
  );

  return { customers, orders };
}
