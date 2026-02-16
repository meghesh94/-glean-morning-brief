import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ConversationService } from '../services/ai/conversation';

const router = Router();
const conversationService = new ConversationService();

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { message, briefItemId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const response = await conversationService.getResponse(
      req.userId,
      message,
      briefItemId
    );

    res.json({ response });
  } catch (error) {
    console.error('Conversation error:', error);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
});

export default router;

