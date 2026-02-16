import OpenAI from 'openai';
import { BriefItemModel } from '../../models/BriefItem';
import { MemoryModel } from '../../models/Memory';
import { ScratchpadModel } from '../../models/Scratchpad';
import pool from '../../db/connection';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class ConversationService {
  async getResponse(
    userId: string,
    userMessage: string,
    currentBriefItemId?: string
  ): Promise<string> {
    // Get conversation history
    const conversation = await this.getConversation(userId);
    const messages: ConversationMessage[] = conversation.messages || [];

    // Get current brief item if provided
    let currentItem = null;
    if (currentBriefItemId) {
      const result = await pool.query(
        'SELECT * FROM brief_items WHERE id = $1 AND user_id = $2',
        [currentBriefItemId, userId]
      );
      currentItem = result.rows[0];
    }

    // Get memory
    const memory = await MemoryModel.findByUser(userId);
    const memoryContext = this.buildMemoryContext(memory);

    // Get scratchpad
    const scratchpad = await ScratchpadModel.getOrCreate(userId);

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt(currentItem, memoryContext, scratchpad.content);

    // Add system message and conversation history
    const allMessages: ConversationMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-10), // Last 10 messages for context
      { role: 'user', content: userMessage }
    ];

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: allMessages,
      temperature: 0.3,
      max_tokens: 150
    });

    const response = completion.choices[0]?.message?.content || '';

    // Save conversation
    await this.saveMessage(userId, userMessage, response);

    return response;
  }

  private buildSystemPrompt(currentItem: any, memoryContext: string, scratchpad: string): string {
    let prompt = `You are Glean, an AI assistant helping the user go through their morning brief. You present items from their work apps (Slack, GitHub, Jira, Calendar) and help them take action.

${memoryContext}

${scratchpad ? `Scratchpad notes: ${scratchpad}` : ''}

${currentItem ? `Current brief item: ${currentItem.text}\nMetadata: ${JSON.stringify(currentItem.metadata || {})}` : ''}

CONVERSATION RULES:
1. Stay focused on the current brief item being discussed. Don't make up new items or tasks.
2. If the user asks a vague question like "what", refer back to the current brief item shown above.
3. Keep responses short (1-2 sentences max) and action-oriented.
4. Don't hallucinate or invent tasks, people, or deadlines that aren't in the conversation.
5. If you don't know something, say so instead of making it up.

Your role is to help the user process their morning brief items, not to create new work items.`;

    return prompt;
  }

  private buildMemoryContext(memory: any[]): string {
    if (memory.length === 0) return '';

    const byLayer: Record<string, any[]> = {};
    for (const m of memory) {
      if (!byLayer[m.layer]) byLayer[m.layer] = [];
      byLayer[m.layer].push(m);
    }

    let context = 'User Memory:\n';
    for (const [layer, items] of Object.entries(byLayer)) {
      context += `\n${layer}:\n`;
      for (const item of items) {
        context += `- ${item.key}: ${item.value}\n`;
      }
    }

    return context;
  }

  private async getConversation(userId: string): Promise<any> {
    const result = await pool.query(
      'SELECT * FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1',
      [userId]
    );

    if (result.rows[0]) {
      return {
        ...result.rows[0],
        messages: typeof result.rows[0].messages === 'string' 
          ? JSON.parse(result.rows[0].messages) 
          : result.rows[0].messages
      };
    }

    // Create new conversation
    await pool.query(
      'INSERT INTO conversations (user_id, messages, context) VALUES ($1, $2, $3)',
      [userId, JSON.stringify([]), JSON.stringify({})]
    );

    return { messages: [], context: {} };
  }

  private async saveMessage(userId: string, userMessage: string, assistantMessage: string): Promise<void> {
    const conversation = await this.getConversation(userId);
    const messages = conversation.messages || [];

    messages.push(
      { role: 'user', content: userMessage },
      { role: 'assistant', content: assistantMessage }
    );

    await pool.query(
      `UPDATE conversations 
       SET messages = $1, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2`,
      [JSON.stringify(messages), userId]
    );
  }
}

