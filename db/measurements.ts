import { getDatabase } from './connection';
import { Measurement } from '../types';

export async function getMeasurements(customerId: number): Promise<Measurement[]> {
  const db = await getDatabase();
  return db.getAllAsync<Measurement>(
    `SELECT * FROM measurements
     WHERE customer_id = ?
     ORDER BY label ASC, recorded_at DESC`,
    customerId
  );
}

export async function getLatestMeasurement(
  customerId: number,
  label: string
): Promise<Measurement | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Measurement>(
    `SELECT * FROM measurements
     WHERE customer_id = ? AND label = ?
     ORDER BY recorded_at DESC
     LIMIT 1`,
    customerId, label
  );
}

export async function getMeasurementById(id: number): Promise<Measurement | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Measurement>(
    `SELECT * FROM measurements WHERE id = ?`, id
  );
}

export async function createMeasurement(data: {
  customer_id: number;
  label: string;
  data: Record<string, number | string>;
  unit: string;
  notes?: string;
}): Promise<number> {
  const db = await getDatabase();

  // Enforce max 3 versions per customer + label
  const existing = await db.getAllAsync<{ id: number }>(
    `SELECT id FROM measurements
     WHERE customer_id = ? AND label = ?
     ORDER BY recorded_at DESC`,
    data.customer_id, data.label
  );

  // Delete oldest if we already have 3
  if (existing.length >= 3) {
    const toDelete = existing.slice(2); // keep first 2, delete rest
    for (const row of toDelete) {
      await db.runAsync(`DELETE FROM measurements WHERE id = ?`, row.id);
    }
  }

  const result = await db.runAsync(
    `INSERT INTO measurements (customer_id, label, data, unit, notes)
     VALUES (?, ?, ?, ?, ?)`,
    data.customer_id,
    data.label,
    JSON.stringify(data.data),
    data.unit,
    data.notes?.trim() || null
  );

  return result.lastInsertRowId;
}

export async function updateMeasurement(
  id: number,
  data: {
    data: Record<string, number | string>;
    unit: string;
    notes?: string;
  }
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE measurements SET data = ?, unit = ?, notes = ?,
     recorded_at = datetime('now','localtime')
     WHERE id = ?`,
    JSON.stringify(data.data),
    data.unit,
    data.notes?.trim() || null,
    id
  );
}

export async function deleteMeasurement(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM measurements WHERE id = ?`, id);
}
