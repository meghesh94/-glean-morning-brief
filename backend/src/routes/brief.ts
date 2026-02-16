import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { BriefItemModel } from '../models/BriefItem';
import { BriefGenerator } from '../services/brief/generator';

const router = Router();

// Get user's brief items
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const items = await BriefItemModel.findByUser(req.userId, limit);
    res.json(items);
  } catch (error) {
    console.error('Get brief error:', error);
    res.status(500).json({ error: 'Failed to fetch brief items' });
  }
});

// Generate/refresh brief
router.post('/generate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const generator = new BriefGenerator();
    const items = await generator.generateBrief(req.userId);
    res.json({ items, count: items.length });
  } catch (error) {
    console.error('Generate brief error:', error);
    res.status(500).json({ error: 'Failed to generate brief' });
  }
});

// Delete brief item
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await BriefItemModel.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete brief item error:', error);
    res.status(500).json({ error: 'Failed to delete brief item' });
  }
});

export default router;

