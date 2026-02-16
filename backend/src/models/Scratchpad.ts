import pool from '../db/connection';

export interface Scratchpad {
  id: string;
  user_id: string;
  content: string;
  created_at: Date;
  updated_at: Date;
}

export class ScratchpadModel {
  static async getOrCreate(userId: string): Promise<Scratchpad> {
    const result = await pool.query(
      `INSERT INTO scratchpad (user_id, content)
       VALUES ($1, '')
       ON CONFLICT (user_id) DO NOTHING
       RETURNING *`,
      [userId]
    );

    if (result.rows[0]) {
      return result.rows[0];
    }

    // If no insert happened, fetch existing
    const existing = await pool.query(
      'SELECT * FROM scratchpad WHERE user_id = $1',
      [userId]
    );
    return existing.rows[0];
  }

  static async update(userId: string, content: string): Promise<Scratchpad> {
    const result = await pool.query(
      `UPDATE scratchpad SET content = $1, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2
       RETURNING *`,
      [content, userId]
    );
    return result.rows[0];
  }
}

