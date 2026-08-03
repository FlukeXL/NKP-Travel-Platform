const aiService = require('../services/ai.service');

exports.tourGuideChat = async (req, res) => {
  try {
    const { messageHistory } = req.body;
    
    if (!messageHistory || !Array.isArray(messageHistory)) {
      return res.status(400).json({ error: 'messageHistory must be an array' });
    }

    if (!aiService.isConfigured()) {
      return res.status(503).json({ error: 'AI Tour Guide is currently unavailable' });
    }

    const reply = await aiService.chatWithTourGuide(messageHistory);
    res.json({ success: true, data: { reply } });
  } catch (error) {
    console.error('[AI Chat] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to process chat message' });
  }
};
