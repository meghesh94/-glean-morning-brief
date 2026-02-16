import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ScratchpadModel } from '../models/Scratchpad';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const scratchpad = await ScratchpadModel.getOrCreate(req.userId);
    res.json(scratchpad);
  } catch (error) {
    console.error('Get scratchpad error:', error);
    res.status(500).json({ error: 'Failed to fetch scratchpad' });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { content } = req.body;
    const scratchpad = await ScratchpadModel.update(req.userId, content || '');
    res.json(scratchpad);
  } catch (error) {
    console.error('Update scratchpad error:', error);
    res.status(500).json({ error: 'Failed to update scratchpad' });
  }
});

export default router;

