import { getDatabase } from './connection';
import { Employee, EmployeeRate, EmployeeWithWorkload } from '../types';

export async function getEmployees(activeOnly: boolean = true): Promise<EmployeeWithWorkload[]> {
  const db = await getDatabase();
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  let query = `
    SELECT e.*,
           COALESCE(active.active_orders, 0) as active_orders,
           COALESCE(earn.monthly_earnings, 0) as monthly_earnings
    FROM employees e
    LEFT JOIN (
      SELECT emp_id, COUNT(DISTINCT order_id) as active_orders
      FROM (
        SELECT oi.employee_id as emp_id, oi.order_id
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status NOT IN ('delivered','cancelled') AND oi.employee_id IS NOT NULL
        UNION ALL
        SELECT oi.embroidery_employee_id, oi.order_id
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status NOT IN ('delivered','cancelled') AND oi.embroidery_employee_id IS NOT NULL
      ) AS combined_active
      GROUP BY emp_id
    ) active ON active.emp_id = e.id
    LEFT JOIN (
      SELECT emp_id, SUM(share) as monthly_earnings
      FROM (
        SELECT oi.employee_id as emp_id, oi.employee_share as share, o.stitching_completed_at as completion_date
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status != 'cancelled' AND oi.employee_id IS NOT NULL AND oi.employee_share > 0 AND o.stitching_completed_at IS NOT NULL
        UNION ALL
        SELECT oi.embroidery_employee_id, oi.embroidery_share, o.embroidery_completed_at
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status != 'cancelled' AND oi.embroidery_employee_id IS NOT NULL AND oi.embroidery_share > 0 AND o.embroidery_completed_at IS NOT NULL
      ) AS combined_earn
      WHERE strftime('%Y-%m', completion_date) = ?
      GROUP BY emp_id
    ) earn ON earn.emp_id = e.id
  `;
  if (activeOnly) query += ' WHERE e.is_active = 1';
  query += ' ORDER BY e.name COLLATE NOCASE ASC';
  return db.getAllAsync<EmployeeWithWorkload>(query, yearMonth);
}

export async function getEmployeeById(id: number): Promise<EmployeeWithWorkload | null> {
  const db = await getDatabase();
  return db.getFirstAsync<EmployeeWithWorkload>(
    `SELECT e.*,
            COALESCE(active.active_orders, 0) as active_orders,
            0 as monthly_earnings
     FROM employees e
     LEFT JOIN (
       SELECT emp_id, COUNT(DISTINCT order_id) as active_orders
       FROM (
         SELECT oi.employee_id as emp_id, oi.order_id
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE o.status NOT IN ('delivered','cancelled') AND oi.employee_id IS NOT NULL
         UNION ALL
         SELECT oi.embroidery_employee_id, oi.order_id
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE o.status NOT IN ('delivered','cancelled') AND oi.embroidery_employee_id IS NOT NULL
       ) AS combined_active
       GROUP BY emp_id
     ) active ON active.emp_id = e.id
     WHERE e.id = ?`,
    id
  );
}

export interface MonthlyOrderEntry {
  id: number;
  order_number: string;
  customer_name: string;
  garment_type: string;
  order_date: string;
  completed_at: string;
  status: string;
  share: number;
  work_type: string;
}

export async function getEmployeeMonthlyOrders(
  employeeId: number, year: number, month: number
): Promise<{ orders: MonthlyOrderEntry[]; total_earnings: number }> {
  const db = await getDatabase();
  const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
  const orders = await db.getAllAsync<MonthlyOrderEntry>(
    `SELECT o.id, o.order_number, o.garment_type, o.order_date, o.status,
            SUM(oi.employee_share) as share,
            'Stitching' as work_type,
            c.name as customer_name,
            o.stitching_completed_at as completed_at
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN customers c ON c.id = o.customer_id
     WHERE oi.employee_id = ?
       AND o.status != 'cancelled'
       AND oi.employee_share > 0
       AND o.stitching_completed_at IS NOT NULL
       AND strftime('%Y-%m', o.stitching_completed_at) = ?
     GROUP BY o.id

     UNION ALL

     SELECT o.id, o.order_number, o.garment_type, o.order_date, o.status,
            SUM(oi.embroidery_share) as share,
            'Embroidery' as work_type,
            c.name as customer_name,
            o.embroidery_completed_at as completed_at
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN customers c ON c.id = o.customer_id
     WHERE oi.embroidery_employee_id = ?
       AND o.status != 'cancelled'
       AND oi.embroidery_share > 0
       AND o.embroidery_completed_at IS NOT NULL
       AND strftime('%Y-%m', o.embroidery_completed_at) = ?
     GROUP BY o.id

     ORDER BY completed_at DESC`,
    employeeId, yearMonth, employeeId, yearMonth
  );
  const total_earnings = orders.reduce((sum, o) => sum + (o.share || 0), 0);
  return { orders, total_earnings };
}

export async function getEmployeeRates(employeeId: number): Promise<EmployeeRate[]> {
  const db = await getDatabase();
  return db.getAllAsync<EmployeeRate>(
    `SELECT * FROM employee_rates WHERE employee_id = ? ORDER BY garment_type ASC`,
    employeeId
  );
}

export async function setEmployeeRate(employeeId: number, garmentType: string, rate: number): Promise<void> {
  const db = await getDatabase();
  if (rate <= 0) {
    await db.runAsync(
      `DELETE FROM employee_rates WHERE employee_id = ? AND garment_type = ?`,
      employeeId, garmentType
    );
  } else {
    await db.runAsync(
      `INSERT OR REPLACE INTO employee_rates (employee_id, garment_type, rate) VALUES (?, ?, ?)`,
      employeeId, garmentType, rate
    );
  }
}

export async function getEmployeeGarmentRate(employeeId: number, garmentType: string): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ rate: number }>(
    `SELECT rate FROM employee_rates WHERE employee_id = ? AND garment_type = ?`,
    employeeId, garmentType
  );
  return row?.rate ?? 0;
}

export async function createEmployee(data: {
  name: string;
  phone?: string;
  specialization?: string;
}): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO employees (name, phone, specialization) VALUES (?, ?, ?)`,
    data.name.trim(), data.phone?.trim() || null, data.specialization || null
  );
  return result.lastInsertRowId;
}

export async function updateEmployee(id: number, data: Partial<Employee>): Promise<void> {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: any[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (['name', 'phone', 'specialization', 'is_active', 'per_piece_rate'].includes(key) && value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(typeof value === 'string' ? value.trim() : value);
    }
  }
  if (fields.length === 0) return;
  values.push(id);
  await db.runAsync(`UPDATE employees SET ${fields.join(', ')} WHERE id = ?`, ...values);
}
