const MNX_MAX_PLACE_PHOTOS = 10;

/** Builds a gallery of up to MAX_PLACE_PHOTOS images from a single
 * base filename (e.g. "cafe-1.jpg" -> cafe-1.jpg, cafe-1-2.jpg, ...
 * cafe-1-10.jpg) — used as a fallback only when a place has no real
 * `images[]` array of its own (legacy seed-data places). Missing
 * files just render broken silently via onerror handlers elsewhere;
 * this never blocks anything if fewer than 10 actually exist on disk. */
function mnxBuildGallery(baseImg) {
  const dot = baseImg.lastIndexOf('.');
  const stem = baseImg.slice(0, dot);
  const ext = baseImg.slice(dot);
  const gallery = [baseImg];
  for (let i = 2; i <= MNX_MAX_PLACE_PHOTOS; i++) gallery.push(`${stem}-${i}${ext}`);
  return gallery;
}

function mnxResolveUploadUrl(url) {
  if (!url) return '/assets/images/Blendy Boo.jpg';
  if (url.startsWith('/uploads/')) {
    const apiOrigin = window.MNX_API?.baseUrl.replace(/\/api\/?$/, '') || '';
    return `${apiOrigin}${url}`;
  }
  return url;
}

const MNX_PLACES_RAW = [
  /* ---- คาเฟ่ ---- */
  { id: 'cafe-riverside-million-view', name: 'จิบกาแฟชิลๆ เติมพลังให้ชีวิต', category: 'cafe', img: '/assets/images/Blendy Boo.jpg', rating: 4.7, desc: 'จิบกาแฟพร้อมวิวแม่น้ำโขงและสะพานมิตรภาพ บรรยากาศชิลสไตล์โมเดิร์น', area: 'ริมโขง', price: '฿฿', lat: 17.4012, lng: 104.7822 },
  { id: 'wooden-road-cafe', name: 'บ้านไม้ริมทาง คาเฟ่', category: 'cafe', img: '/assets/images/places/cafe-2.jpg', rating: 4.5, desc: 'คาเฟ่บ้านไม้เก่าตกแต่งสไตล์วินเทจ เหมาะกับการถ่ายรูป', area: 'อำเภอเมือง', price: '฿฿', lat: 17.3985, lng: 104.7791 },
  { id: 'indochina-coffee-house', name: 'Indochina Coffee House', category: 'cafe', img: '/assets/images/places/cafe-3.jpg', rating: 4.6, desc: 'คาเฟ่กลิ่นอายอินโดจีน เมนูกาแฟคั่วเข้มเข้มข้น', area: 'ตลาดอินโดจีน', price: '฿฿฿', lat: 17.4003, lng: 104.7805 },
  { id: 'garden-cafe', name: 'สวนหย่อม การ์เดน คาเฟ่', category: 'cafe', img: '/assets/images/places/cafe-4.jpg', rating: 4.4, desc: 'ร้านกลางสวนบรรยากาศร่มรื่น เหมาะพักผ่อนวันหยุด', area: 'อำเภอเมือง', price: '฿฿', lat: 17.3958, lng: 104.7768 },
  { id: 'mekong-roastery', name: 'The Mekong Roastery', category: 'cafe', img: '/assets/images/places/cafe-5.jpg', rating: 4.8, desc: 'โรงคั่วกาแฟเฉพาะทาง คั่วสดใหม่ทุกวัน', area: 'ริมโขง', price: '฿฿฿', lat: 17.4028, lng: 104.7833 },
  { id: 'hidden-roadside-cafe', name: 'ร้านลับ ริมทาง คาเฟ่', category: 'cafe', img: '/assets/images/places/cafe-6.jpg', rating: 4.3, desc: 'ร้านเล็กบรรยากาศอบอุ่น เมนูของหวานทำสด', area: 'อำเภอธาตุพนม', price: '฿', lat: 16.9421, lng: 104.7162 },

  /* ---- ร้านอาหาร (เชื่อมกับหน้าแรก Section 1: อาหารเวียดนาม/พื้นถิ่น/วัฒนธรรม) ---- */
  { id: 'nem-nueang-riverside', name: 'แหนมเนือง ริมโขง', category: 'restaurant', img: '/assets/images/places/restaurant-1.jpg', rating: 4.8, desc: 'สูตรต้นตำรับเวียดนามผสานวัตถุดิบท้องถิ่น รสชาติเป็นเอกลักษณ์ของนครพนม', area: 'ริมโขง', price: '฿฿', lat: 17.4019, lng: 104.7818 },
  { id: 'isan-mekong-cuisine', name: 'ตำรับอีสานลุ่มโขง', category: 'restaurant', img: '/assets/images/places/restaurant-2.jpg', rating: 4.6, desc: 'รวมเมนูพื้นถิ่นที่หารับประทานได้เฉพาะนครพนม จากภูมิปัญญาท้องถิ่น', area: 'อำเภอเมือง', price: '฿฿', lat: 17.3972, lng: 104.7784 },
  { id: 'indochina-night-market', name: 'ตลาดอินโดจีนยามค่ำ', category: 'restaurant', img: '/assets/images/places/restaurant-3.jpg', rating: 4.5, desc: 'แหล่งรวมของกิน ของฝาก และการแสดงวัฒนธรรมริมแม่น้ำโขง', area: 'ตลาดอินโดจีน', price: '฿', lat: 17.4005, lng: 104.7809 },
  { id: 'pa-kham-vietnamese-noodle', name: 'ก๋วยเตี๋ยวญวนป้าคำ', category: 'restaurant', img: '/assets/images/places/restaurant-4.jpg', rating: 4.7, desc: 'ก๋วยเตี๋ยวญวนสูตรโบราณ เสิร์ฟมากว่า 30 ปี', area: 'อำเภอเมือง', price: '฿', lat: 17.3949, lng: 104.7759 },
  { id: 'larb-pla-mekong', name: 'ร้านลาบปลาแม่น้ำโขง', category: 'restaurant', img: '/assets/images/places/restaurant-5.jpg', rating: 4.4, desc: 'ลาบปลาสดจากแม่น้ำโขง รสจัดจ้านต้นตำรับอีสาน', area: 'ริมโขง', price: '฿฿', lat: 17.4035, lng: 104.7841 },
  { id: 'raft-riverside-kitchen', name: 'ครัวเรือนแพ ริมน้ำ', category: 'restaurant', img: '/assets/images/places/restaurant-6.jpg', rating: 4.6, desc: 'ร้านอาหารบนแพ วิวแม่น้ำโขงยามพระอาทิตย์ตก', area: 'ริมโขง', price: '฿฿฿', lat: 17.4041, lng: 104.7848 },

  /* ---- วัดและสถานที่ศักดิ์สิทธิ์ ---- */
  { id: 'that-phanom', name: 'พระธาตุพนม', category: 'temple', img: '/assets/images/places/temple-1.jpg', rating: 4.9, desc: 'ปูชนียสถานคู่บ้านคู่เมือง สถาปัตยกรรมล้านช้างอันงดงาม เป็นที่เคารพบูชาของชาวไทยและลาว', area: 'อำเภอธาตุพนม', price: 'ฟรี', lat: 16.9407, lng: 104.7148 },
  { id: 'wat-okat', name: 'วัดโอกาสศรีบัวบาน', category: 'temple', img: '/assets/images/places/temple-2.jpg', rating: 4.7, desc: 'วัดเก่าแก่ งานแกะสลักไม้ละเอียดสวยงาม', area: 'อำเภอเมือง', price: 'ฟรี', lat: 17.3991, lng: 104.7799 },
  { id: 'wat-phra-in-plaeng', name: 'วัดพระอินทร์แปลง', category: 'temple', img: '/assets/images/places/temple-3.jpg', rating: 4.6, desc: 'วัดสำคัญประจำเมือง มีพระพุทธรูปเก่าแก่', area: 'อำเภอเมือง', price: 'ฟรี', lat: 17.3964, lng: 104.7776 },
  { id: 'wat-mahathat', name: 'วัดมหาธาตุ', category: 'temple', img: '/assets/images/places/temple-4.jpg', rating: 4.5, desc: 'สถาปัตยกรรมผสมผสานล้านช้างและล้านนา', area: 'อำเภอเมือง', price: 'ฟรี', lat: 17.3948, lng: 104.7761 },
  { id: 'wat-si-chomphu', name: 'วัดศรีชมภูองค์ตื้อ', category: 'temple', img: '/assets/images/places/temple-5.jpg', rating: 4.6, desc: 'วัดริมโขง วิวสวยยามเช้าและยามเย็น', area: 'อำเภอท่าอุเทน', price: 'ฟรี', lat: 17.5769, lng: 104.6489 },

  /* ---- สถานที่ออกกำลังกาย (เชื่อมกับหน้าแรก Section 4) ---- */
  { id: 'mekong-aerobic-park', name: 'ลานแอโรบิคริมโขง', category: 'fitness', img: '/assets/images/places/fitness-1.jpg', rating: 4.6, desc: 'กิจกรรมชุมชนยามเย็น เปิดให้ทุกคนเข้าร่วมได้ฟรี', area: 'ริมโขง', price: 'ฟรี', lat: 17.4015, lng: 104.7815 },
  { id: 'mekong-cycling-route', name: 'เส้นทางปั่นริมแม่น้ำโขง', category: 'fitness', img: '/assets/images/places/fitness-2.jpg', rating: 4.7, desc: 'เส้นทางปั่นวิวสวยที่สุดในนครพนม ระยะทางกว่า 15 กม.', area: 'ริมโขง', price: 'ฟรี', lat: 17.4048, lng: 104.7852 },
  { id: 'provincial-stadium', name: 'สนามกีฬากลางจังหวัด', category: 'fitness', img: '/assets/images/places/fitness-3.jpg', rating: 4.4, desc: 'สนามวิ่งและลานออกกำลังกายมาตรฐาน เปิดทุกวัน', area: 'อำเภอเมือง', price: 'ฟรี', lat: 17.3932, lng: 104.7745 },
  { id: 'phanom-trail-run', name: 'Phanom Trail Run', category: 'fitness', img: '/assets/images/places/fitness-4.jpg', rating: 4.5, desc: 'เส้นทางเทรลธรรมชาติ พร้อมวิวภูเขาและป่าไม้', area: 'อำเภอธาตุพนม', price: 'ฟรี', lat: 16.9438, lng: 104.7175 },
  { id: 'mekong-marathon', name: 'Nakhon Phanom Mekong Marathon', category: 'fitness', img: '/assets/images/fitness/mekong-marathon.jpg', rating: 4.7, desc: 'วิ่งเลียบริมโขง ระยะทาง 5K / 10K / 21K จัดขึ้นเป็นประจำทุกปีช่วงเดือนมกราคม', area: 'ริมโขง', price: 'ฟรี', lat: 17.4022, lng: 104.7825 },

  /* ---- ธรรมชาติ / แลนด์มาร์ก / วัฒนธรรม (เชื่อมกับหน้าแรก Section 2) ---- */
  { id: 'mekong-riverside-sunset', name: 'ริมโขงยามเย็น', category: 'nature', img: '/assets/images/attractions/mekong-view.jpg', rating: 4.6, desc: 'ชมพระอาทิตย์ตกริมแม่น้ำโขง มองเห็นฝั่งลาวชัดเจน', area: 'ถนนสุนทรวิจิตร', price: 'ฟรี', lat: 17.4085, lng: 104.7797 },
  { id: 'friendship-bridge-3', name: 'สะพานมิตรภาพ 3', category: 'landmark', img: '/assets/images/attractions/friendship-bridge.jpg', rating: 4.5, desc: 'จุดเชื่อมโยงไทย-ลาว วิวสวยยามพระอาทิตย์ตก', area: 'อำเภอเมือง', price: 'ฟรี', lat: 17.3960, lng: 104.7930 },
  { id: 'renu-nakhon', name: 'เรณูนคร', category: 'culture', img: '/assets/images/attractions/renu-nakhon.jpg', rating: 4.4, desc: 'หมู่บ้านผู้ไทยดั้งเดิม ผ้าทอมือและวิถีชีวิตพื้นถิ่น', area: 'อำเภอเรณูนคร', price: 'ฟรี', lat: 16.9765, lng: 104.6110 },
  { id: 'lao-vietnamese-culture-trail', name: 'วิถีชุมชนลาว-เวียดนาม', category: 'culture', img: '/assets/images/culture/hor-kham-cultural.jpg', rating: 4.5, desc: 'เรียนรู้รากเหง้าวัฒนธรรมผสมผสานที่หล่อหลอมเป็นเอกลักษณ์นครพนม ผ่านเส้นทางวัฒนธรรม 6 เส้นทาง', area: 'อำเภอเมือง', price: 'ฟรี', lat: 17.3980, lng: 104.7790 },
  { id: 'ho-kaeo-museum', name: 'พิพิธภัณฑ์จวนผู้ว่าราชการจังหวัด (หอแก้ว)', category: 'culture', img: '/assets/images/culture/ho-kaeo-museum.jpg', rating: 4.5, desc: 'อาคารโบราณสถาปัตยกรรมโคโลเนียล จัดแสดงประวัติศาสตร์และวิถีชีวิตนครพนม', area: 'อำเภอเมือง', price: 'ฟรี', lat: 17.3978, lng: 104.7793 },
  { id: 'renu-nakhon-silk-weaving', name: 'หมู่บ้านทอผ้าไหมเรณูนคร', category: 'culture', img: '/assets/images/culture/renu-nakhon-silk.jpg', rating: 4.4, desc: 'ชมและเลือกซื้อผ้าทอมือลายโบราณจากชุมชนผู้ไทยดั้งเดิม', area: 'อำเภอเรณูนคร', price: 'ฟรี', lat: 16.9758, lng: 104.6098 },

  /* ---- มูเตลู (สายบุญ/สายมู) — ศาลศักดิ์สิทธิ์ จุดขอพร ดูดวง เสริมสิริมงคล ---- */
  { id: 'city-pillar-shrine', name: 'ศาลหลักเมืองนครพนม', category: 'mutelu', img: '/assets/images/mutelu/city-pillar-shrine.jpg', rating: 4.7, desc: 'ศาลศักดิ์สิทธิ์คู่บ้านคู่เมือง นิยมมาขอพรเรื่องความมั่นคงในชีวิตและหน้าที่การงาน', area: 'อำเภอเมือง', price: 'ฟรี', lat: 17.3999, lng: 104.7796 },
  { id: 'nine-dragons-mekong-shrine', name: 'ศาลเจ้าแม่นาคี ริมโขงเก้ามังกร', category: 'mutelu', img: '/assets/images/mutelu/nine-dragons-shrine.jpg', rating: 4.6, desc: 'จุดขอพรเรื่องโชคลาภและการเดินทาง ตามความเชื่อพญานาคแห่งลุ่มแม่น้ำโขง', area: 'ริมโขง', price: 'ฟรี', lat: 17.4058, lng: 104.7861 },
  { id: 'that-phanom-fortune-corner', name: 'ลานเสี่ยงทายองค์พระธาตุพนม', category: 'mutelu', img: '/assets/images/mutelu/that-phanom-fortune.jpg', rating: 4.8, desc: 'จุดสักการะและเสี่ยงเซียมซีคู่พระธาตุพนม เชื่อกันว่าขอพรเรื่องใดก็สมหวัง', area: 'อำเภอธาตุพนม', price: 'ฟรี', lat: 16.9409, lng: 104.7151 },
  { id: 'indochina-fortune-teller-row', name: 'แถวร้านดูดวงตลาดอินโดจีน', category: 'mutelu', img: '/assets/images/mutelu/fortune-teller-row.jpg', rating: 4.3, desc: 'รวมหมอดูชื่อดังในตัวเมืองนครพนม ทั้งไพ่ยิปซี โหราศาสตร์ และลายมือ', area: 'ตลาดอินโดจีน', price: '฿', lat: 17.4001, lng: 104.7807 },

  /* ---- ช้อปปิ้ง — ตลาด ห้างสรรพสินค้า ของฝากขึ้นชื่อนครพนม ---- */
  { id: 'indochina-market-shopping', name: 'ตลาดอินโดจีน (ฝั่งช้อปปิ้ง)', category: 'shopping', img: '/assets/images/shopping/indochina-market-shopping.jpg', rating: 4.6, desc: 'แหล่งรวมสินค้าชายแดนไทย-ลาว-เวียดนาม ของกิน ของใช้ ราคาถูก', area: 'ตลาดอินโดจีน', price: '฿', lat: 17.4006, lng: 104.7811 },
  { id: 'nakhon-phanom-walking-street', name: 'ถนนคนเดินนครพนม', category: 'shopping', img: '/assets/images/shopping/walking-street.jpg', rating: 4.5, desc: 'ถนนคนเดินยามเย็นวันศุกร์-เสาร์ สินค้าแฮนด์เมด ของฝาก และสตรีทฟู้ด', area: 'ถนนสุนทรวิจิตร', price: '฿', lat: 17.4082, lng: 104.7801 },
  { id: 'renu-nakhon-otop-market', name: 'ตลาด OTOP เรณูนคร', category: 'shopping', img: '/assets/images/shopping/renu-otop-market.jpg', rating: 4.4, desc: 'ผ้าทอผู้ไทย เครื่องเงิน และสินค้าชุมชนขึ้นชื่อของจังหวัด', area: 'อำเภอเรณูนคร', price: '฿฿', lat: 16.9761, lng: 104.6102 },
  { id: 'central-plaza-nakhon-phanom', name: 'เซ็นทรัล นครพนม', category: 'shopping', img: '/assets/images/shopping/central-nakhon-phanom.jpg', rating: 4.5, desc: 'ห้างสรรพสินค้าใหญ่ครบครัน ร้านค้าแบรนด์เนม โรงหนัง และร้านอาหาร', area: 'อำเภอเมือง', price: '฿฿', lat: 17.4102, lng: 104.7723 },
];

