import { Injectable, Inject } from '@nestjs/common';
import type { Pool, PoolConnection } from 'mysql2/promise';

@Injectable()
export class DatabaseService {
  constructor(@Inject('DATABASE_CONNECTION') private db: Pool) {}

  async withTransaction<T>(
    fn: (conn: PoolConnection) => Promise<T>,
  ): Promise<T> {
    const conn = await this.db.getConnection();
    try {
      await conn.beginTransaction();
      const result = await fn(conn);
      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async withTransactionIsolation<T>(
    fn: (conn: PoolConnection) => Promise<T>,
    isolationLevel:
      | 'READ UNCOMMITTED'
      | 'READ COMMITTED'
      | 'REPEATABLE READ'
      | 'SERIALIZABLE' = 'REPEATABLE READ',
  ): Promise<T> {
    const conn = await this.db.getConnection();
    try {
      await conn.execute(
        `SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`,
      );
      await conn.beginTransaction();
      const result = await fn(conn);
      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}
