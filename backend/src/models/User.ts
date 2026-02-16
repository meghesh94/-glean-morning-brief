import pool from '../db/connection';

export interface User {
  id: string;
  email: string;
  name: string;
  password_hash?: string;
  created_at: Date;
  updated_at: Date;
}

export class UserModel {
  static async create(email: string, name: string, passwordHash?: string): Promise<User> {
    const result = await pool.query(
      `INSERT INTO users (email, name, password_hash) 
       VALUES ($1, $2, $3) 
       RETURNING id, email, name, created_at, updated_at`,
      [email, name, passwordHash]
    );
    return result.rows[0];
  }

  static async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  static async findById(id: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT id, email, name, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  static async update(id: string, updates: Partial<User>): Promise<User> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.name) {
      fields.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }
    if (updates.email) {
      fields.push(`email = $${paramCount++}`);
      values.push(updates.email);
    }
    
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} 
       WHERE id = $${paramCount} 
       RETURNING id, email, name, created_at, updated_at`,
      values
    );
    return result.rows[0];
  }
}

