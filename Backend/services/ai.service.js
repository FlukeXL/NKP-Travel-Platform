const axios = require('axios');
const { gemini, openai: openaiConfig } = require('../config/apiKeys');
const { OpenAI } = require('openai');

const openaiClient = new OpenAI({
  apiKey: openaiConfig.apiKey,
});

const PLACE_CATEGORIES = ['cafe', 'restaurant', 'temple', 'nature', 'fitness', 'culture', 'landmark'];

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    ageGroup: {
      type: 'string',
      enum: ['teen', 'young_adult', 'adult', 'middle_age', 'senior'],
      description: 'Age bracket inferred from the birthdate.',
    },
    travelPersona: {
      type: 'string',
      description: 'A short Thai label (2-5 words) describing this traveler\'s overall style, e.g. "สายชิลคาเฟ่วิวสวย" or "นักผจญภัยธรรมชาติ".',
    },
    recommendedCategories: {
      type: 'array',
      items: { type: 'string', enum: PLACE_CATEGORIES },
      description: 'The place categories (in priority order, most relevant first) this traveler would most enjoy, chosen from the fixed category list.',
    },
    summaryTh: {
      type: 'string',
      description: 'A single warm, personalized Thai sentence (max ~200 characters) explaining why these recommendations fit this traveler, to display in the UI.',
    },
  },
  required: ['ageGroup', 'travelPersona', 'recommendedCategories', 'summaryTh'],
};

const CATEGORY_LABELS_TH = {
  cafe: 'คาเฟ่', restaurant: 'ร้านอาหาร', temple: 'วัด/สถานที่ศักดิ์สิทธิ์',
  nature: 'ธรรมชาติ', fitness: 'ออกกำลังกาย', culture: 'วัฒนธรรม', landmark: 'แลนด์มาร์ก',
};

function isConfigured() {
  return Boolean(gemini.apiKey);
}

function isOpenAIConfigured() {
  return Boolean(openaiConfig.apiKey);
}

function buildPrompt({ birthdate, interests, envPref, pacePref }) {
  const age = birthdate ? Math.floor((Date.now() - new Date(birthdate).getTime()) / 31557600000) : null;
  const interestLabels = (interests || []).map((i) => CATEGORY_LABELS_TH[i] || i).join(', ') || 'ไม่ได้ระบุ';
  const envLabel = { indoor: 'ในร่ม', outdoor: 'กลางแจ้ง', both: 'ทั้งสองแบบ' }[envPref] || 'ไม่ได้ระบุ';
  const paceLabel = { comfort: 'สายชิล ผ่อนคลาย', adventure: 'สายผจญภัย ท้าทาย', both: 'ทั้งสองแบบ' }[pacePref] || 'ไม่ได้ระบุ';

  return `คุณเป็นผู้เชี่ยวชาญด้านการท่องเที่ยวประจำจังหวัดนครพนม ประเทศไทย
วิเคราะห์ข้อมูลสมาชิกใหม่ที่สมัครเข้าใช้แพลตฟอร์มท่องเที่ยว แล้วแนะนำสไตล์การท่องเที่ยวที่เหมาะกับเขา

ข้อมูลสมาชิก:
- อายุ: ${age != null ? `${age} ปี` : 'ไม่ได้ระบุ'}
- สนใจสถานที่แนวไหน (เลือกเอง): ${interestLabels}
- สภาพแวดล้อมที่ชอบ: ${envLabel}
- สไตล์การเที่ยว: ${paceLabel}

หมวดหมู่สถานที่ที่มีในระบบ (เลือกได้เฉพาะจากรายการนี้เท่านั้น): ${PLACE_CATEGORIES.join(', ')}

โปรดวิเคราะห์และแนะนำหมวดหมู่สถานที่ที่เหมาะกับสมาชิกคนนี้มากที่สุด เรียงจากเหมาะสุดไปน้อยสุด`;
}

