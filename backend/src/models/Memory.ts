import pool from '../db/connection';

export interface Memory {
  id: string;
  user_id: string;
  layer: 'personal' | 'team' | 'recent';
  key: string;
  value: string;
  source: string;
  updated_at: Date;
}

export class MemoryModel {
  static async upsert(memory: Omit<Memory, 'id' | 'updated_at'>): Promise<Memory> {
    const result = await pool.query(
      `INSERT INTO memory (user_id, layer, key, value, source)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, layer, key)
       DO UPDATE SET value = EXCLUDED.value, source = EXCLUDED.source, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [memory.user_id, memory.layer, memory.key, memory.value, memory.source]
    );
    return result.rows[0];
  }

  static async findByUser(userId: string): Promise<Memory[]> {
    const result = await pool.query(
      'SELECT * FROM memory WHERE user_id = $1 ORDER BY layer, key',
      [userId]
    );
    return result.rows;
  }

  static async findByUserAndLayer(userId: string, layer: string): Promise<Memory[]> {
    const result = await pool.query(
      'SELECT * FROM memory WHERE user_id = $1 AND layer = $2 ORDER BY key',
      [userId, layer]
    );
    return result.rows;
  }

  static async update(id: string, value: string): Promise<Memory> {
    const result = await pool.query(
      'UPDATE memory SET value = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [value, id]
    );
    return result.rows[0];
  }
}

