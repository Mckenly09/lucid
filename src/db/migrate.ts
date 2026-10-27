import type { SQLiteDatabase } from 'expo-sqlite';

/** Applies the migrations the database hasn't seen, each in its own transaction with its version bump. */
export function migrate(db: Pick<SQLiteDatabase, 'execSync' | 'getFirstSync' | 'withTransactionSync'>, migrations: string[]) {
  const current = db.getFirstSync<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0;
  migrations.slice(current).forEach((sql, i) => {
    db.withTransactionSync(() => {
      db.execSync(sql);
      db.execSync(`PRAGMA user_version = ${current + i + 1}`);
    });
  });
}
