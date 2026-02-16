import pool from '../db/connection';

export interface BriefItem {
  id: string;
  user_id: string;
  type: 'item' | 'calendar';
  source: 'slack' | 'github' | 'jira' | 'calendar' | 'mt';
  urgency: 'urgent' | 'attention' | 'followup' | 'fyi' | 'org';
  text: string;
  metadata: Record<string, any>;
  external_id?: string;
  external_url?: string;
  created_at: Date;
  updated_at: Date;
  processed_at?: Date;
}

export class BriefItemModel {
  static async create(item: Omit<BriefItem, 'id' | 'created_at' | 'updated_at'>): Promise<BriefItem> {
    const result = await pool.query(
      `INSERT INTO brief_items (user_id, type, source, urgency, text, metadata, external_id, external_url, processed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        item.user_id,
        item.type,
        item.source,
        item.urgency,
        item.text,
        JSON.stringify(item.metadata),
        item.external_id,
        item.external_url,
        item.processed_at
      ]
    );
    return {
      ...result.rows[0],
      metadata: typeof result.rows[0].metadata === 'string' ? JSON.parse(result.rows[0].metadata) : result.rows[0].metadata
    };
  }

  static async findByUser(userId: string, limit: number = 50): Promise<BriefItem[]> {
    const result = await pool.query(
      `SELECT * FROM brief_items 
       WHERE user_id = $1 
       ORDER BY 
         CASE urgency 
           WHEN 'urgent' THEN 1 
           WHEN 'attention' THEN 2 
           WHEN 'followup' THEN 3 
           WHEN 'org' THEN 4 
           ELSE 5 
         END,
         created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows.map(row => ({
      ...row,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
    }));
  }

  static async findByExternalId(userId: string, externalId: string, source: string): Promise<BriefItem | null> {
    const result = await pool.query(
      'SELECT * FROM brief_items WHERE user_id = $1 AND external_id = $2 AND source = $3',
      [userId, externalId, source]
    );
    if (!result.rows[0]) return null;
    return {
      ...result.rows[0],
      metadata: typeof result.rows[0].metadata === 'string' ? JSON.parse(result.rows[0].metadata) : result.rows[0].metadata
    };
  }

  static async delete(id: string): Promise<void> {
    await pool.query('DELETE FROM brief_items WHERE id = $1', [id]);
  }
}

