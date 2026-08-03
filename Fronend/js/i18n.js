/* ============================================================
   MapNexus Internationalization (i18n) Engine — TH / EN
   Bilingual translation module supporting auto-DOM mapping,
   data-i18n attributes, placeholder updates, and state persistence.
   ============================================================ */

(function () {
  'use strict';

  const STORAGE_KEY = 'mnx_lang';

  // Translation Dictionaries
  const DICTIONARY = {
    TH: {
      // Navbar & Navigation
      'nav.home': 'หน้าหลัก',
      'nav.attractions': 'สถานที่ท่องเที่ยว',
      'nav.lifestyle': 'ไลฟ์สไตล์การเที่ยว',
      'nav.lifestyle_all': 'ไลฟ์สไตล์ทั้งหมด',
      'nav.cafe': 'คาเฟ่',
      'nav.mutelu': 'มูเตลู',
      'nav.shopping': 'ช้อปปิ้ง',
      'nav.food': 'สายกิน',
      'nav.culture': 'วัฒนธรรม',
      'nav.nature': 'ธรรมชาติและสิ่งแวดล้อม',
      'nav.environment': 'สภาพแวดล้อม',
      'nav.checkin': 'เช็คอิน',
      'nav.videos': 'วิดีโอรีวิว',
      'nav.about': 'เกี่ยวกับเรา',
      'nav.login': 'เข้าสู่ระบบ',
      'nav.register': 'สมัครสมาชิก',
      'nav.logout': 'ออกจากระบบ',
      'nav.profile': 'โปรไฟล์ของฉัน',
      'nav.admin': 'ระบบผู้ดูแล (Admin)',
      'nav.lang': 'ภาษา (Language)',

      // Infobar & Environment
      'infobar.pm25': 'PM2.5',
      'infobar.weather': 'อากาศ',
      'infobar.mekong': 'แม่น้ำโขง',
      'infobar.traffic': 'การจราจร',
      'infobar.aqi': 'คุณภาพอากาศ',
      'infobar.status_good': 'ดีมาก',
      'infobar.status_moderate': 'ปานกลาง',
      'infobar.status_unhealthy': 'เริ่มมีผลกระทบ',
      'infobar.status_flowing': 'คล่องตัว',
      'infobar.status_busy': 'หนาแน่น',
      'infobar.status_normal': 'ปกติ',

      // Common Actions
      'common.search': 'ค้นหา',
      'common.search_placeholder': 'ค้นหาสถานที่ท่องเที่ยว คาเฟ่ วัด หรือร้านอาหาร...',
      'common.view_all': 'ดูทั้งหมด',
      'common.view_details': 'ดูรายละเอียด',
      'common.get_directions': 'ขอเส้นทาง',
      'common.read_more': 'อ่านต่อ',
      'common.show_less': 'ย่อลง',
      'common.close': 'ปิด',
      'common.submit': 'ส่งข้อมูล',
      'common.cancel': 'ยกเลิก',
      'common.save': 'บันทึก',
      'common.favorite': 'ถูกใจ',
      'common.rating': 'คะแนนรีวิว',
      'common.all': 'ทั้งหมด',

      // About Us Page
      'about.badge': 'About MapNexus Platform',
      'about.hero_title': 'เกี่ยวกับเรา',
      'about.hero_desc': 'แพลตฟอร์มท่องเที่ยวไลฟ์สไตล์อัจฉริยะจังหวัดนครพนม ผสานมนต์เสน่ห์แห่งวัฒนธรรมลุ่มน้ำโขง เข้ากับนวัตกรรมเทคโนโลยีเพื่อยกระดับการเดินทางสู่ยุคดิจิทัล',
      'about.team_eyebrow': 'The Project Team',
      'about.team_title': 'ทีมนักศึกษาผู้จัดทำโครงการ',
      'about.team_sub': '4 พลังนักศึกษาผู้สร้างสรรค์และขับเคลื่อนแพลตฟอร์ม MapNexus สู่ความเป็นจริง',
      'about.dev1_name': 'นักศึกษาคนที่ 1',
      'about.dev1_role': 'ผู้พัฒนาเว็บ (Web Developer)',
      'about.dev1_desc': 'พัฒนาระบบสถาปัตยกรรมเว็บไซต์ ระบบ Backend สภาพแวดล้อมเรียลไทม์ และระบบบริหารจัดการฐานข้อมูล',
      'about.dev2_name': 'นักศึกษาคนที่ 2',
      'about.dev2_role': 'ผู้พัฒนาเว็บ (Web Developer)',
      'about.dev2_desc': 'ออกแบบและพัฒนาส่วนติดต่อผู้ใช้ (Frontend UI/UX) แอนิเมชัน AOS ระบบแผนที่ Leaflet และ AI Tour Guide',
      'about.dev3_name': 'นักศึกษาคนที่ 3',
      'about.dev3_role': 'นักหาข้อมูล (Data Researcher)',
      'about.dev3_desc': 'ลงพื้นที่สำรวจ รวบรวมข้อมูลสถานที่ท่องเที่ยว วัฒนธรรม ประเพณี และประวัติความเป็นมาของจังหวัดนครพนม',
      'about.dev4_name': 'นักศึกษาคนที่ 4',
      'about.dev4_role': 'นักหาข้อมูล (Data Researcher)',
      'about.dev4_desc': 'รวบรวมข้อมูลไลฟ์สไตล์ คาเฟ่ ร้านอาหาร จุดเช็คอิน พิกัด GPS แผนที่ และวิดีโอคอนเทนต์รีวิวสถานที่จริง',
      'about.advisors_eyebrow': 'Honorable Mentors',
      'about.advisors_title': 'อาจารย์ที่ปรึกษาโครงการ',
      'about.advisors_sub': 'ขอขอบพระคุณอาจารย์ผู้ทรงคุณวุฒิที่ได้ให้คำแนะนำ ชี้แนะแนวทาง และให้คำปรึกษาตลอดการพัฒนาโครงการ',
      'about.advisor1_badge': 'อาจารย์ที่ปรึกษาหลัก',
      'about.advisor1_name': 'อาจารย์ที่ปรึกษา 1',
      'about.advisor1_role': 'อาจารย์ที่ปรึกษาหลักโครงการ',
      'about.advisor1_dept': 'สาขาวิชาวิทยาการคอมพิวเตอร์ / เทคโนโลยีสารสนเทศ มหาวิทยาลัยนครพนม',
      'about.advisor2_badge': 'อาจารย์ที่ปรึกษาร่วม',
      'about.advisor2_name': 'อาจารย์ที่ปรึกษา 2',
      'about.advisor2_role': 'อาจารย์ที่ปรึกษาร่วมโครงการ',
      'about.advisor2_dept': 'สาขาวิชาวิทยาการคอมพิวเตอร์ / เทคโนโลยีสารสนเทศ มหาวิทยาลัยนครพนม',
      'about.story_eyebrow': 'The Origin & Vision',
      'about.story_title': 'เรื่องราวและที่มาของโครงการ',
      'about.story_lead': '"เปลี่ยนมุมมองการท่องเที่ยวนครพนม สู่ประสบการณ์อัจฉริยะที่เชื่อมโยงคุณเข้ากับทุกจังหวะชีวิตริมฝั่งโขง"',
      'about.logo_title': 'MAPNEXUS',
      'about.logo_sub': 'Nakhon Phanom Smart Tourism',
      'about.gallery_eyebrow': 'Moments & Behind The Scenes',
      'about.gallery_title': 'ภาพกิจกรรมและการทำงานของทีม',
      'about.gallery_sub': 'รวบรวมบรรยากาศการลงพื้นที่ การวางแผน และการพัฒนาระบบร่วมกันตลอดโครงการ',

      // AI Tour Guide
      'ai.tour_guide': 'AI Tour Guide — Planvis',
      'ai.fab': 'AI ผู้ช่วยนำเที่ยว',
      'ai.ask_placeholder': 'พิมพ์คำถามเกี่ยวกับการท่องเที่ยวนครพนม...',
      'ai.greeting': 'สวัสดีครับ! ผม Planvis ผู้ช่วย AI นำเที่ยวนครพนม มีอะไรให้ผมช่วยแนะนำสถานที่ท่องเที่ยว ร้านอาหาร คาเฟ่ หรือสภาพอากาศวันนี้ไหมครับ?',

      // Footer
      'footer.desc': 'แพลตฟอร์มท่องเที่ยวไลฟ์สไตล์จังหวัดนครพนม รวมพิกัดยอดฮิต สภาพแวดล้อมเรียลไทม์ และผู้ช่วย AI แนะนำการเดินทาง',
      'footer.quick_links': 'ลิงก์ด่วน',
      'footer.contact': 'ติดต่อเรา',
      'footer.rights': 'สงวนลิขสิทธิ์ทุกประการ',
    },

    EN: {
      // Navbar & Navigation
      'nav.home': 'Home',
      'nav.attractions': 'Attractions',
      'nav.lifestyle': 'Lifestyle',
      'nav.lifestyle_all': 'All Lifestyle',
      'nav.cafe': 'Cafes',
      'nav.mutelu': 'Sacred & Mutelu',
      'nav.shopping': 'Shopping',
      'nav.food': 'Food & Dining',
      'nav.culture': 'Culture',
      'nav.nature': 'Nature & Environment',
      'nav.environment': 'Environment',
      'nav.checkin': 'Check-in',
      'nav.videos': 'Video Reviews',
      'nav.about': 'About Us',
      'nav.login': 'Login',
      'nav.register': 'Sign Up',
      'nav.logout': 'Sign Out',
      'nav.profile': 'My Profile',
      'nav.admin': 'Admin Panel',
      'nav.lang': 'Language',

      // Infobar & Environment
      'infobar.pm25': 'PM2.5',
      'infobar.weather': 'Weather',
      'infobar.mekong': 'Mekong River',
      'infobar.traffic': 'Traffic',
      'infobar.aqi': 'Air Quality',
      'infobar.status_good': 'Good',
      'infobar.status_moderate': 'Moderate',
      'infobar.status_unhealthy': 'Unhealthy',
      'infobar.status_flowing': 'Smooth',
      'infobar.status_busy': 'Heavy',
      'infobar.status_normal': 'Normal',

      // Common Actions
      'common.search': 'Search',
      'common.search_placeholder': 'Search attractions, cafes, temples, or restaurants...',
      'common.view_all': 'View All',
      'common.view_details': 'View Details',
      'common.get_directions': 'Get Directions',
      'common.read_more': 'Read More',
      'common.show_less': 'Show Less',
      'common.close': 'Close',
      'common.submit': 'Submit',
      'common.cancel': 'Cancel',
      'common.save': 'Save',
      'common.favorite': 'Favorite',
      'common.rating': 'Rating',
      'common.all': 'All',

      // About Us Page
      'about.badge': 'About MapNexus Platform',
      'about.hero_title': 'About Us',
      'about.hero_desc': 'Smart lifestyle travel platform for Nakhon Phanom, blending the charm of Mekong culture with modern technology to elevate travel in the digital era.',
      'about.team_eyebrow': 'The Project Team',
      'about.team_title': 'Student Project Team',
      'about.team_sub': '4 passionate students building and driving the MapNexus platform.',
      'about.dev1_name': 'Student 01',
      'about.dev1_role': 'Web Developer (Full-Stack & System)',
      'about.dev1_desc': 'Architecting web systems, real-time environmental backend APIs, and database management.',
      'about.dev2_name': 'Student 02',
      'about.dev2_role': 'Web Developer (Frontend & UI/UX)',
      'about.dev2_desc': 'Designing and building Frontend UI/UX, AOS animations, Leaflet interactive maps, and AI Tour Guide.',
      'about.dev3_name': 'Student 03',
      'about.dev3_role': 'Data Researcher (Field & Cultural Data)',
      'about.dev3_desc': 'Field surveying, gathering cultural attraction data, traditions, and historical insights of Nakhon Phanom.',
      'about.dev4_name': 'Student 04',
      'about.dev4_role': 'Data Researcher (Lifestyle & Media Content)',
      'about.dev4_desc': 'Curating lifestyle cafes, restaurants, check-in spots, GPS coordinates, and real video review media.',
      'about.advisors_eyebrow': 'Honorable Mentors',
      'about.advisors_title': 'Project Advisors',
      'about.advisors_sub': 'Special thanks to our advisors for their guidance, mentorship, and invaluable feedback throughout the project.',
      'about.advisor1_badge': 'Principal Advisor',
      'about.advisor1_name': 'Advisor 1',
      'about.advisor1_role': 'Principal Project Advisor',
      'about.advisor1_dept': 'Dept. of Computer Science & IT, Nakhon Phanom University',
      'about.advisor2_badge': 'Co-Advisor',
      'about.advisor2_name': 'Advisor 2',
      'about.advisor2_role': 'Co-Advisor Project Mentor',
      'about.advisor2_dept': 'Dept. of Computer Science & IT, Nakhon Phanom University',
      'about.story_eyebrow': 'The Origin & Vision',
      'about.story_title': 'Origin & Story of the Project',
      'about.story_lead': '"Transforming how you experience Nakhon Phanom into an intelligent journey connected with the Mekong vibe."',
      'about.logo_title': 'MAPNEXUS',
      'about.logo_sub': 'Nakhon Phanom Smart Tourism',
      'about.gallery_eyebrow': 'Moments & Behind The Scenes',
      'about.gallery_title': 'Team Activities & Behind The Scenes',
      'about.gallery_sub': 'A snapshot of field research, planning meetings, and system development moments.',

      // AI Tour Guide
      'ai.tour_guide': 'AI Tour Guide — Planvis',
      'ai.fab': 'AI Tour Guide',
      'ai.ask_placeholder': 'Ask anything about traveling in Nakhon Phanom...',
      'ai.greeting': 'Hello! I am Planvis, your AI Tour Guide for Nakhon Phanom. How can I help you find attractions, cafes, restaurants, or weather updates today?',

      // Footer
      'footer.desc': 'Nakhon Phanom lifestyle travel platform with popular attractions, real-time environment metrics, and AI tour guidance.',
      'footer.quick_links': 'Quick Links',
      'footer.contact': 'Contact Us',
      'footer.rights': 'All Rights Reserved',
    }
  };

  // Direct Text Mapping for instant bidirectional DOM translation
  const PHRASE_MAP = [
    { th: 'หน้าหลัก', en: 'Home' },
    { th: 'สถานที่ท่องเที่ยว', en: 'Attractions' },
    { th: 'ไลฟ์สไตล์การเที่ยว', en: 'Lifestyle' },
    { th: 'ไลฟ์สไตล์ทั้งหมด', en: 'All Lifestyle' },
    { th: 'สภาพแวดล้อม', en: 'Environment' },
    { th: 'เช็คอิน', en: 'Check-in' },
    { th: 'วิดีโอรีวิว', en: 'Video Reviews' },
    { th: 'เกี่ยวกับเรา', en: 'About Us' },
    { th: 'เข้าสู่ระบบ', en: 'Login' },
    { th: 'สมัครสมาชิก', en: 'Sign Up' },
    { th: 'ออกจากระบบ', en: 'Sign Out' },
    { th: 'โปรไฟล์ของฉัน', en: 'My Profile' },
    { th: 'ระบบผู้ดูแล (Admin)', en: 'Admin Panel' },
    { th: 'คาเฟ่', en: 'Cafes' },
    { th: 'มูเตลู', en: 'Mutelu' },
    { th: 'ช้อปปิ้ง', en: 'Shopping' },
    { th: 'สายกิน', en: 'Food & Dining' },
    { th: 'วัฒนธรรม', en: 'Culture' },
    { th: 'ธรรมชาติและสิ่งแวดล้อม', en: 'Nature & Outdoors' },
    { th: 'แผนที่นำทาง', en: 'Map Navigation' },
    { th: 'วัดและสถานที่ศักดิ์สิทธิ์', en: 'Temples & Sacred Sites' },
    { th: 'สถานที่ออกกำลังกาย', en: 'Fitness & Recreation' },
    { th: 'ขอเส้นทาง', en: 'Get Directions' },
    { th: 'ดูรายละเอียด', en: 'View Details' },
    { th: 'ดูทั้งหมด', en: 'View All' },
    { th: 'อ่านต่อ', en: 'Read More' },
    { th: 'ย่อลง', en: 'Show Less' },
    { th: 'ปิด', en: 'Close' },
    { th: 'ส่งข้อมูล', en: 'Submit' },
    { th: 'ยกเลิก', en: 'Cancel' },
    { th: 'อากาศ', en: 'Weather' },
    { th: 'แม่น้ำโขง', en: 'Mekong River' },
    { th: 'การจราจร', en: 'Traffic' },
    { th: 'คุณภาพอากาศ', en: 'Air Quality' },
    { th: 'ดีมาก', en: 'Good' },
    { th: 'ปานกลาง', en: 'Moderate' },
    { th: 'เริ่มมีผลกระทบ', en: 'Unhealthy' },
    { th: 'คล่องตัว', en: 'Smooth' },
    { th: 'หนาแน่น', en: 'Heavy' },
    { th: 'ปกติ', en: 'Normal' },
    { th: 'ทีมนักศึกษาผู้จัดทำโครงการ', en: 'Student Project Team' },
    { th: 'ผู้พัฒนาเว็บ (Web Developer)', en: 'Web Developer' },
    { th: 'นักหาข้อมูล (Data Researcher)', en: 'Data Researcher' },
    { th: 'อาจารย์ที่ปรึกษาโครงการ', en: 'Project Advisors' },
    { th: 'อาจารย์ที่ปรึกษาหลัก', en: 'Principal Advisor' },
    { th: 'อาจารย์ที่ปรึกษาร่วม', en: 'Co-Advisor' },
    { th: 'เรื่องราวและที่มาของโครงการ', en: 'Project Origin & Story' },
    { th: 'ภาพกิจกรรมและการทำงานของทีม', en: 'Team Activities & Behind The Scenes' },
    { th: 'วางแผนและสถาปัตยกรรม', en: 'Project Architecture' },
    { th: 'สำรวจพิกัดจริง', en: 'Field Survey' },
    { th: 'ปรึกษาอาจารย์', en: 'Advisor Consultation' },
    { th: 'ทดสอบระบบและ AI', en: 'System & AI Testing' },
    { th: 'ความสำเร็จของทีม', en: 'Project Showcase' },
    { th: 'ลิงก์ด่วน', en: 'Quick Links' },
    { th: 'ติดต่อเรา', en: 'Contact Us' },
    { th: 'ค้นหาสถานที่ท่องเที่ยว...', en: 'Search attractions...' },
    { th: 'ค้นหาสถานที่ท่องเที่ยว คาเฟ่ วัด หรือร้านอาหาร...', en: 'Search attractions, cafes, temples, or restaurants...' },
  ];

  function getLang() {
    return (localStorage.getItem(STORAGE_KEY) || 'TH').toUpperCase();
  }

  function t(key, defaultVal = '') {
    const lang = getLang();
    const dict = DICTIONARY[lang] || DICTIONARY.TH;
    return dict[key] || defaultVal || key;
  }

  function updateButtonUI(lang) {
    const isTH = lang === 'TH';
    document.documentElement.lang = isTH ? 'th' : 'en';

    // Desktop navbar button
    const btn = document.getElementById('lang-switch');
    if (btn) {
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="15" height="15">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9s1.3-6.4 3.8-9Z" />
        </svg>
        <span class="mnx-lang-opt ${isTH ? 'is-active text-gold' : 'text-muted'}" style="${isTH ? 'font-weight:700;' : 'opacity:0.6;'}">TH</span>
        <span style="opacity:0.35;">/</span>
        <span class="mnx-lang-opt ${!isTH ? 'is-active text-gold' : 'text-muted'}" style="${!isTH ? 'font-weight:700;' : 'opacity:0.6;'}">EN</span>
      `;
    }

    // Mobile shell language label
    const mobileLabel = document.getElementById('mnx-m-lang-label');
    if (mobileLabel) {
      mobileLabel.innerHTML = `
        <span class="${isTH ? 'text-gold' : 'text-muted'}" style="${isTH ? 'font-weight:700;' : 'opacity:0.6;'}">TH</span>
        <span style="opacity:0.4;">/</span>
        <span class="${!isTH ? 'text-gold' : 'text-muted'}" style="${!isTH ? 'font-weight:700;' : 'opacity:0.6;'}">EN</span>
      `;
    }
  }

  function translateDom(lang) {
    const isEN = lang === 'EN';

    // 1. Exact data-i18n attributes
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const val = t(key);
      if (val) el.textContent = val;
    });

    // 2. data-i18n-placeholder attributes
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      const val = t(key);
      if (val) el.placeholder = val;
    });

    // 3. Smart DOM text node mapper (traverses static text nodes)
    const elementsToTranslate = document.querySelectorAll(
      'nav a, nav button, .quick-jump__link, .section-title, .eyebrow, .section-sub, .page-hero__subtitle, .advisor-badge, .dev-role-badge, .gallery-item__tag, .btn, .mnx-m-dropdown__item, .footer__col-title, .footer__desc, .footer__copy p, .logo-card__subtitle'
    );

    elementsToTranslate.forEach((el) => {
      // Avoid translating elements that have child elements with data-i18n
      if (el.children.length > 2) return;

      const currentText = el.textContent.trim();
      for (const pair of PHRASE_MAP) {
        if (isEN) {
          if (currentText === pair.th) {
            el.textContent = pair.en;
            break;
          }
        } else {
          if (currentText === pair.en) {
            el.textContent = pair.th;
            break;
          }
        }
      }
    });

    // Translate common inputs
    document.querySelectorAll('input[type="search"], input[type="text"]').forEach((inp) => {
      const ph = inp.placeholder.trim();
      for (const pair of PHRASE_MAP) {
        if (isEN && ph === pair.th) {
          inp.placeholder = pair.en;
          break;
        } else if (!isEN && ph === pair.en) {
          inp.placeholder = pair.th;
          break;
        }
      }
    });
  }

  function setLang(newLang) {
    const lang = (newLang || 'TH').toUpperCase();
    localStorage.setItem(STORAGE_KEY, lang);
    updateButtonUI(lang);
    translateDom(lang);
    document.dispatchEvent(new CustomEvent('lang:changed', { detail: { lang } }));
  }

  function toggleLang() {
    const current = getLang();
    const next = current === 'TH' ? 'EN' : 'TH';
    setLang(next);
  }

  function init() {
    const initialLang = getLang();
    updateButtonUI(initialLang);
    translateDom(initialLang);

    // Desktop Click Listener
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('#lang-switch') || e.target.closest('#mnx-m-lang-switch');
      if (btn) {
        e.preventDefault();
        toggleLang();
      }
    });

    // Re-apply on includes or content updates
    document.addEventListener('includes:loaded', () => {
      const current = getLang();
      updateButtonUI(current);
      translateDom(current);
    });

    document.addEventListener('app:content-updated', () => {
      translateDom(getLang());
    });
  }

  // Public API
  window.MNX_I18N = {
    getLang,
    setLang,
    toggleLang,
    t,
    init,
    translateDom
  };

  // Run on script parse or DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
