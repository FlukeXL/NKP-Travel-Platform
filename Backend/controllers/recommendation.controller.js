const fs = require('fs');
const path = require('path');
const placeModel = require('../models/place.model');
const userModel = require('../models/user.model');
const reviewModel = require('../models/review.model');
const aiService = require('../services/ai.service');
const { asyncHandler, ok } = require('../utils/helper');

const MOCK_PLACES = [
  { id: 'cafe-riverside-million-view', name: 'จิบกาแฟชิลๆ เติมพลังให้ชีวิต', category: 'cafe', desc: 'จิบกาแฟพร้อมวิวแม่น้ำโขงและสะพานมิตรภาพ บรรยากาศชิลสไตล์โมเดิร์น', img: '/assets/images/Blendy Boo.jpg', area: 'ริมโขง', price: '฿฿' },
  { id: 'wooden-road-cafe', name: 'บ้านไม้ริมทาง คาเฟ่', category: 'cafe', desc: 'คาเฟ่บ้านไม้เก่าตกแต่งสไตล์วินเทจ', img: '/assets/images/places/cafe-2.jpg', area: 'อำเภอเมือง', price: '฿฿' },
  { id: 'that-phanom', name: 'วัดพระธาตุพนมวรมหาวิหาร', category: 'attraction', desc: 'ปูชนียสถานอันศักดิ์สิทธิ์ของชาวอีสาน', img: '/assets/images/places/phra-that-phanom.jpg', area: 'ธาตุพนม', price: 'ฟรี' },
  { id: 'nem-nueang-riverside', name: 'ร้านแหนมเนือง ริมโขง', category: 'restaurant', desc: 'แหนมเนืองต้นตำรับเวียดนาม', img: '/assets/images/places/restaurant-1.jpg', area: 'ริมโขง', price: '฿฿' },
  { id: 'mekong-riverside-sunset', name: 'จุดชมวิวพระอาทิตย์ตกริมน้ำโขง', category: 'attraction', desc: 'เดินเล่นรับลมเย็นๆ พร้อมวิวพระอาทิตย์ตก', img: '/assets/images/places/sunset-mekong.jpg', area: 'ริมโขง', price: 'ฟรี' },
  { id: 'naga-monument', name: 'พญาศรีสัตตนาคราช', category: 'attraction', desc: 'แลนด์มาร์คสำคัญของนครพนม', img: '/assets/images/places/naga-monument.jpg', area: 'อำเภอเมือง', price: 'ฟรี' },
  { id: 'walking-street', name: 'ถนนคนเดิน นครพนม', category: 'attraction', desc: 'ช้อปปิ้งของพื้นเมืองและสตรีทฟู้ด', img: '/assets/images/places/walking-street.jpg', area: 'อำเภอเมือง', price: '฿' }
];

const HISTORY_FILE = path.join(__dirname, '..', 'data', 'weekly_history.json');

function getHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Failed to read history:', err);
  }
  return [];
}

