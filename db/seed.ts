import { SQLiteDatabase } from 'expo-sqlite';
import { DEFAULT_GARMENTS } from '../constants/garments';

const DEFAULT_SETTINGS: Record<string, string> = {
  shop_name: '',
  shop_phone: '',
  shop_address: '',
  order_number_prefix: 'ORD',
  order_number_counter: '1',
  default_unit: 'in',
  notification_enabled: '1',
  notification_time: '08:00',
};

export async function seedDatabase(db: SQLiteDatabase): Promise<void> {
  // Seed settings (only if not already present)
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.runAsync(
      `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`,
      key, value
    );
  }

  // Seed measurement templates (only if table is empty)
  const count = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM measurement_templates`
  );

  if (count && count.cnt === 0) {
    for (const garment of DEFAULT_GARMENTS) {
      await db.runAsync(
        `INSERT INTO measurement_templates (garment_type, fields) VALUES (?, ?)`,
        garment.type,
        JSON.stringify(garment.fields)
      );
    }
  }
}