const MNX_LIFESTYLE_CATEGORY_SOURCES = {
  cafe: ['cafe'],
  mutelu: ['mutelu'],
  shopping: ['shopping'],
  food: ['restaurant'],
  culture: ['culture'],
  nature: ['nature', 'landmark'],
};

function mnxGetPlacesByLifestyle(slug) {
  if (slug === 'all') return MNX_PLACES;
  const sourceCategories = MNX_LIFESTYLE_CATEGORY_SOURCES[slug];
  if (!sourceCategories) return [];
  return MNX_PLACES.filter((p) => sourceCategories.includes(p.category));
}

const MNX_PLACE_POPULARITY = {
  // คาเฟ่
  'cafe-riverside-million-view': 3600,
  'wooden-road-cafe': 2100,
  'indochina-coffee-house': 2400,
  'garden-cafe': 1700,
  'mekong-roastery': 2900,
  'hidden-roadside-cafe': 1200,
  // ร้านอาหาร (สายกิน)
  'nem-nueang-riverside': 4100,
  'isan-mekong-cuisine': 2300,
  'indochina-night-market': 4200,
  'pa-kham-vietnamese-noodle': 2700,
  'larb-pla-mekong': 1900,
  'raft-riverside-kitchen': 2200,
  // วัดและสถานที่ศักดิ์สิทธิ์
  'that-phanom': 8900,
  'wat-okat': 2500,
  'wat-phra-in-plaeng': 2100,
  'wat-mahathat': 1800,
  'wat-si-chomphu': 1600,
  // ออกกำลังกาย
  'mekong-aerobic-park': 2100,
  'mekong-cycling-route': 3400,
  'provincial-stadium': 1500,
  'phanom-trail-run': 1800,
  'mekong-marathon': 2600,
  // ธรรมชาติ / แลนด์มาร์ก / วัฒนธรรม
  'mekong-riverside-sunset': 4700,
  'friendship-bridge-3': 5200,
  'renu-nakhon': 3100,
  'lao-vietnamese-culture-trail': 1500,
  'ho-kaeo-museum': 1300,
  'renu-nakhon-silk-weaving': 1100,
  // มูเตลู
  'city-pillar-shrine': 2800,
  'nine-dragons-mekong-shrine': 2000,
  'that-phanom-fortune-corner': 3300,
  'indochina-fortune-teller-row': 1400,
  // ช้อปปิ้ง
  'indochina-market-shopping': 3800,
  'nakhon-phanom-walking-street': 2600,
  'renu-nakhon-otop-market': 1700,
  'central-plaza-nakhon-phanom': 3900,
};

