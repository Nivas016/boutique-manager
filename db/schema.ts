import { SQLiteDatabase } from 'expo-sqlite';

const SCHEMA_VERSION = 7;

const CREATE_TABLES = `
  CREATE TABLE IF NOT EXISTS settings (
    key    TEXT PRIMARY KEY,
    value  TEXT
  );

  CREATE TABLE IF NOT EXISTS customers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    phone       TEXT    NOT NULL,
    address     TEXT,
    notes       TEXT,
    occasion    TEXT,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
  CREATE INDEX IF NOT EXISTS idx_customers_name  ON customers(name COLLATE NOCASE);

  CREATE TABLE IF NOT EXISTS measurement_templates (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    garment_type TEXT    NOT NULL UNIQUE,
    fields       TEXT    NOT NULL,
    is_active    INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS measurements (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    label       TEXT    NOT NULL,
    data        TEXT    NOT NULL,
    unit        TEXT    NOT NULL DEFAULT 'in',
    notes       TEXT,
    recorded_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_measurements_customer ON measurements(customer_id, label);

  CREATE TABLE IF NOT EXISTS employees (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT    NOT NULL,
    phone          TEXT,
    specialization TEXT,
    is_active      INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS orders (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number          TEXT    NOT NULL UNIQUE,
    customer_id           INTEGER NOT NULL,
    employee_id           INTEGER,
    design_serial_number  TEXT,
    fabric_details        TEXT,
    embroidery_details    TEXT,
    garment_type          TEXT    NOT NULL,
    status                TEXT    NOT NULL DEFAULT 'received',
    order_date            TEXT    NOT NULL DEFAULT (date('now','localtime')),
    promised_date         TEXT    NOT NULL,
    trial_date            TEXT,
    alteration_notes      TEXT,
    total_amount          REAL    NOT NULL DEFAULT 0,
    notes                 TEXT,
    created_at            TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at            TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id)
  );

  CREATE INDEX IF NOT EXISTS idx_orders_customer      ON orders(customer_id);
  CREATE INDEX IF NOT EXISTS idx_orders_status         ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_orders_promised_date  ON orders(promised_date);
  CREATE INDEX IF NOT EXISTS idx_orders_order_number   ON orders(order_number);

  CREATE TABLE IF NOT EXISTS payments (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    amount   REAL    NOT NULL,
    mode     TEXT    NOT NULL DEFAULT 'Cash',
    paid_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    notes    TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
`;

// Trigger: auto-update updated_at on customer changes
const CREATE_TRIGGERS = `
  CREATE TRIGGER IF NOT EXISTS trg_customers_updated_at
  AFTER UPDATE ON customers
  BEGIN
    UPDATE customers SET updated_at = datetime('now','localtime') WHERE id = NEW.id;
  END;

  CREATE TRIGGER IF NOT EXISTS trg_orders_updated_at
  AFTER UPDATE ON orders
  BEGIN
    UPDATE orders SET updated_at = datetime('now','localtime') WHERE id = NEW.id;
  END;
`;

export async function createSchema(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(CREATE_TABLES);
  await db.execAsync(CREATE_TRIGGERS);

  // Track schema version
  await db.runAsync(
    `INSERT OR IGNORE INTO settings (key, value) VALUES ('schema_version', '1')`
  );
}

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = 'schema_version'`
  );
  const version = row ? parseInt(row.value, 10) : 0;

  if (version < 2) {
    try { await db.execAsync(`ALTER TABLE employees ADD COLUMN per_piece_rate REAL DEFAULT 0`); } catch {}
    try { await db.execAsync(`ALTER TABLE orders ADD COLUMN employee_share REAL DEFAULT 0`); } catch {}
    await db.runAsync(`UPDATE settings SET value = '2' WHERE key = 'schema_version'`);
  }

  if (version < 3) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS employee_rates (
        employee_id  INTEGER NOT NULL,
        garment_type TEXT    NOT NULL,
        rate         REAL    NOT NULL DEFAULT 0,
        PRIMARY KEY (employee_id, garment_type),
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
      )
    `);
    await db.runAsync(`UPDATE settings SET value = '3' WHERE key = 'schema_version'`);
  }

  if (version < 4) {
    try { await db.execAsync(`ALTER TABLE orders ADD COLUMN delivered_at TEXT`); } catch {}
    await db.runAsync(`UPDATE settings SET value = '4' WHERE key = 'schema_version'`);
  }

  if (version < 5) {
    try { await db.execAsync(`ALTER TABLE orders ADD COLUMN embroidery_employee_id INTEGER REFERENCES employees(id)`); } catch {}
    try { await db.execAsync(`ALTER TABLE orders ADD COLUMN embroidery_share REAL DEFAULT 0`); } catch {}
    await db.runAsync(`UPDATE settings SET value = '5' WHERE key = 'schema_version'`);
  }

  if (version < 6) {
    try { await db.execAsync(`ALTER TABLE orders ADD COLUMN stitching_completed_at TEXT`); } catch {}
    try { await db.execAsync(`ALTER TABLE orders ADD COLUMN embroidery_completed_at TEXT`); } catch {}
    await db.runAsync(`UPDATE settings SET value = '6' WHERE key = 'schema_version'`);
  }

  if (version < 7) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS order_items (
        id                      INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id                INTEGER NOT NULL,
        garment_type            TEXT    NOT NULL,
        quantity                INTEGER NOT NULL DEFAULT 1,
        unit_price              REAL    NOT NULL DEFAULT 0,
        employee_id             INTEGER,
        employee_share          REAL    NOT NULL DEFAULT 0,
        embroidery_employee_id  INTEGER,
        embroidery_share        REAL    NOT NULL DEFAULT 0,
        notes                   TEXT,
        sort_order              INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      )
    `);
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)
    `);
    // Migrate existing single-garment orders into order_items
    await db.execAsync(`
      INSERT INTO order_items (order_id, garment_type, quantity, unit_price, employee_id, employee_share, embroidery_employee_id, embroidery_share, sort_order)
      SELECT id, garment_type, 1, 0, employee_id, COALESCE(employee_share, 0), embroidery_employee_id, COALESCE(embroidery_share, 0), 0
      FROM orders
    `);
    await db.runAsync(`UPDATE settings SET value = '7' WHERE key = 'schema_version'`);
  }
}

export async function getSchemaVersion(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = 'schema_version'`
  );
  return row ? parseInt(row.value, 10) : 0;
}