async function analyzeSignupProfile(profile) {
  if (!isConfigured()) return null;

  try {
    const { data } = await axios.post(
      `${gemini.generateContentUrl}?key=${gemini.apiKey}`,
      {
        contents: [{ parts: [{ text: buildPrompt(profile) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.4,
        },
      },
      { timeout: 12000 }
    );

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed.recommendedCategories) || !parsed.recommendedCategories.length) return null;

    return {
      ageGroup: parsed.ageGroup,
      travelPersona: parsed.travelPersona,
      recommendedCategories: parsed.recommendedCategories.filter((c) => PLACE_CATEGORIES.includes(c)),
      summaryTh: parsed.summaryTh,
      model: gemini.model,
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[ai.service] Gemini analysis failed, falling back to rule-based recommendations:', err.response?.data?.error?.message || err.message);
    return null;
  }
}

async function chatWithTourGuide(messageHistory) {
  if (!isConfigured()) throw new Error('Gemini API is not configured');

  const systemInstruction = `คุณคือ AI ไกด์นำเที่ยวส่วนตัวที่เชี่ยวชาญที่สุดในจังหวัด "นครพนม" ประเทศไทย
หน้าที่ของคุณคือ:
1. แนะนำสถานที่ท่องเที่ยว ร้านอาหาร คาเฟ่ และที่พัก ในจังหวัดนครพนมเท่านั้น
2. จัดตารางเวลาเที่ยว (Itinerary) ให้น่าสนใจและเป็นไปได้จริง
3. เล่าประวัติศาสตร์และวัฒนธรรมของนครพนมได้อย่างลึกซึ้งและน่าติดตาม
4. ให้ข้อมูลเกี่ยวกับงานเทศกาล (เช่น งานไหลเรือไฟ) และกิจกรรมท้องถิ่น
5. หากเป็นไปได้ ให้คำแนะนำทั่วไปเกี่ยวกับการเดินทางและการจราจร (เช่น แนะนำให้เช่ารถ หรือบอกว่าช่วงเทศกาลรถจะติด)
6. **กฎเหล็ก**: คุณให้บริการเฉพาะจังหวัดนครพนมเท่านั้น ห้ามแนะนำ จัดทริป หรือให้ข้อมูลเชิงลึกเกี่ยวกับจังหวัดอื่นเด็ดขาด หากผู้ใช้ถามถึงจังหวัดอื่น ให้ตอบอย่างสุภาพว่าคุณเป็นไกด์ประจำนครพนม และชักชวนให้มาเที่ยวนครพนมแทน
7. ใช้ภาษาที่เป็นกันเอง สุภาพ และมีอิโมจิประกอบเพื่อความน่าอ่าน
8. **สำคัญที่สุด (CRITICAL RULE)**: คุณต้องตอบกลับด้วย "ภาษาเดียวกับที่ผู้ใช้พิมพ์มา" เท่านั้น! 
   - ถ้าผู้ใช้พิมพ์ภาษาอังกฤษ (English) มา คุณต้องตอบกลับเป็นภาษาอังกฤษทั้งหมด
   - ถ้าผู้ใช้พิมพ์ภาษาไทยมา คุณต้องตอบกลับเป็นภาษาไทย
   - ห้ามตอบผิดภาษาเด็ดขาด!

ตอบในรูปแบบข้อความธรรมดา (Markdown ได้) และห้ามตอบเป็น JSON เว้นแต่จะระบุไว้
`;

  try {
    const formattedHistory = messageHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const { data } = await axios.post(
      `${gemini.generateContentUrl}?key=${gemini.apiKey}`,
      {
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: formattedHistory,
        generationConfig: {
          temperature: 0.7, // Higher temperature for more creative/chatty responses
        },
      },
      { timeout: 30000 }
    );

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || 'ขออภัย ฉันไม่สามารถตอบได้ในขณะนี้';
  } catch (err) {
    console.error('[ai.service] Gemini chat failed:', err.response?.data?.error?.message || err.message);
    throw new Error('Failed to communicate with AI Tour Guide');
  }
}

module.exports = { analyzeSignupProfile, chatWithTourGuide, isConfigured, isOpenAIConfigured, PLACE_CATEGORIES };