function mnxGetMostPopularByLifestyle(slug, limit = 3) {
  return mnxGetPlacesByLifestyle(slug)
    .slice()
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    .slice(0, limit);
}

let MNX_PLACES = MNX_PLACES_RAW.map((p) => ({
  ...p,
  images: mnxBuildGallery(p.img),
  popularity: MNX_PLACE_POPULARITY[p.id] || 0,
}));
let MNX_PLACES_BY_ID = MNX_PLACES.reduce((acc, p) => { acc[p.id] = p; return acc; }, {});

function mnxGetPlace(id) {
  const p = MNX_PLACES.find((p) => p.id === id);
  if (p) return p;

  if (window.MNX_EVENTS) {
    const ev = window.MNX_EVENTS.find((e) => e.id === id);
    if (ev) {
      return {
        id: ev.id,
        name: ev.title,
        desc: ev.desc || 'ไม่มีคำอธิบาย',
        category: 'event',
        area: ev.location || 'นครพนม',
        price: ev.dates || (ev.startDate ? `เริ่ม: ${ev.startDate}` : 'ไม่มีกำหนดการ'),
        lat: 17.3948,
        lng: 104.7997,
        images: [mnxResolveUploadUrl(ev.banner) || '/assets/images/events/fire-boat-festival.jpg']
      };
    }
  }

  return null;
}

