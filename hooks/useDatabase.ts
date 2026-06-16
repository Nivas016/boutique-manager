import { useEffect, useState } from 'react';
import { getDatabase } from '../db/connection';
import { createSchema, runMigrations } from '../db/schema';
import { seedDatabase } from '../db/seed';

export function useDatabase() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const db = await getDatabase();
        await createSchema(db);
        await runMigrations(db);
        await seedDatabase(db);
        if (mounted) setIsReady(true);
      } catch (err) {
        console.error('Database init failed:', err);
        if (mounted) setError(String(err));
      }
    }

    init();
    return () => { mounted = false; };
  }, []);

  return { isReady, error };
}
