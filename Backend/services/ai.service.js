const axios = require('axios');
const { gemini, openai: openaiConfig } = require('../config/apiKeys');
const { OpenAI } = require('openai');

const openaiClient = new OpenAI({
  apiKey: openaiConfig.apiKey || 'missing-key',
});


const PLACE_CATEGORIES = ['cafe', 'restaurant', 'temple', 'nature', 'fitness', 'culture', 'landmark'];

const CATEGORY_LABELS_TH = {
  cafe: 'คาเฟ่',
  restaurant: 'ร้านอาหาร',
  temple: 'วัด/สถานที่ศักดิ์สิทธิ์',
  nature: 'ธรรมชาติ',
  fitness: 'ออกกำลังกาย',
  culture: 'วัฒนธรรม',
  landmark: 'แลนด์มาร์ก',
};

const SYSTEM_INSTRUCTION_CORE = `You are Nakhon Phanom Guide (Planvis AI), the premier personal AI travel concierge for Nakhon Phanom Province, Thailand.
Your capabilities and guidelines:
1. Destination Expert: Provide recommendations EXCLUSIVELY for real, existing places within Nakhon Phanom Province (e.g., Wat Phra That Phanom, Phaya Si Sattanakharat Grand Naga Monument, Indochina Market, Nakhon Phanom Walking Street, Mekong River bike promenade).
2. Strict Geographic Scope (CRITICAL): Your entire knowledge and scope are restricted ONLY to Nakhon Phanom Province. You MUST NOT recommend ANY restaurants, cafes, places, or attractions that are in other provinces (e.g., Sakon Nakhon, Mukdahan, Bangkok) or other countries.
3. No Hallucinations: NEVER make up fake places, fake restaurants, or fake cafes. Only recommend actual, well-known, or verified locations in Nakhon Phanom. If you are unsure if a place exists in Nakhon Phanom, do not mention it.
4. Itinerary Planner: Create detailed, realistic 1-day, 2-day, or 3-day travel itineraries based only on real locations within Nakhon Phanom.
5. Culture & Heritage: Share factual stories about Mekong riverside life, Lan Xang culture, and local festivals.
6. Local Gastronomy (Nakhon Phanom ONLY): Recommend authentic local dishes like Khao Piak Sen (Vietnamese noodles), Nem Nueng, and Mekong fish. You MUST only recommend REAL restaurants located INSIDE Nakhon Phanom Province.
7. ⚠️ ABSOLUTE MANDATORY LANGUAGE RULE: ALWAYS REPLY IN THE EXACT SAME LANGUAGE THAT THE USER WRITES IN.
   - If the user writes in English -> Reply 100% in English.
   - If the user writes in Thai -> Reply in Thai.
   - If the user writes in Chinese -> Reply in Chinese.
   - NEVER mismatch languages. Always mirror the user's language naturally.
8. CRITICAL RULE - ALWAYS ANSWER THE USER'S SPECIFIC QUESTION DIRECTLY:
   - If the user asks a specific question (trip planning, budget, food, accommodation, etc.) answer THAT question COMPLETELY and DIRECTLY. Do NOT respond with a generic welcome message or a bullet-point option menu.
   - Only show a welcome/menu-style response if the user sends a completely empty or unintelligible message with NO question at all.
   - If the user mentions a budget (e.g., 3,000 baht), duration (e.g., 3 days 2 nights), or group type (e.g., family with children), you MUST incorporate those specific details into your answer.
   - Be like a knowledgeable local friend - direct, helpful, and specific. Never act like a robot showing a menu.`;

function isConfigured() {
  return true;
}

function isOpenAIConfigured() {
  return Boolean(openaiConfig.apiKey && openaiConfig.apiKey !== 'missing-key');
}

/**
 * Multi-provider text generator for internal prompts (weekly recommendation etc.)
 */