function mnxGetPlacesByCategory(category) {
  return MNX_PLACES.filter((p) => p.category === category);
}

async function mnxSyncPlacesFromApi() {
  if (!window.MNX_API) return;
  try {
    const data = await window.MNX_API.get('/places');
    if (!Array.isArray(data.places)) return;
    const fresh = data.places
      .filter((p) => p.published !== false)
      .map((p) => {
        const img = mnxResolveUploadUrl(p.img);
        const images = Array.isArray(p.images) && p.images.length
          ? p.images.map(mnxResolveUploadUrl)
          : mnxBuildGallery(img);
        return {
          ...p,
          img,
          images,
          rating: typeof p.rating === 'number' ? p.rating : 4.5,
          popularity: typeof p.popularity === 'number' ? p.popularity : 0,
        };
      });

    MNX_PLACES.length = 0;
    MNX_PLACES.push(...fresh);
    MNX_PLACES_BY_ID = MNX_PLACES.reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
    window.MNX_PLACES_BY_ID = MNX_PLACES_BY_ID;

    document.dispatchEvent(new CustomEvent('places:updated'));
  } catch (err) {
    console.error('[places-data.js] Failed to sync places from API, showing seed data instead:', err.message);
  }
}

window.MNX_PLACES = MNX_PLACES;
window.MNX_PLACES_BY_ID = MNX_PLACES_BY_ID;
window.mnxGetPlace = mnxGetPlace;
window.mnxGetPlacesByCategory = mnxGetPlacesByCategory;
window.mnxGetPlacesByLifestyle = mnxGetPlacesByLifestyle;
window.mnxGetMostPopularByLifestyle = mnxGetMostPopularByLifestyle;
window.MNX_LIFESTYLE_CATEGORY_SOURCES = MNX_LIFESTYLE_CATEGORY_SOURCES;
window.mnxSyncPlacesFromApi = mnxSyncPlacesFromApi;

document.addEventListener('includes:loaded', mnxSyncPlacesFromApi);
