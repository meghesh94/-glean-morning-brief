import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { SlackIntegration } from '../services/integrations/SlackIntegration';
import { IntegrationModel } from '../models/Integration';
import crypto from 'crypto';

const router = Router();

// Store OAuth state temporarily (in production, use Redis)
const oauthStates = new Map<string, { userId: string; expiresAt: number }>();

// Get integration config from environment
function getSlackConfig() {
  return {
    clientId: process.env.SLACK_CLIENT_ID || '',
    clientSecret: process.env.SLACK_CLIENT_SECRET || '',
    redirectUri: process.env.SLACK_REDIRECT_URI || ''
  };
}

// Get OAuth URL for Slack
router.get('/slack/auth', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const config = getSlackConfig();
    if (!config.clientId || !config.clientSecret) {
      return res.status(500).json({ error: 'Slack integration not configured' });
    }

    const slack = new SlackIntegration(config);
    const state = crypto.randomBytes(32).toString('hex');
    
    // Store state with expiration (5 minutes)
    oauthStates.set(state, {
      userId: req.userId,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    const authUrl = slack.getAuthUrl(state);
    res.json({ authUrl, state });
  } catch (error) {
    console.error('Slack auth error:', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

// OAuth callback for Slack
router.get('/slack/callback', async (req: AuthRequest, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state' });
    }

    const stateData = oauthStates.get(state as string);
    if (!stateData || stateData.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired state' });
    }

    oauthStates.delete(state as string);

    const config = getSlackConfig();
    const slack = new SlackIntegration(config);
    const tokens = await slack.exchangeCodeForTokens(code as string);
    
    await slack.saveIntegration(stateData.userId, tokens);

    // Redirect to frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/integrations?success=slack`);
  } catch (error) {
    console.error('Slack callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/integrations?error=slack`);
  }
});

// List user integrations
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const integrations = await IntegrationModel.findByUser(req.userId);
    res.json(integrations.map(i => ({
      id: i.id,
      provider: i.provider,
      is_active: i.is_active,
      created_at: i.created_at
    })));
  } catch (error) {
    console.error('List integrations error:', error);
    res.status(500).json({ error: 'Failed to list integrations' });
  }
});

// Disconnect integration
router.delete('/:provider', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const integration = await IntegrationModel.findByUserAndProvider(
      req.userId,
      req.params.provider
    );

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    await IntegrationModel.deactivate(integration.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Disconnect integration error:', error);
    res.status(500).json({ error: 'Failed to disconnect integration' });
  }
});

export default router;