function saveHistory(history) {
  try {
    const dir = path.dirname(HISTORY_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
  } catch (err) {
    console.error('Failed to write history:', err);
  }
}

exports.getPersonalizedPlaces = asyncHandler(async (req, res) => {
  let places = await placeModel.getAllPlaces();
  if (!places || places.length === 0) places = MOCK_PLACES;

  const allFood = places.filter(p => ['restaurant'].includes(p.category) || ['restaurant'].includes(p.category2));
  const allCafe = places.filter(p => ['cafe'].includes(p.category) || ['cafe'].includes(p.category2));

  if (!req.user || !aiService.isConfigured()) {
    return ok(res, {
      food: allFood.slice(0, 4),
      cafe: allCafe.slice(0, 4),
    });
  }

  const user = await userModel.getUserById(req.user.uid);

  if (!user || !user.profile) {
    return ok(res, {
      food: allFood.slice(0, 4),
      cafe: allCafe.slice(0, 4),
    });
  }

  const prompt = `
You are an expert travel recommender.
I have a user with the following profile:
Interests: ${user.profile.interests.join(', ')}
Environment Preference: ${user.profile.envPref}
Pace Preference: ${user.profile.pacePref}

Here are the available restaurants:
${JSON.stringify(allFood.map(p => ({ id: p.id, name: p.name, desc: p.desc })))}

Here are the available cafes:
${JSON.stringify(allCafe.map(p => ({ id: p.id, name: p.name, desc: p.desc })))}

Return exactly 4 restaurant IDs and 4 cafe IDs that best fit this user in JSON format like this:
{ "food": ["id1", "id2", "id3", "id4"], "cafe": ["id5", "id6", "id7", "id8"] }
Do not return any markdown or other text. Only JSON.`;

  try {
    const aiResponse = await aiService.generateText(prompt);
    const parsed = JSON.parse(aiResponse.replace(/```json/g, '').replace(/```/g, '').trim());

    let foodPlaces = (parsed.food || []).map(id => allFood.find(p => p.id === id)).filter(Boolean);
    let cafePlaces = (parsed.cafe || []).map(id => allCafe.find(p => p.id === id)).filter(Boolean);

    // Fill with fallback places if AI didn't return enough valid ones
    if (foodPlaces.length < 4) {
      const needed = 4 - foodPlaces.length;
      const fallbacks = allFood.filter(p => !foodPlaces.find(fp => fp.id === p.id)).slice(0, needed);
      foodPlaces = [...foodPlaces, ...fallbacks];
    }
    if (cafePlaces.length < 4) {
      const needed = 4 - cafePlaces.length;
      const fallbacks = allCafe.filter(p => !cafePlaces.find(cp => cp.id === p.id)).slice(0, needed);
      cafePlaces = [...cafePlaces, ...fallbacks];
    }

    return ok(res, {
      food: foodPlaces,
      cafe: cafePlaces,
    });
  } catch (err) {
    console.error('AI Recommendation failed, falling back:', err);
    return ok(res, {
      food: allFood.slice(0, 4),
      cafe: allCafe.slice(0, 4),
    });
  }
});

exports.getWeeklyPlaces = asyncHandler(async (req, res) => {
  let allPlaces = await placeModel.getAllPlaces();
  if (!allPlaces || allPlaces.length === 0) allPlaces = MOCK_PLACES;
  
  if (allPlaces.length === 0) {
    return ok(res, { places: [] });
  }

  let history = getHistory();
  
  const unshownPlaces = allPlaces.filter(p => !history.includes(p.id));
  
  let availablePlaces = unshownPlaces;
  if (availablePlaces.length < 4) {
    history = [];
    availablePlaces = allPlaces;
  }

  // 1. Get Top Rated Places
  let topRatedPlaces = [];
  const reviews = await reviewModel.getAllReviews();
  const ratings = {};
  reviews.forEach(r => {
    if (!ratings[r.placeId]) ratings[r.placeId] = { total: 0, count: 0 };
    ratings[r.placeId].total += r.rating;
    ratings[r.placeId].count += 1;
  });

  const rankedIds = Object.keys(ratings)
    .map(id => ({ id, avg: ratings[id].total / ratings[id].count, count: ratings[id].count }))
    .filter(x => x.avg >= 4.0 && x.count >= 1)
    .sort((a, b) => b.avg - a.avg)
    .map(x => x.id);

  topRatedPlaces = rankedIds
    .filter(id => !history.includes(id))
    .map(id => availablePlaces.find(p => p.id === id))
    .filter(Boolean)
    .slice(0, 2);

  const selectedPlaces = [...topRatedPlaces];
  const selectedIds = selectedPlaces.map(p => p.id);

  // 2. Use AI to fill the rest
  const remainingSlots = 4 - selectedPlaces.length;
  let remainingAvailable = availablePlaces.filter(p => !selectedIds.includes(p.id));

  if (remainingSlots > 0 && aiService.isConfigured()) {
    const prompt = `
You are an expert travel recommender for Nakhon Phanom, Thailand.
I need to recommend ${remainingSlots} places to users this week. 
The recommendations should be diverse, exciting, and not repetitive.

Here are the available places to choose from:
${JSON.stringify(remainingAvailable.map(p => ({ id: p.id, name: p.name, category: p.category, desc: p.desc })))}

Return EXACTLY ${remainingSlots} place IDs from the list above in JSON format like this:
{ "places": ["id1", "id2"] }
Do not return any markdown or other text. Only JSON.`;

    try {
      const aiResponse = await aiService.generateText(prompt);
      const parsed = JSON.parse(aiResponse.replace(/```json/g, '').replace(/```/g, '').trim());
      
      const aiPlaces = (parsed.places || [])
        .map(id => remainingAvailable.find(p => p.id === id))
        .filter(Boolean)
        .slice(0, remainingSlots);
        
      selectedPlaces.push(...aiPlaces);
      aiPlaces.forEach(p => selectedIds.push(p.id));
    } catch (err) {
      console.error('AI Weekly Recommendation failed:', err);
    }
  }

  // Fallback if AI fails or doesn't return enough
  if (selectedPlaces.length < 4) {
    const needed = 4 - selectedPlaces.length;
    remainingAvailable = availablePlaces.filter(p => !selectedIds.includes(p.id));
    const fallbackPlaces = remainingAvailable.slice(0, needed);
    selectedPlaces.push(...fallbackPlaces);
    fallbackPlaces.forEach(p => selectedIds.push(p.id));
  }

  const newHistory = [...history, ...selectedPlaces.map(p => p.id)];
  saveHistory(newHistory);

  return ok(res, { places: selectedPlaces });
});