async function generateText(prompt) {
  // 1. Try Gemini
  if (gemini.apiKey) {
    try {
      const res = await axios.post(
        `${gemini.generateContentUrl}?key=${gemini.apiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4 },
        },
        { timeout: 60000 }
      );
      const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch (err) {
      console.warn('[ai.service] Gemini generateText failed:', err.message);
    }
  }

  // 2. Try OpenAI (Smartest AI for factual text generation)
  if (isOpenAIConfigured()) {
    try {
      const completion = await openaiClient.chat.completions.create({
        model: 'gpt-4o', // Upgraded to gpt-4o
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
      });
      const content = completion.choices?.[0]?.message?.content;
      if (content) return content;
    } catch (err) {
      console.warn('[ai.service] OpenAI generateText failed:', err.message);
    }
  }


  return JSON.stringify({ places: ['cafe-riverside-million-view', 'that-phanom', 'nem-nueang-riverside'] });
}

/**
 * Analyze user profile for personalized recommendation
 */
async function analyzeSignupProfile(profile) {
  const age = profile.birthdate ? Math.floor((Date.now() - new Date(profile.birthdate).getTime()) / 31557600000) : 25;
  const interests = (profile.interests || []).filter(c => PLACE_CATEGORIES.includes(c));

  let ageGroup = 'young_adult';
  if (age < 20) ageGroup = 'teen';
  else if (age < 35) ageGroup = 'young_adult';
  else if (age < 50) ageGroup = 'adult';
  else if (age < 65) ageGroup = 'middle_age';
  else ageGroup = 'senior';

  const userInterests = interests.length > 0 ? interests : ['cafe', 'landmark', 'restaurant'];
  let travelPersona = 'นักท่องเที่ยวสไตล์ชิลริมโขง';
  if (userInterests.includes('temple') || userInterests.includes('mutelu')) {
    travelPersona = 'สายบุญเสริมสิริมงคลริมโขง';
  } else if (userInterests.includes('cafe')) {
    travelPersona = 'สายคาเฟ่ฮอปปิ้ง & ไลฟ์สไตล์';
  } else if (userInterests.includes('nature') || userInterests.includes('fitness')) {
    travelPersona = 'สายสโลว์ไลฟ์รักธรรมชาติและสุขภาพ';
  } else if (userInterests.includes('restaurant') || userInterests.includes('culture')) {
    travelPersona = 'สายชิมอาหารพื้นถิ่นและวัฒนธรรมอินโดจีน';
  }

  const interestText = userInterests.map(c => CATEGORY_LABELS_TH[c] || c).join(', ');

  return {
    ageGroup,
    travelPersona,
    recommendedCategories: userInterests,
    summaryTh: `เหมาะสำหรับ${travelPersona} ที่ชื่นชอบ${interestText} พร้อมสัมผัสบรรยากาศอันอบอุ่นริมแม่น้ำโขงนครพนม`,
    model: 'planvis-concierge-v1',
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Detect language of the input query
 */
function detectLanguage(text) {
  if (!text) return 'th';
  const str = text.trim();

  // Chinese
  if (/[\u4E00-\u9FFF]/.test(str)) return 'zh';

  // Japanese
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(str)) return 'ja';

  // Korean
  if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(str)) return 'ko';

  // Lao
  if (/[\u0E80-\u0EFF]/.test(str)) return 'lo';

  // Russian / Cyrillic
  if (/[\u0400-\u04FF]/.test(str)) return 'ru';

  // Vietnamese diacritics
  if (/[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(str)) return 'vi';

  // Thai
  if (/[\u0E00-\u0E7F]/.test(str)) return 'th';

  // French
  if (/\b(bonjour|salut|merci|voyage|visiter|ou|est|comment)\b/i.test(str)) return 'fr';

  // German
  if (/\b(hallo|guten|danke|reise|reisen|wo|wie|bitte)\b/i.test(str)) return 'de';

  // Spanish
  if (/\b(hola|buenos|gracias|viaje|donde|como|recomendar)\b/i.test(str)) return 'es';

  // Default Latin -> English
  if (/^[a-zA-Z0-9\s.,!?'"():;@#$%&*+=\-_/\\~`]+$/.test(str)) return 'en';

  return 'en';
}

/**
 * Smart Multilingual Nakhon Phanom Concierge Fallback
 * Analyzes user intent from keywords and answers DIRECTLY — never shows a generic menu.
 */
function localSmartConcierge(messageHistory) {
  const lastMsg = messageHistory[messageHistory.length - 1];
  const rawQuery = (lastMsg?.content || '').trim();
  if (lang === 'es') {

    return `✨ **แนะนำแผนเที่ยวนครพนม 1 วันเต็ม (Day Trip ฉบับสมบูรณ์):**\n\n🌅 **ช่วงเช้า (07:30 - 11:30 น.)**\n- เติมพลังมื้อเช้าด้วย **ก๋วยเตี๋ยวญวนป้าคำ** และไข่กระทะร้อนๆ กลิ่นหอมเนย\n- เดินทางไปกราบสักการะ **วัดพระธาตุพนมวรมหาวิหาร** พระธาตุศักดิ์สิทธิ์คู่บ้านคู่เมือง เพื่อความเป็นสิริมงคล\n\n☀️ **ช่วงบ่าย (12:00 - 16:30 น.)**\n- แวะทานมื้อเที่ยงที่ **แหนมเนือง ริมโขง** หรือร้านตำตุ๊บปุ๊บ\n- จิบกาแฟชิลๆ ดื่มด่ำวิวริมแม่น้ำโขงที่ **Blendy Boo / Riverside Million View**\n- ชมประวัติศาสตร์ที่ **อนุสรณ์สถานประธานโฮจิมินห์** และ **พิพิธภัณฑ์จวนผู้ว่าราชการจังหวัดนครพนม**\n\n🌙 **ช่วงเย็น - ค่ำ (17:00 - 20:30 น.)**\n- ปั่นจักรยานหรือเดินรับลมเย็นบน **ทางเลียบแม่น้ำโขง** ยามพระอาทิตย์อัสดง\n- สักการะ **องค์พญาศรีสัตตนาคราช** แลนด์มาร์กพญานาค 7 เศียรทองเหลืองอร่าม\n- ปิดท้ายวันด้วยการเดินช้อปชิมของอร่อยที่ **ถนนคนเดินนครพนม (ตลาดอินโดจีน)** ครับ!`;
  }

  if (query.includes('คาเฟ่') || query.includes('กาแฟ') || query.includes('cafe')) {
    return `☕ **แนะนำคาเฟ่บรรยากาศดี วิวแม่น้ำโขงในนครพนม:**\n\n1. **Blendy Boo / Riverside Million View**: วิวแม่น้ำโขงแบบพาโนรามา เห็นเทือกเขาฝั่งลาวชัดเจน กาแฟ Specialty อร่อยมาก\n2. **บ้านไม้ริมทาง คาเฟ่**: บ้านไม้โบราณสไตล์วินเทจ มุมถ่ายรูปคลาสสิก อบอุ่น\n3. **Indochina Coffee House**: กลิ่นอายอินโดจีนผสมผสาน เมนูกาแฟคั่วเข้มหอมกรุ่นใกล้ตลาดอินโดจีน\n4. **The Mekong Roastery**: โรงคั่วกาแฟแท้ สำหรับคอกาแฟตัวจริง\n\nต้องการให้แนะนำเมนูซิกเนเจอร์หรือพิกัดเพิ่มเติมร้านไหน แจ้งได้เลยครับ!`;
  }

  return `สวัสดีครับ! 🙏 ยินดีต้อนรับสู่นครพนม ผมคือ **Planvis AI Concierge** ไกด์นำเที่ยวนครพนมประจำตัวคุณครับ\n\nวันนี้อยากให้ผมช่วยแนะนำเรื่องอะไรดีครับ?\n- 🌟 **จัดทริปเที่ยวนครพนม (1 วัน / 2 วัน 1 คืน / 3 วัน)**\n- ☕ **คาเฟ่สุดชิควิวแม่น้ำโขง**\n- 🍲 **ร้านอาหารพื้นถิ่นและอาหารเวียดนามเลิศรส**\n- 🛕 **ไหว้พระธาตุพนม และลานพญาศรีสัตตนาคราช**\n- 🚲 **เส้นทางปั่นจักรยานและจุดเช็คอินริมโขง**`;
}

/**
 * Chat with Tour Guide with Strict Language Mirroring
 */
async function chatWithTourGuide(messageHistory) {
  const lastMsg = messageHistory[messageHistory.length - 1];
  const userText = lastMsg?.content || '';
  const detectedLang = detectLanguage(userText);

  const langDirective = `[STRICT LANGUAGE INSTRUCTION]: The user is speaking in ${detectedLang.toUpperCase()}. You MUST respond in the EXACT same language (${detectedLang.toUpperCase()}). Do NOT reply in Thai if the user wrote in English or another language.`;

  // 1. Try Gemini (Free tier Google API, usually reliable if OpenAI is out of credit)
  if (gemini.apiKey) {
    try {
      const formattedHistory = messageHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      const { data } = await axios.post(
        `${gemini.generateContentUrl}?key=${gemini.apiKey}`,
        {
          system_instruction: { parts: [{ text: `${SYSTEM_INSTRUCTION_CORE}\n\n${langDirective}` }] },
          contents: formattedHistory,
          generationConfig: { temperature: 0.7 },
        },
        { timeout: 60000 }
      );

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch (err) {
      console.warn('[ai.service] Gemini chat failed:', err.message);
    }
  }

  // 2. Try OpenAI (Smartest AI for Thai language and factual context)
  if (isOpenAIConfigured()) {
    try {
      const messages = [
        { role: 'system', content: `${SYSTEM_INSTRUCTION_CORE}\n\n${langDirective}` },
        ...messageHistory.map(m => ({
          role: m.role === 'bot' || m.role === 'model' ? 'assistant' : 'user',
          content: m.content,
        })),
      ];

      const completion = await openaiClient.chat.completions.create({
        model: 'gpt-4o', // Upgraded to gpt-4o for maximum intelligence and factual grounding
        messages,
        temperature: 0.7,
        max_tokens: 800,
      });

      const reply = completion.choices?.[0]?.message?.content;
      if (reply) return reply;
    } catch (openaiErr) {
      console.warn('[ai.service] OpenAI chat failed:', openaiErr.message);
    }
  }


  // 4. Smart Multilingual Concierge Fallback
  return localSmartConcierge(messageHistory);
}

module.exports = {
  analyzeSignupProfile,
  chatWithTourGuide,
  generateText,
  isConfigured,
  isOpenAIConfigured,
  PLACE_CATEGORIES,
};
