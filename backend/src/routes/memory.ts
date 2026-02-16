import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { MemoryModel } from '../models/Memory';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const memory = await MemoryModel.findByUser(req.userId);
    res.json(memory);
  } catch (error) {
    console.error('Get memory error:', error);
    res.status(500).json({ error: 'Failed to fetch memory' });
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { value } = req.body;
    if (!value) {
      return res.status(400).json({ error: 'Value is required' });
    }

    const memory = await MemoryModel.update(req.params.id, value);
    res.json(memory);
  } catch (error) {
    console.error('Update memory error:', error);
    res.status(500).json({ error: 'Failed to update memory' });
  }
});

export default router;

