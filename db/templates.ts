import { getDatabase } from './connection';
import { MeasurementTemplate } from '../types';

export async function getTemplates(activeOnly: boolean = true): Promise<MeasurementTemplate[]> {
  const db = await getDatabase();
  const query = activeOnly
    ? `SELECT * FROM measurement_templates WHERE is_active = 1 ORDER BY garment_type ASC`
    : `SELECT * FROM measurement_templates ORDER BY garment_type ASC`;
  return db.getAllAsync<MeasurementTemplate>(query);
}

export async function getTemplateByType(garmentType: string): Promise<MeasurementTemplate | null> {
  const db = await getDatabase();
  return db.getFirstAsync<MeasurementTemplate>(
    `SELECT * FROM measurement_templates WHERE garment_type = ?`, garmentType
  );
}

export async function createTemplate(garmentType: string, fields: string[]): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO measurement_templates (garment_type, fields) VALUES (?, ?)`,
    garmentType.trim(), JSON.stringify(fields)
  );
  return result.lastInsertRowId;
}

export async function updateTemplate(id: number, fields: string[]): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE measurement_templates SET fields = ? WHERE id = ?`,
    JSON.stringify(fields), id
  );
}
