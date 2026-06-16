import { getDatabase } from './connection';
import * as FileSystem from 'expo-file-system';
const docDir: string = (FileSystem as any).documentDirectory ?? '';
import * as Sharing from 'expo-sharing';

const TABLES = ['settings', 'customers', 'measurement_templates', 'measurements', 'employees', 'orders', 'payments'];

export async function exportBackup(): Promise<string> {
  const db = await getDatabase();
  const backup: Record<string, any[]> = {};

  for (const table of TABLES) {
    backup[table] = await db.getAllAsync(`SELECT * FROM ${table}`);
  }

  const json = JSON.stringify(backup, null, 2);
  const path = `${docDir}boutique_backup_${Date.now()}.json`;
  await FileSystem.writeAsStringAsync(path, json);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: 'application/json',
      dialogTitle: 'Export Boutique Backup',
    });
  }

  return path;
}

export async function importBackup(fileUri: string): Promise<void> {
  const json = await FileSystem.readAsStringAsync(fileUri);
  const backup = JSON.parse(json);
  const db = await getDatabase();

  // Clear all tables in reverse order (respect foreign keys)
  for (const table of [...TABLES].reverse()) {
    await db.execAsync(`DELETE FROM ${table}`);
  }

  // Insert data
  for (const table of TABLES) {
    const rows = backup[table];
    if (!rows || rows.length === 0) continue;

    for (const row of rows) {
      const columns = Object.keys(row);
      const placeholders = columns.map(() => '?').join(', ');
      const values = columns.map((c) => row[c]);
      await db.runAsync(
        `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
        ...values
      );
    }
  }
}
