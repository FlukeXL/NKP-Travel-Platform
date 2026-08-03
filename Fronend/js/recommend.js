const MNX_CATEGORY_ENV = {
  cafe: 'indoor',
  restaurant: 'indoor',
  temple: 'outdoor',
  fitness: 'outdoor',
  nature: 'outdoor',
  landmark: 'outdoor',
  culture: 'both',
};

const MNX_CATEGORY_PACE = {
  cafe: 'comfort',
  restaurant: 'comfort',
  temple: 'comfort',
  culture: 'comfort',
  landmark: 'comfort',
  nature: 'both',
  fitness: 'adventure',
};

function mnxAgeBracketBoost(age) {
  if (age == null) return {};
  if (age < 25) return { cafe: 1.2, fitness: 1.15, landmark: 1.1 };
  if (age < 40) return { cafe: 1.1, restaurant: 1.1, nature: 1.1 };
  if (age < 60) return { culture: 1.15, temple: 1.1, restaurant: 1.05 };
  return { temple: 1.25, culture: 1.2, nature: 1.05 };
}

function mnxScorePlace(place, profile) {
  let score = window.MNX_REVIEWS?.stats(place.id)?.avg ?? 3;

  const interests = profile.interests || [];
  if (interests.includes(place.category)) score += 3;

  const env = MNX_CATEGORY_ENV[place.category] || 'both';
  if (profile.envPref && profile.envPref !== 'both') {
    if (env === profile.envPref || env === 'both') score += 1.5;
    else score -= 1;
  }

  const pace = MNX_CATEGORY_PACE[place.category] || 'both';
  if (profile.pacePref && profile.pacePref !== 'both') {
    if (pace === profile.pacePref || pace === 'both') score += 1.5;
    else score -= 1;
  }

  const age = window.MNX_AUTH?.calcAge ? window.MNX_AUTH.calcAge(profile.birthdate) : null;
  const ageBoost = mnxAgeBracketBoost(age)[place.category];
  if (ageBoost) score *= ageBoost;

  return score;
}

function mnxScorePlaceWithAi(place, aiProfile) {
  const rankIndex = aiProfile.recommendedCategories.indexOf(place.category);
  const categoryScore = rankIndex === -1 ? 0 : (aiProfile.recommendedCategories.length - rankIndex) * 10;
  return categoryScore + place.rating;
}

function mnxRealRating(place) {
  return window.MNX_REVIEWS?.stats(place.id)?.avg ?? 0;
}

function mnxGetRecommendedPlaces(profile, count = 4) {
  const places = window.MNX_PLACES || [];
  if (!profile) {
    return [...places].sort((a, b) => mnxRealRating(b) - mnxRealRating(a)).slice(0, count);
  }

  if (profile.aiProfile?.recommendedCategories?.length) {
    return [...places]
      .map((p) => ({ place: p, score: mnxScorePlaceWithAi(p, profile.aiProfile) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map((r) => r.place);
  }

  return [...places]
    .map((p) => ({ place: p, score: mnxScorePlace(p, profile) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((r) => r.place);
}

function mnxBuildRecommendReason(profile) {
  if (!profile) return 'สถานที่ที่ได้รับความนิยมและคะแนนสูงสุดในนครพนม';

  // Prefer Gemini's own personalized sentence + persona label when available.
  if (profile.aiProfile?.summaryTh) {
    const persona = profile.aiProfile.travelPersona ? `${profile.aiProfile.travelPersona} — ` : '';
    return `${persona}${profile.aiProfile.summaryTh}`;
  }

  const age = window.MNX_AUTH?.calcAge ? window.MNX_AUTH.calcAge(profile.birthdate) : null;
  const parts = [];
  if (age != null) parts.push(`อายุ ${age} ปี`);

  const interestLabels = {
    cafe: 'คาเฟ่', restaurant: 'ร้านอาหาร', temple: 'วัด/ศักดิ์สิทธิ์',
    nature: 'ธรรมชาติ', fitness: 'ออกกำลังกาย', culture: 'วัฒนธรรม', landmark: 'แลนด์มาร์ก',
  };
  const interestNames = (profile.interests || []).map((i) => interestLabels[i]).filter(Boolean);
  if (interestNames.length) parts.push(`ชอบ ${interestNames.join(', ')}`);

  const envLabels = { indoor: 'ในร่ม', outdoor: 'กลางแจ้ง' };
  if (profile.envPref && envLabels[profile.envPref]) parts.push(envLabels[profile.envPref]);

  const paceLabels = { comfort: 'สายชิล', adventure: 'สายผจญภัย' };
  if (profile.pacePref && paceLabels[profile.pacePref]) parts.push(paceLabels[profile.pacePref]);

  if (!parts.length) return 'สถานที่ที่ได้รับความนิยมและคะแนนสูงสุดในนครพนม';
  return `วิเคราะห์จากโปรไฟล์ของคุณ — ${parts.join(' · ')}`;
}

window.MNX_RECOMMEND = {
  getRecommendedPlaces: mnxGetRecommendedPlaces,
  buildReason: mnxBuildRecommendReason,
};
