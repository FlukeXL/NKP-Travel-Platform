const fs = require('fs');
const path = require('path');
const { isFirebaseReady } = require('../config/firebase');
const placeModel = require('../models/place.model');
const userModel = require('../models/user.model');
const reviewModel = require('../models/review.model');
const aiService = require('../services/ai.service');
const { asyncHandler, ok } = require('../utils/helper');
const { ApiError } = require('../middleware/errorHandler');

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
  const places = isFirebaseReady() ? await placeModel.getAllPlaces() : MOCK_PLACES;

  if (!req.user || !aiService.isConfigured()) {
    return ok(res, {
      food: places.filter(p => ['restaurant'].includes(p.category) || ['restaurant'].includes(p.category2)).slice(0, 4),
      cafe: places.filter(p => ['cafe'].includes(p.category) || ['cafe'].includes(p.category2)).slice(0, 4),
    });
  }

  const user = await userModel.getUserById(req.user.uid);
  if (!user || !user.profile) {
    return ok(res, {
      food: places.filter(p => ['restaurant'].includes(p.category) || ['restaurant'].includes(p.category2)).slice(0, 4),
      cafe: places.filter(p => ['cafe'].includes(p.category) || ['cafe'].includes(p.category2)).slice(0, 4),
    });
  }

  const prompt = `
You are an expert travel recommender.
I have a user with the following profile:
Interests: ${user.profile.interests.join(', ')}
Environment Preference: ${user.profile.envPref}
Pace Preference: ${user.profile.pacePref}

Here are the available places:
${JSON.stringify(places.map(p => ({ id: p.id, name: p.name, category: p.category, desc: p.desc })))}

Return exactly 4 food/restaurant place IDs and 4 cafe place IDs that best fit this user in JSON format like this:
{ "food": ["id1", "id2", "id3", "id4"], "cafe": ["id5", "id6", "id7", "id8"] }
Do not return any markdown or other text. Only JSON.`;

  try {
    const aiResponse = await aiService.generateText(prompt);
    const parsed = JSON.parse(aiResponse.replace(/```json/g, '').replace(/```/g, '').trim());

    const foodPlaces = (parsed.food || []).map(id => places.find(p => p.id === id)).filter(Boolean);
    const cafePlaces = (parsed.cafe || []).map(id => places.find(p => p.id === id)).filter(Boolean);

    return ok(res, {
      food: foodPlaces.length > 0 ? foodPlaces : places.filter(p => ['restaurant'].includes(p.category) || ['restaurant'].includes(p.category2)).slice(0, 4),
      cafe: cafePlaces.length > 0 ? cafePlaces : places.filter(p => ['cafe'].includes(p.category) || ['cafe'].includes(p.category2)).slice(0, 4),
    });
  } catch (err) {
    console.error('AI Recommendation failed, falling back:', err);
    return ok(res, {
      food: places.filter(p => ['restaurant'].includes(p.category) || ['restaurant'].includes(p.category2)).slice(0, 4),
      cafe: places.filter(p => ['cafe'].includes(p.category) || ['cafe'].includes(p.category2)).slice(0, 4),
    });
  }
});

exports.getWeeklyPlaces = asyncHandler(async (req, res) => {
  const allPlaces = isFirebaseReady() ? await placeModel.getAllPlaces() : MOCK_PLACES;
  
  if (allPlaces.length === 0) {
    return ok(res, { places: [] });
  }

  let history = getHistory();
  
  // If all places have been shown, reset history
  const allPlaceIds = allPlaces.map(p => p.id);
  const unshownPlaces = allPlaces.filter(p => !history.includes(p.id));
  
  let availablePlaces = unshownPlaces;
  if (availablePlaces.length < 4) {
    // Reset history if we don't have enough places for a full 4-item showcase
    history = [];
    availablePlaces = allPlaces;
  }

  // 1. Get Top Rated Places
  let topRatedPlaces = [];
  if (isFirebaseReady()) {
    const reviews = await reviewModel.getAllReviews();
    const ratings = {};
    reviews.forEach(r => {
      if (!ratings[r.placeId]) ratings[r.placeId] = { total: 0, count: 0 };
      ratings[r.placeId].total += r.rating;
      ratings[r.placeId].count += 1;
    });

    const rankedIds = Object.keys(ratings)
      .map(id => ({ id, avg: ratings[id].total / ratings[id].count, count: ratings[id].count }))
      .filter(x => x.avg >= 4.0 && x.count >= 1) // High rating threshold
      .sort((a, b) => b.avg - a.avg)
      .map(x => x.id);

    // Pick top rated that haven't been shown
    topRatedPlaces = rankedIds
      .filter(id => !history.includes(id))
      .map(id => availablePlaces.find(p => p.id === id))
      .filter(Boolean)
      .slice(0, 2); // Take up to 2 top-rated places
  }

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

  // Save to history
  const newHistory = [...history, ...selectedPlaces.map(p => p.id)];
  saveHistory(newHistory);

  return ok(res, { places: selectedPlaces });
});
