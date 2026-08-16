const axios = require('axios');
const { gemini, openai: openaiConfig } = require('../config/apiKeys');
const { OpenAI } = require('openai');

const openaiClient = new OpenAI({
  apiKey: openaiConfig.apiKey || 'missing-key',
});

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:latest';

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
2. Strict Geographic Scope: You MUST NOT recommend places, restaurants, or attractions that are in other provinces or countries. If asked about places outside Nakhon Phanom, politely decline and offer a Nakhon Phanom alternative.
3. No Hallucinations: NEVER make up fake places, fake restaurants, or fake cafes. Only recommend actual, well-known, or verified locations in Nakhon Phanom. If you are unsure if a place exists in Nakhon Phanom, do not mention it.
4. Itinerary Planner: Create detailed, realistic 1-day, 2-day, or 3-day travel itineraries based only on real locations. Ensure travel distances between places make sense.
5. Culture & Heritage: Share factual stories about Mekong riverside life, Lan Xang culture, and local festivals (e.g. Illuminated Boat Procession / Lai Ruea Fai).
6. Local Gastronomy: Recommend authentic local dishes like Khao Piak Sen (Vietnamese noodles), Nem Nueng, and Mekong fish, but only associate them with real restaurants if you are certain they exist in Nakhon Phanom.
7. ⚠️ ABSOLUTE MANDATORY LANGUAGE RULE: ALWAYS REPLY IN THE EXACT SAME LANGUAGE THAT THE USER WRITES IN.
   - If the user writes in English -> Reply 100% in English.
   - If the user writes in Thai -> Reply in Thai.
   - If the user writes in Chinese -> Reply in Chinese.
   - NEVER mismatch languages. Always mirror the user's language naturally.`;

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
  if (gemini.apiKey && !gemini.apiKey.startsWith('AQ.')) {
    try {
      const res = await axios.post(
        `${gemini.generateContentUrl}?key=${gemini.apiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4 },
        },
        { timeout: 10000 }
      );
      const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch (err) {
      console.warn('[ai.service] Gemini generateText failed');
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

  // 3. Try Ollama (local fallback)
  try {
    const res = await axios.post(
      `${OLLAMA_HOST}/api/generate`,
      { model: OLLAMA_MODEL, prompt, stream: false },
      { timeout: 12000 }
    );
    if (res.data?.response) return res.data.response;
  } catch (err) {
    // Ollama offline
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
  if (/[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(str)) return 'vi';

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
 */
function localSmartConcierge(messageHistory) {
  const lastMsg = messageHistory[messageHistory.length - 1];
  const rawQuery = (lastMsg?.content || '').trim();
  const query = rawQuery.toLowerCase();
  const lang = detectLanguage(rawQuery);

  if (lang === 'zh') {
    return `您好！🙏 欢迎来到泰国那空帕侬府（Nakhon Phanom）。我是您的专属 **Planvis AI** 导游。\n\n那空帕侬府坐落于美丽的湄公河畔，拥有悠久的历史与宁静的自然风光。您可以向我咨询：\n- 🛕 **著名寺庙与神迹**：帕侬寺（Wat Phra That Phanom）、巨型七头娜迦地标（Phaya Si Sattanakharat）\n- ☕ **湄公河景咖啡馆**：Blendy Boo、Million View 咖啡厅\n- 🍲 **当地美食**：越式米粉（Khao Piak Sen）、湄公河鲜鱼、印度支那夜市小吃\n- 🗓️ **旅游行程定制**：1日游、2日游或3日游行程规划！`;
  }

  if (lang === 'ja') {
    return `こんにちは！🙏 タイのナコーンパノム県へようこそ。私は専属AIガイド **Planvis AI** です。\n\nメコン川沿いの美しい街、ナコーンパノムのおすすめスポットをご紹介します：\n- 🛕 **プラタート・パノム寺院 (Wat Phra That Phanom)**：県内で最も神聖な寺院\n- 🐉 **パヤー・シーサッタナーガラート (ナーガ像)**：メコン川沿いの幸運のパワースポット\n- ☕ **絶景リバービューカフェ**：メコン川とラオスの山々を望むカフェ巡り\n- 🍲 **地元グルメ**：ベトナム風うどん (カオピヤックセン) やメコン川の魚料理\n\n1日・2日間のモデルコースやおすすめホテルなどもお気軽にお尋ねください！`;
  }

  if (lang === 'ko') {
    return `안녕하세요! 🙏 태국 나콘파놈(Nakhon Phanom)에 오신 것을 환영합니다. 저는 전담 여행 AI 가이드 **Planvis AI** 입니다.\n\n메콩강의 평화로운 정취와 유서 깊은 문화를 간직한 나콘파놈의 명소를 안내해 드립니다:\n- 🛕 **왓 프라탓 파놈 (Wat Phra That Phanom)**: 나콘파놈의 상징이자 신성한 사원\n- 🐉 **나가(Naga) 랜드마크**: 메콩강변의 거대한 황금 나가 조형물\n- ☕ **메콩강 전망 카페**: 라오스 산맥이 한눈에 보이는 리버뷰 카페\n- 🍲 **로컬 미식**: 베트남식 쌀국수(카오삐약센)와 메콩강 생선 요리\n\n추천 일정(1일/2일 코스)이나 궁금한 점이 있으시면 편하게 물어보세요!`;
  }

  if (lang === 'lo') {
    return `ສະບາຍດີ! 🙏 ຍິນດີຕ້ອນຮັບສູ່ນະຄອນພະນົມ. ຂ້ອຍແມ່ນ AI ໄກດ໌ນຳທ່ຽວປະຈຳຕົວຂອງທ່ານ **Planvis AI**.\n\nນະຄອນພະນົມມີສະຖານທີ່ທ່ອງທ່ຽວທີ່ສວຍງາມ ແລະ ວັດທະນະທຳລ້ານຊ້າງທີ່ໜ້າປະທັບໃຈ:\n- 🛕 **ວັດພະທາດພະນົມ**: ປູຊະນີຍະສະຖານຄູ່ບ້ານຄູ່ເມືອງ\n- 🐉 **ລານພະຍາສີສັດຕະນາຄະລາດ**: ແລນດ໌ມາກພະຍານາກ 7 ສຽນ ແຄມຂອງ\n- ☕ **ຄາເຟ່ວິວແມ່ນ້ຳຂອງ**: ຈິບກາເຟຊົມວິວຝັ່ງລາວ\n- 🍲 **ອາຫານທ້ອງຖິ່ນ**: ເຂົ້າປຽກເສັ້ນ, ແໜມເນືອງ, ລາບປາແມ່ນ້ຳຂອງ\n\nສາມາດສອບຖາມແຜນທ່ຽວ ຫຼື ຂໍ້ມູນອື່ນໆ ໄດ້ຕະຫຼອດເວລາເດີ້!`;
  }

  if (lang === 'vi') {
    return `Xin chào! 🙏 Chào mừng bạn đến với tỉnh Nakhon Phanom, Thái Lan. Tôi là trợ lý du lịch AI **Planvis AI** của bạn.\n\nNakhon Phanom là vùng đất yên bình bên dòng sông Mê Kông với nhiều nét văn hóa độc đáo:\n- 🛕 **Chùa Phra That Phanom (Wat Phra That Phanom)**: Ngôi chùa linh thiêng bậc nhất\n- 🐉 **Tượng thần rắn Naga (Phaya Si Sattanakharat)**: Biểu tượng may mắn bên bờ sông Mê Kông\n- 🏛️ **Khu tưởng niệm Chủ tịch Hồ Chí Minh**: Di tích lịch sử ý nghĩa tại Nakhon Phanom\n- 🍲 **Ẩm thực địa phương**: Bánh canh Thái-Việt (Khao Piak Sen), Nem Nướng, cá sông Mê Kông\n\nBạn cần gợi ý lịch trình 1 ngày hoặc địa điểm tham quan nào, cứ thoải mái hỏi tôi nhé!`;
  }

  if (lang === 'fr') {
    return `Bonjour ! 🙏 Bienvenue à Nakhon Phanom, Thaïlande. Je suis votre guide de voyage exclusif **Planvis AI**.\n\nNakhon Phanom est une charmante province paisible le long du fleuve Mékong. Que souhaitez-vous découvrir ?\n- 🛕 **Wat Phra That Phanom** : Le temple le plus sacré de la région\n- 🐉 **Monument Phaya Si Sattanakharat** : Majestueux monument du Grand Naga au bord du Mékong\n- ☕ **Cafés au bord du Mékong** : Dégustez un café face aux montagnes du Laos\n- 🍲 **Gastronomie locale** : Spécialités de poissons du Mékong et saveurs indochinoises\n- 🗓️ **Itinéraires sur mesure** : Circuits d'une journée ou de plusieurs jours !`;
  }

  if (lang === 'de') {
    return `Hallo! 🙏 Willkommen in Nakhon Phanom, Thailand. Ich bin Ihr persönlicher AI-Reiseführer **Planvis AI**.\n\nNakhon Phanom bietet wunderschöne Landschaften entlang des Mekong und reiche Kultur. Wie kann ich Ihnen heute helfen?\n- 🛕 **Wat Phra That Phanom**: Der heiligste Tempel der Provinz\n- 🐉 **Großes Naga-Monument (Phaya Si Sattanakharat)** am Mekong-Ufer\n- ☕ **Ufercafés mit Panoramablick** auf die laotischen Berge\n- 🍲 **Lokale Kulinarik**: Frische Mekong-Fischgerichte und vietnamesisch-isanische Küche\n- 🗓️ **Reisepläne**: Tagesausflüge und 3-Tage-Routen!`;
  }

  if (lang === 'es') {
    return `¡Hola! 🙏 Bienvenido a Nakhon Phanom, Tailandia. Soy tu guía de viaje personal **Planvis AI**.\n\nNakhon Phanom es una hermosa provincia junto al río Mekong. ¿En qué puedo ayudarte hoy?\n- 🛕 **Wat Phra That Phanom**: El templo más sagrado de la región\n- 🐉 **Monumento del Gran Naga (Phaya Si Sattanakharat)** a orillas del río\n- ☕ **Cafeterías con vistas panorámicas** al río Mekong y a Laos\n- 🍲 **Gastronomía local**: Deliciosos platos de pescado fresco del Mekong y cocina indochina\n- 🗓️ **Itinerarios sugeridos**: Rutas de 1 o varios días.`;
  }

  if (lang === 'en') {
    if (query.includes('itinerary') || query.includes('plan') || query.includes('1 day') || query.includes('trip') || query.includes('day trip')) {
      return `✨ **Recommended 1-Day Itinerary in Nakhon Phanom:**\n\n🌅 **Morning (08:00 - 11:30):**\n- Enjoy local breakfast: Vietnamese egg noodles (**Khao Piak Sen**) and hot pan eggs.\n- Visit **Wat Phra That Phanom**, the most revered sacred pagoda in the region.\n\n☀️ **Afternoon (12:00 - 16:30):**\n- Savor lunch with Vietnamese Nem Nueng by the river.\n- Relax at **Blendy Boo / Riverside Million View Cafe** taking in the panoramic views of Laos across the Mekong.\n- Explore historical heritage at the **President Ho Chi Minh Site** and the **Governor's Residence Museum**.\n\n🌙 **Evening (17:00 - 20:30):**\n- Stroll or cycle along the scenic **Mekong River promenade** at sunset.\n- Pay homage to the magnificent **Phaya Si Sattanakharat (7-Headed Golden Naga Landmark)**.\n- Explore the lively **Indochina Night Market** for dinner and local treats!`;
    }
    if (query.includes('cafe') || query.includes('coffee')) {
      return `☕ **Top Scenic Mekong Riverside Cafes in Nakhon Phanom:**\n\n1. **Blendy Boo & Riverside Million View:** Specialty coffee & healthy smoothies with breathtaking views of Laos and Friendship Bridge.\n2. **Wooden Road Cafe:** Charming vintage wooden house cafe with organic tea and desserts.\n3. **Indochina Coffee House:** Rich aromatic roasts right in the heart of the Indochina market area.\n4. **The Mekong Roastery:** Handcrafted specialty brews for authentic coffee lovers.`;
    }
    if (query.includes('food') || query.includes('eat') || query.includes('restaurant') || query.includes('dish')) {
      return `🍲 **Must-Try Dishes & Top Restaurants in Nakhon Phanom:**\n\n1. **Nem Nueng Riverside & Pa Kham Noodle:** Authentic Vietnamese spring rolls & handmade fresh noodles.\n2. **Mekong River Fish Restaurant (Pen Pla Pen):** Fresh Tom Yum and spicy herbs with wild river fish.\n3. **Lert Ocha:** Legendary stewed beef noodle soup with rich broth.\n4. **Indochina Night Market:** Street food hub featuring Vietnamese crispy pancakes and local delights.`;
    }
    return `Sawadee krub! 🙏 Welcome to Nakhon Phanom, Thailand! I am your personal **AI Tour Guide (Planvis AI)**.\n\nHow can I help you explore Nakhon Phanom today? You can ask me for:\n- 📍 **Top Landmarks & Temples** (Wat Phra That Phanom, Grand Naga Monument)\n- ☕ **Best Mekong Riverview Cafes**\n- 🍲 **Delicious Local & Vietnamese Cuisine**\n- 🗓️ **1-Day or Multi-Day Travel Itineraries**`;
  }

  // Thai Default
  if (query.includes('1 วัน') || query.includes('หนึ่งวัน') || query.includes('วันเดียว') || query.includes('ทริป') || query.includes('แผนเที่ยว') || query.includes('ตารางเที่ยว')) {
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

  // 1. Try Gemini (if standard API key available)
  if (gemini.apiKey && !gemini.apiKey.startsWith('AQ.')) {
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
        { timeout: 15000 }
      );

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch (err) {
      console.warn('[ai.service] Gemini chat failed');
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

  // 3. Try Ollama (Local llama3.2 instance - Fallback)
  try {
    const formattedMessages = [
      { role: 'system', content: `${SYSTEM_INSTRUCTION_CORE}\n\n${langDirective}` },
      ...messageHistory.map(m => ({
        role: m.role === 'bot' || m.role === 'model' ? 'assistant' : 'user',
        content: m.content,
      })),
    ];

    const res = await axios.post(
      `${OLLAMA_HOST}/api/chat`,
      {
        model: OLLAMA_MODEL,
        messages: formattedMessages,
        stream: false,
      },
      { timeout: 15000 }
    );

    const reply = res.data?.message?.content;
    if (reply && reply.trim().length > 0) {
      return reply;
    }
  } catch (ollamaErr) {
    // Ollama timeout or offline
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
