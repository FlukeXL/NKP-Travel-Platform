const aiService = require('../services/ai.service');

const MAX_HISTORY_LENGTH = 20;
const MAX_MESSAGE_CHARS = 1000;
const ALLOWED_ROLES = ['user', 'model', 'assistant'];

exports.tourGuideChat = async (req, res) => {
  try {
    const { messageHistory } = req.body;
    
    if (!messageHistory || !Array.isArray(messageHistory)) {
      return res.status(400).json({ error: 'messageHistory must be an array' });
    }

    if (messageHistory.length === 0) {
      return res.status(400).json({ error: 'messageHistory cannot be empty' });
    }

    // Limit history length to prevent token exhaustion DoS
    const trimmedHistory = messageHistory.slice(-MAX_HISTORY_LENGTH);

    // Validate and sanitize each message in history
    const sanitizedHistory = [];
    for (const msg of trimmedHistory) {
      if (!msg || typeof msg !== 'object') continue;
      const role = ALLOWED_ROLES.includes(msg.role) ? msg.role : 'user';
      let content = typeof msg.content === 'string' ? msg.content.trim() : '';
      if (!content) continue;

      // Truncate overly long messages
      if (content.length > MAX_MESSAGE_CHARS) {
        content = content.slice(0, MAX_MESSAGE_CHARS);
      }

      sanitizedHistory.push({ role, content });
    }

    if (sanitizedHistory.length === 0) {
      return res.status(400).json({ error: 'No valid messages provided' });
    }

    if (!aiService.isConfigured()) {
      return res.status(503).json({ error: 'AI Tour Guide is currently unavailable' });
    }

    const reply = await aiService.chatWithTourGuide(sanitizedHistory);
    res.json({ success: true, data: { reply } });
  } catch (error) {
    console.error('[AI Chat] Error:', error.message || error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
};
