import pool from '../db/connection';

export interface Integration {
  id: string;
  user_id: string;
  provider: 'slack' | 'github' | 'jira' | 'calendar';
  access_token: string;
  refresh_token?: string;
  token_expires_at?: Date;
  config: Record<string, any>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export class IntegrationModel {
  static async create(integration: Omit<Integration, 'id' | 'created_at' | 'updated_at'>): Promise<Integration> {
    const result = await pool.query(
      `INSERT INTO integrations (user_id, provider, access_token, refresh_token, token_expires_at, config, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, provider) 
       DO UPDATE SET 
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         token_expires_at = EXCLUDED.token_expires_at,
         config = EXCLUDED.config,
         is_active = EXCLUDED.is_active,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        integration.user_id,
        integration.provider,
        integration.access_token,
        integration.refresh_token,
        integration.token_expires_at,
        JSON.stringify(integration.config),
        integration.is_active
      ]
    );
    return { ...result.rows[0], config: typeof result.rows[0].config === 'string' ? JSON.parse(result.rows[0].config) : result.rows[0].config };
  }

  static async findByUser(userId: string): Promise<Integration[]> {
    const result = await pool.query(
      'SELECT * FROM integrations WHERE user_id = $1 ORDER BY provider',
      [userId]
    );
    return result.rows.map((row: any) => ({
      ...row,
      config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config
    }));
  }

  static async findByUserAndProvider(userId: string, provider: string): Promise<Integration | null> {
    const result = await pool.query(
      'SELECT * FROM integrations WHERE user_id = $1 AND provider = $2',
      [userId, provider]
    );
    if (!result.rows[0]) return null;
    return {
      ...result.rows[0],
      config: typeof result.rows[0].config === 'string' ? JSON.parse(result.rows[0].config) : result.rows[0].config
    };
  }

  static async updateToken(id: string, accessToken: string, refreshToken?: string, expiresAt?: Date): Promise<Integration> {
    const result = await pool.query(
      `UPDATE integrations 
       SET access_token = $1, refresh_token = $2, token_expires_at = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [accessToken, refreshToken, expiresAt, id]
    );
    return {
      ...result.rows[0],
      config: typeof result.rows[0].config === 'string' ? JSON.parse(result.rows[0].config) : result.rows[0].config
    };
  }

  static async deactivate(id: string): Promise<void> {
    await pool.query(
      'UPDATE integrations SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
  }
}

