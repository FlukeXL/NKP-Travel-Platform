const { isFirebaseReady } = require('../config/firebase');
const placeModel = require('../models/place.model');
const devStore = require('../utils/devStore');

const DEV_PLACES = 'places';

const SEED_PLACES = [
  { id: 'cafe-riverside-million-view', name: 'จิบกาแฟชิลๆ เติมพลังให้ชีวิต', category: 'cafe', img: '/assets/images/Blendy Boo.jpg', rating: 4.7, desc: 'จิบกาแฟพร้อมวิวแม่น้ำโขงและสะพานมิตรภาพ บรรยากาศชิลสไตล์โมเดิร์น', area: 'ริมโขง', price: '฿฿', lat: 17.4012, lng: 104.7822, popularity: 3600 },
  { id: 'wooden-road-cafe', name: 'บ้านไม้ริมทาง คาเฟ่', category: 'cafe', img: '/assets/images/places/cafe-2.jpg', rating: 4.5, desc: 'คาเฟ่บ้านไม้เก่าตกแต่งสไตล์วินเทจ เหมาะกับการถ่ายรูป', area: 'อำเภอเมือง', price: '฿฿', lat: 17.3985, lng: 104.7791, popularity: 2100 },
  { id: 'indochina-coffee-house', name: 'Indochina Coffee House', category: 'cafe', img: '/assets/images/places/cafe-3.jpg', rating: 4.6, desc: 'คาเฟ่กลิ่นอายอินโดจีน เมนูกาแฟคั่วเข้มเข้มข้น', area: 'ตลาดอินโดจีน', price: '฿฿฿', lat: 17.4003, lng: 104.7805, popularity: 2400 },
  { id: 'garden-cafe', name: 'สวนหย่อม การ์เดน คาเฟ่', category: 'cafe', img: '/assets/images/places/cafe-4.jpg', rating: 4.4, desc: 'ร้านกลางสวนบรรยากาศร่มรื่น เหมาะพักผ่อนวันหยุด', area: 'อำเภอเมือง', price: '฿฿', lat: 17.3958, lng: 104.7768, popularity: 1700 },
  { id: 'mekong-roastery', name: 'The Mekong Roastery', category: 'cafe', img: '/assets/images/places/cafe-5.jpg', rating: 4.8, desc: 'โรงคั่วกาแฟเฉพาะทาง คั่วสดใหม่ทุกวัน', area: 'ริมโขง', price: '฿฿฿', lat: 17.4028, lng: 104.7833, popularity: 2900 },
  { id: 'hidden-roadside-cafe', name: 'ร้านลับ ริมทาง คาเฟ่', category: 'cafe', img: '/assets/images/places/cafe-6.jpg', rating: 4.3, desc: 'ร้านเล็กบรรยากาศอบอุ่น เมนูของหวานทำสด', area: 'อำเภอธาตุพนม', price: '฿', lat: 16.9421, lng: 104.7162, popularity: 1200 },

  { id: 'nem-nueang-riverside', name: 'แหนมเนือง ริมโขง', category: 'restaurant', img: '/assets/images/places/restaurant-1.jpg', rating: 4.8, desc: 'สูตรต้นตำรับเวียดนามผสานวัตถุดิบท้องถิ่น รสชาติเป็นเอกลักษณ์ของนครพนม', area: 'ริมโขง', price: '฿฿', lat: 17.4019, lng: 104.7818, popularity: 4100 },
  { id: 'isan-mekong-cuisine', name: 'ตำรับอีสานลุ่มโขง', category: 'restaurant', img: '/assets/images/places/restaurant-2.jpg', rating: 4.6, desc: 'รวมเมนูพื้นถิ่นที่หารับประทานได้เฉพาะนครพนม จากภูมิปัญญาท้องถิ่น', area: 'อำเภอเมือง', price: '฿฿', lat: 17.3972, lng: 104.7784, popularity: 2300 },
  { id: 'indochina-night-market', name: 'ตลาดอินโดจีนยามค่ำ', category: 'restaurant', img: '/assets/images/places/restaurant-3.jpg', rating: 4.5, desc: 'แหล่งรวมของกิน ของฝาก และการแสดงวัฒนธรรมริมแม่น้ำโขง', area: 'ตลาดอินโดจีน', price: '฿', lat: 17.4005, lng: 104.7809, popularity: 4200 },
  { id: 'pa-kham-vietnamese-noodle', name: 'ก๋วยเตี๋ยวญวนป้าคำ', category: 'restaurant', img: '/assets/images/places/restaurant-4.jpg', rating: 4.7, desc: 'ก๋วยเตี๋ยวญวนสูตรโบราณ เสิร์ฟมากว่า 30 ปี', area: 'อำเภอเมือง', price: '฿', lat: 17.3949, lng: 104.7759, popularity: 2700 },
  { id: 'larb-pla-mekong', name: 'ร้านลาบปลาแม่น้ำโขง', category: 'restaurant', img: '/assets/images/places/restaurant-5.jpg', rating: 4.4, desc: 'ลาบปลาสดจากแม่น้ำโขง รสจัดจ้านต้นตำรับอีสาน', area: 'ริมโขง', price: '฿฿', lat: 17.4035, lng: 104.7841, popularity: 1900 },
  { id: 'raft-riverside-kitchen', name: 'ครัวเรือนแพ ริมน้ำ', category: 'restaurant', img: '/assets/images/places/restaurant-6.jpg', rating: 4.6, desc: 'ร้านอาหารบนแพ วิวแม่น้ำโขงยามพระอาทิตย์ตก', area: 'ริมโขง', price: '฿฿฿', lat: 17.4041, lng: 104.7848, popularity: 2200 },

  { id: 'that-phanom', name: 'พระธาตุพนม', category: 'temple', img: '/assets/images/places/temple-1.jpg', rating: 4.9, desc: 'ปูชนียสถานคู่บ้านคู่เมือง สถาปัตยกรรมล้านช้างอันงดงาม เป็นที่เคารพบูชาของชาวไทยและลาว', area: 'อำเภอธาตุพนม', price: 'ฟรี', lat: 16.9407, lng: 104.7148, popularity: 8900 },
  { id: 'wat-okat', name: 'วัดโอกาสศรีบัวบาน', category: 'temple', img: '/assets/images/places/temple-2.jpg', rating: 4.7, desc: 'วัดเก่าแก่ งานแกะสลักไม้ละเอียดสวยงาม', area: 'อำเภอเมือง', price: 'ฟรี', lat: 17.3991, lng: 104.7799, popularity: 2500 },
  { id: 'wat-phra-in-plaeng', name: 'วัดพระอินทร์แปลง', category: 'temple', img: '/assets/images/places/temple-3.jpg', rating: 4.6, desc: 'วัดสำคัญประจำเมือง มีพระพุทธรูปเก่าแก่', area: 'อำเภอเมือง', price: 'ฟรี', lat: 17.3964, lng: 104.7776, popularity: 2100 },
  { id: 'wat-mahathat', name: 'วัดมหาธาตุ', category: 'temple', img: '/assets/images/places/temple-4.jpg', rating: 4.5, desc: 'สถาปัตยกรรมผสมผสานล้านช้างและล้านนา', area: 'อำเภอเมือง', price: 'ฟรี', lat: 17.3948, lng: 104.7761, popularity: 1800 },
  { id: 'wat-si-chomphu', name: 'วัดศรีชมภูองค์ตื้อ', category: 'temple', img: '/assets/images/places/temple-5.jpg', rating: 4.6, desc: 'วัดริมโขง วิวสวยยามเช้าและยามเย็น', area: 'อำเภอท่าอุเทน', price: 'ฟรี', lat: 17.5769, lng: 104.6489, popularity: 1600 },

  { id: 'mekong-aerobic-park', name: 'ลานแอโรบิคริมโขง', category: 'fitness', img: '/assets/images/places/fitness-1.jpg', rating: 4.6, desc: 'กิจกรรมชุมชนยามเย็น เปิดให้ทุกคนเข้าร่วมได้ฟรี', area: 'ริมโขง', price: 'ฟรี', lat: 17.4015, lng: 104.7815, popularity: 2100 },
  { id: 'mekong-cycling-route', name: 'เส้นทางปั่นริมแม่น้ำโขง', category: 'fitness', img: '/assets/images/places/fitness-2.jpg', rating: 4.7, desc: 'เส้นทางปั่นวิวสวยที่สุดในนครพนม ระยะทางกว่า 15 กม.', area: 'ริมโขง', price: 'ฟรี', lat: 17.4048, lng: 104.7852, popularity: 3400 },
  { id: 'provincial-stadium', name: 'สนามกีฬากลางจังหวัด', category: 'fitness', img: '/assets/images/places/fitness-3.jpg', rating: 4.4, desc: 'สนามวิ่งและลานออกกำลังกายมาตรฐาน เปิดทุกวัน', area: 'อำเภอเมือง', price: 'ฟรี', lat: 17.3932, lng: 104.7745, popularity: 1500 },
  { id: 'phanom-trail-run', name: 'Phanom Trail Run', category: 'fitness', img: '/assets/images/places/fitness-4.jpg', rating: 4.5, desc: 'เส้นทางเทรลธรรมชาติ พร้อมวิวภูเขาและป่าไม้', area: 'อำเภอธาตุพนม', price: 'ฟรี', lat: 16.9438, lng: 104.7175, popularity: 1800 },
  { id: 'mekong-marathon', name: 'Nakhon Phanom Mekong Marathon', category: 'fitness', img: '/assets/images/fitness/mekong-marathon.jpg', rating: 4.7, desc: 'วิ่งเลียบริมโขง ระยะทาง 5K / 10K / 21K จัดขึ้นเป็นประจำทุกปีช่วงเดือนมกราคม', area: 'ริมโขง', price: 'ฟรี', lat: 17.4022, lng: 104.7825, popularity: 2600 },

  { id: 'mekong-riverside-sunset', name: 'ริมโขงยามเย็น', category: 'nature', img: '/assets/images/attractions/mekong-view.jpg', rating: 4.6, desc: 'ชมพระอาทิตย์ตกริมแม่น้ำโขง มองเห็นฝั่งลาวชัดเจน', area: 'ถนนสุนทรวิจิตร', price: 'ฟรี', lat: 17.4085, lng: 104.7797, popularity: 4700 },
  { id: 'friendship-bridge-3', name: 'สะพานมิตรภาพ 3', category: 'landmark', img: '/assets/images/attractions/friendship-bridge.jpg', rating: 4.5, desc: 'จุดเชื่อมโยงไทย-ลาว วิวสวยยามพระอาทิตย์ตก', area: 'อำเภอเมือง', price: 'ฟรี', lat: 17.3960, lng: 104.7930, popularity: 5200 },
  { id: 'renu-nakhon', name: 'เรณูนคร', category: 'culture', img: '/assets/images/attractions/renu-nakhon.jpg', rating: 4.4, desc: 'หมู่บ้านผู้ไทยดั้งเดิม ผ้าทอมือและวิถีชีวิตพื้นถิ่น', area: 'อำเภอเรณูนคร', price: 'ฟรี', lat: 16.9765, lng: 104.6110, popularity: 3100 },
  { id: 'lao-vietnamese-culture-trail', name: 'วิถีชุมชนลาว-เวียดนาม', category: 'culture', img: '/assets/images/culture/hor-kham-cultural.jpg', rating: 4.5, desc: 'เรียนรู้รากเหง้าวัฒนธรรมผสมผสานที่หล่อหลอมเป็นเอกลักษณ์นครพนม ผ่านเส้นทางวัฒนธรรม 6 เส้นทาง', area: 'อำเภอเมือง', price: 'ฟรี', lat: 17.3980, lng: 104.7790, popularity: 1500 },
  { id: 'ho-kaeo-museum', name: 'พิพิธภัณฑ์จวนผู้ว่าราชการจังหวัด (หอแก้ว)', category: 'culture', img: '/assets/images/culture/ho-kaeo-museum.jpg', rating: 4.5, desc: 'อาคารโบราณสถาปัตยกรรมโคโลเนียล จัดแสดงประวัติศาสตร์และวิถีชีวิตนครพนม', area: 'อำเภอเมือง', price: 'ฟรี', lat: 17.3978, lng: 104.7793, popularity: 1300 },
  { id: 'renu-nakhon-silk-weaving', name: 'หมู่บ้านทอผ้าไหมเรณูนคร', category: 'culture', img: '/assets/images/culture/renu-nakhon-silk.jpg', rating: 4.4, desc: 'ชมและเลือกซื้อผ้าทอมือลายโบราณจากชุมชนผู้ไทยดั้งเดิม', area: 'อำเภอเรณูนคร', price: 'ฟรี', lat: 16.9758, lng: 104.6098, popularity: 1100 },

  { id: 'city-pillar-shrine', name: 'ศาลหลักเมืองนครพนม', category: 'mutelu', img: '/assets/images/mutelu/city-pillar-shrine.jpg', rating: 4.7, desc: 'ศาลศักดิ์สิทธิ์คู่บ้านคู่เมือง นิยมมาขอพรเรื่องความมั่นคงในชีวิตและหน้าที่การงาน', area: 'อำเภอเมือง', price: 'ฟรี', lat: 17.3999, lng: 104.7796, popularity: 2800 },
  { id: 'nine-dragons-mekong-shrine', name: 'ศาลเจ้าแม่นาคี ริมโขงเก้ามังกร', category: 'mutelu', img: '/assets/images/mutelu/nine-dragons-shrine.jpg', rating: 4.6, desc: 'จุดขอพรเรื่องโชคลาภและการเดินทาง ตามความเชื่อพญานาคแห่งลุ่มแม่น้ำโขง', area: 'ริมโขง', price: 'ฟรี', lat: 17.4058, lng: 104.7861, popularity: 2000 },
  { id: 'that-phanom-fortune-corner', name: 'ลานเสี่ยงทายองค์พระธาตุพนม', category: 'mutelu', img: '/assets/images/mutelu/that-phanom-fortune.jpg', rating: 4.8, desc: 'จุดสักการะและเสี่ยงเซียมซีคู่พระธาตุพนม เชื่อกันว่าขอพรเรื่องใดก็สมหวัง', area: 'อำเภอธาตุพนม', price: 'ฟรี', lat: 16.9409, lng: 104.7151, popularity: 3300 },
  { id: 'indochina-fortune-teller-row', name: 'แถวร้านดูดวงตลาดอินโดจีน', category: 'mutelu', img: '/assets/images/mutelu/fortune-teller-row.jpg', rating: 4.3, desc: 'รวมหมอดูชื่อดังในตัวเมืองนครพนม ทั้งไพ่ยิปซี โหราศาสตร์ และลายมือ', area: 'ตลาดอินโดจีน', price: '฿', lat: 17.4001, lng: 104.7807, popularity: 1400 },

  { id: 'indochina-market-shopping', name: 'ตลาดอินโดจีน (ฝั่งช้อปปิ้ง)', category: 'shopping', img: '/assets/images/shopping/indochina-market-shopping.jpg', rating: 4.6, desc: 'แหล่งรวมสินค้าชายแดนไทย-ลาว-เวียดนาม ของกิน ของใช้ ราคาถูก', area: 'ตลาดอินโดจีน', price: '฿', lat: 17.4006, lng: 104.7811, popularity: 3800 },
  { id: 'nakhon-phanom-walking-street', name: 'ถนนคนเดินนครพนม', category: 'shopping', img: '/assets/images/shopping/walking-street.jpg', rating: 4.5, desc: 'ถนนคนเดินยามเย็นวันศุกร์-เสาร์ สินค้าแฮนด์เมด ของฝาก และสตรีทฟู้ด', area: 'ถนนสุนทรวิจิตร', price: '฿', lat: 17.4082, lng: 104.7801, popularity: 2600 },
  { id: 'renu-nakhon-otop-market', name: 'ตลาด OTOP เรณูนคร', category: 'shopping', img: '/assets/images/shopping/renu-otop-market.jpg', rating: 4.4, desc: 'ผ้าทอผู้ไทย เครื่องเงิน และสินค้าชุมชนขึ้นชื่อของจังหวัด', area: 'อำเภอเรณูนคร', price: '฿฿', lat: 16.9761, lng: 104.6102, popularity: 1700 },
  { id: 'central-plaza-nakhon-phanom', name: 'เซ็นทรัล นครพนม', category: 'shopping', img: '/assets/images/shopping/central-nakhon-phanom.jpg', rating: 4.5, desc: 'ห้างสรรพสินค้าใหญ่ครบครัน ร้านค้าแบรนด์เนม โรงหนัง และร้านอาหาร', area: 'อำเภอเมือง', price: '฿฿', lat: 17.4102, lng: 104.7723, popularity: 3900 },
];

async function seed() {
  let created = 0, skipped = 0;

  for (const place of SEED_PLACES) {
    const { id, ...data } = place;
    data.published = true;

    if (isFirebaseReady()) {
      const existing = await placeModel.getPlaceById(id);
      if (existing) { skipped++; continue; }
      await placeModel.createPlace(id, data);
      created++;
    } else {
      if (devStore.get(DEV_PLACES, id)) { skipped++; continue; }
      devStore.set(DEV_PLACES, id, { ...data, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      created++;
    }
  }

  console.log(`[seedPlaces] Done. Created: ${created}, skipped (already existed): ${skipped}.`);
  console.log(`[seedPlaces] Storage: ${isFirebaseReady() ? 'Firestore' : 'local devStore (Backend/.devdata/places.json)'}`);
}

seed().then(() => process.exit(0)).catch((err) => {
  console.error('[seedPlaces] Failed:', err);
  process.exit(1);
});
