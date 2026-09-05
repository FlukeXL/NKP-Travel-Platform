(function () {
  'use strict';

  const STORAGE_KEY = 'mnx_lang';

  // Translation Dictionaries (Key-based)
  const DICTIONARY = {
    TH: {
      // Navbar & Navigation
      'nav.home': 'หน้าหลัก',
      'nav.attractions': 'ที่เที่ยว',
      'nav.lifestyle': 'ไลฟ์สไตล์',
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
      'nav.contact_ad': 'ติดต่อโฆษณา',
      'nav.login': 'เข้าสู่ระบบ',
      'nav.register': 'สมัครสมาชิก',
      'nav.logout': 'ออกจากระบบ',
      'nav.profile': 'โปรไฟล์ของฉัน',
      'nav.admin': 'ระบบผู้ดูแล (Admin)',
      'nav.lang': 'ภาษา (Language)',
      'ad.sponsored': 'พื้นที่ประชาสัมพันธ์',
      'ad.contact': 'ติดต่อโฆษณา',
      'ad.contact_cta': 'สนใจลงโฆษณา / ประชาสัมพันธ์ ติดต่อเรา',

      // Infobar & Environment
      'infobar.pm25': 'PM2.5',
      'infobar.weather': 'สภาพอากาศ',
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
      'about.badge': 'About Nakhon Phanom Lifestyle Travel Platform',
      'about.hero_title': 'เกี่ยวกับเรา',
      'about.hero_desc': 'แพลตฟอร์มท่องเที่ยวไลฟ์สไตล์อัจฉริยะจังหวัดนครพนม ผสานมนต์เสน่ห์แห่งวัฒนธรรมลุ่มน้ำโขง เข้ากับนวัตกรรมเทคโนโลยีเพื่อยกระดับการเดินทางสู่ยุคดิจิทัล',
      'about.team_eyebrow': 'The Project Team',
      'about.team_title': 'ทีมนักศึกษาผู้จัดทำโครงการ',
      'about.team_sub': '4 พลังนักศึกษาผู้สร้างสรรค์และขับเคลื่อนแพลตฟอร์ม Nakhon Phanom Lifestyle Travel Platform สู่ความเป็นจริง',
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
      'about.logo_title': 'NAKHON PHANOM',
      'about.logo_sub': 'Lifestyle Travel Platform',
      'about.gallery_eyebrow': 'Moments & Behind The Scenes',
      'about.gallery_title': 'ภาพกิจกรรมและการทำงานของทีม',
      'about.gallery_sub': 'รวบรวมบรรยากาศการลงพื้นที่ การวางแผน และการพัฒนาระบบร่วมกันตลอดโครงการ',

      // AI Tour Guide
      'ai.tour_guide': 'AI Tour Guide — Planvis',
      'ai.fab': 'AI ผู้ช่วยนำเที่ยว',
      'ai.ask_placeholder': 'พิมพ์คำถามเกี่ยวกับการท่องเที่ยวนครพนม...',
      'ai.greeting': 'สวัสดีครับ! ผม Planvis ผู้ช่วย AI นำเที่ยวนครพนม มีอะไรให้ผมช่วยแนะนำสถานที่ท่องเที่ยว ร้านอาหาร คาเฟ่ หรือสภาพอากาศวันนี้ไหมครับ?',

      // Footer & Shared Blocks
      'footer.tagline': 'เที่ยวนครพนม ในสไตล์ที่เป็นคุณ',
      'footer.follow_us': 'ช่องทางการติดตาม',
      'footer.explore': 'สำรวจ',
      'footer.realtime': 'ข้อมูลเรียลไทม์',
      'footer.weather': 'พยากรณ์อากาศ',
      'footer.pm25': 'สภาพแวดล้อม PM2.5',
      'footer.mekong': 'แม่น้ำโขง',
      'footer.traffic': 'จราจร',
      'footer.account': 'บัญชีผู้ใช้',
      'footer.profile': 'โปรไฟล์ของฉัน',
      'footer.contact': 'ติดต่อเรา',
      'footer.contact_link': 'แจ้งปัญหา / ติดต่อโฆษณา',
      'footer.privacy': 'นโยบายความเป็นส่วนตัว',
      'footer.terms': 'ข้อกำหนดการใช้งาน',

      // Contact page
      'contact.tag': 'ติดต่อเรา',
      'contact.title': 'แจ้งปัญหา / ติดต่อเรา',
      'contact.desc': 'หากพบปัญหาการใช้งานเว็บไซต์ มีข้อเสนอแนะ แนะนำสถานที่ท่องเที่ยวใหม่ หรือต้องการติดต่อประสานงาน/ลงโฆษณา สามารถติดต่อเราได้ผ่านแบบฟอร์มด้านล่าง',
      'contact.info_title': 'ช่องทางการติดต่อ',
      'contact.email_label': 'อีเมลติดต่อ',
      'contact.location_label': 'ที่ตั้งโครงการ',
      'contact.location_val': 'มหาวิทยาลัยนครพนม<br />Nakhon Phanom, Thailand',
      'contact.hours_label': 'เวลาทำการ',
      'contact.hours_val': 'จันทร์ - ศุกร์ : 08:30 - 16:30 น.',
      'contact.form_title': 'ส่งข้อความถึงเรา',
      'contact.form_name': 'ชื่อ - นามสกุล *',
      'contact.form_email': 'อีเมลติดต่อกลับ *',
      'contact.form_topic': 'หัวข้อที่ต้องการติดต่อ *',
      'contact.form_msg': 'รายละเอียดข้อความ *',
      'contact.form_submit': 'ส่งข้อความ',
      'contact.success_msg': '✓ ส่งข้อความเรียบร้อยแล้ว ทีมงานจะดำเนินการตรวจสอบและติดต่อกลับโดยเร็วที่สุด',

      // Profile
      'profile.joined_date': 'สมัครสมาชิก',
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
      'nav.environment': 'Weather',
      'nav.checkin': 'Check-in',
      'nav.videos': 'Video Reviews',
      'nav.about': 'About Us',
      'nav.contact_ad': 'Advertise With Us',
      'nav.login': 'Login',
      'nav.register': 'Sign Up',
      'nav.logout': 'Sign Out',
      'nav.profile': 'My Profile',
      'nav.admin': 'Admin Panel',
      'nav.lang': 'Language',
      'ad.sponsored': 'Sponsored',
      'ad.contact': 'Contact for Ads',
      'ad.contact_cta': 'Advertise With Us / Contact Us',

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
      'about.badge': 'About Nakhon Phanom Lifestyle Travel Platform',
      'about.hero_title': 'About Us',
      'about.hero_desc': 'Smart lifestyle travel platform for Nakhon Phanom, blending the charm of Mekong culture with modern technology to elevate travel in the digital era.',
      'about.team_eyebrow': 'The Project Team',
      'about.team_title': 'Student Project Team',
      'about.team_sub': '4 passionate students building and driving the Nakhon Phanom Lifestyle Travel Platform.',
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
      'about.logo_title': 'NAKHON PHANOM',
      'about.logo_sub': 'Lifestyle Travel Platform',
      'about.gallery_eyebrow': 'Moments & Behind The Scenes',
      'about.gallery_title': 'Team Activities & Behind The Scenes',
      'about.gallery_sub': 'A snapshot of field research, planning meetings, and system development moments.',

      // AI Tour Guide
      'ai.tour_guide': 'AI Tour Guide — Planvis',
      'ai.fab': 'AI Tour Guide',
      'ai.ask_placeholder': 'Ask anything about traveling in Nakhon Phanom...',
      'ai.greeting': 'Hello! I am Planvis, your AI Tour Guide for Nakhon Phanom. How can I help you find attractions, cafes, restaurants, or weather updates today?',

      // Footer & Shared Blocks
      'footer.tagline': 'Experience Nakhon Phanom in your unique style',
      'footer.follow_us': 'Follow Us',
      'footer.explore': 'Explore',
      'footer.realtime': 'Real-Time Insights',
      'footer.weather': 'Weather',
      'footer.pm25': 'PM2.5 Environment',
      'footer.mekong': 'Mekong River',
      'footer.traffic': 'Traffic',
      'footer.account': 'Account',
      'footer.profile': 'My Profile',
      'footer.contact': 'Contact Us',
      'footer.contact_link': 'Report Issue / Advertising',
      'footer.privacy': 'Privacy Policy',
      'footer.terms': 'Terms of Service',

      // Contact page
      'contact.tag': 'Contact Us',
      'contact.title': 'Report Issue / Contact Us',
      'contact.desc': 'If you encounter any issues on our website, have suggestions, want to recommend new places, or would like to partner/advertise with us, please reach out via the form below.',
      'contact.info_title': 'Contact Channels',
      'contact.email_label': 'Contact Email',
      'contact.location_label': 'Project Location',
      'contact.location_val': 'Nakhon Phanom University<br />Nakhon Phanom, Thailand',
      'contact.hours_label': 'Office Hours',
      'contact.hours_val': 'Monday - Friday : 08:30 - 16:30',
      'contact.form_title': 'Send Us a Message',
      'contact.form_name': 'Full Name *',
      'contact.form_email': 'Your Email *',
      'contact.form_topic': 'Inquiry Topic *',
      'contact.form_msg': 'Message Details *',
      'contact.form_submit': 'Send Message',
      'contact.success_msg': '✓ Message sent successfully! Our team will review and get back to you shortly.',

      // Profile
      'profile.joined_date': 'Member Since',
    }
  };

  // Comprehensive Phrase Matrix for whole-page text node translation
  const RAW_PHRASES = [
    // Branding & Taglines
    { th: 'เที่ยวนครพนม ในสไตล์ที่เป็นคุณ', en: 'Experience Nakhon Phanom in your unique style' },
    { th: 'ช่องทางการติดตาม', en: 'Follow Us' },
    { th: 'สัมผัสเสน่ห์ริมโขง วัฒนธรรมล้านช้าง และไลฟ์สไตล์การเที่ยวที่เป็นคุณ', en: 'Experience the charm of the Mekong, Lan Xang heritage, and customized travel lifestyle' },
    { th: 'เปลี่ยนมุมมองการท่องเที่ยวนครพนม สู่ประสบการณ์อัจฉริยะที่เชื่อมโยงคุณเข้ากับทุกจังหวะชีวิตริมฝั่งโขง', en: 'Transforming how you experience Nakhon Phanom into an intelligent journey connected with the Mekong vibe' },
    { th: 'ยินดีต้อนรับสู่ประสบการณ์การท่องเที่ยวเหนือระดับ', en: 'Welcome to an extraordinary travel experience' },

    // About Us Page Phrases
    { th: '100+ จุดเช็คอิน & คาเฟ่', en: '100+ Check-in Spots & Cafes' },
    { th: 'Real-time สภาพแวดล้อม IoT', en: 'Real-time IoT Environment' },
    { th: 'AI Planvis ผู้ช่วยวางแผน', en: 'AI Planvis Smart Planner' },
    { th: 'เพื่อชุมชน ท้องถิ่นนครพนม', en: 'For Nakhon Phanom Communities' },
    { th: '4 เสาหลักนวัตกรรมของแพลตฟอร์ม', en: '4 Core Platform Innovations' },
    { th: 'เทคโนโลยีและแนวคิดที่ถูกออกแบบมาเพื่อยกระดับการเดินทางท่องเที่ยวในจังหวัดนครพนม', en: 'Technologies and principles designed to elevate tourism in Nakhon Phanom' },
    { th: 'วิถีวัฒนธรรม & สายมู', en: 'Cultural Heritage & Sacred Pilgrimage' },
    { th: 'รวบรวมเส้นทางไหว้พระธาตุประจำวันเกิด วัดสำคัญริมฝั่งโขง และเรื่องราวความเชื่อท้องถิ่นอย่างลึกซึ้ง', en: 'Comprehensive birthday relic shrine trails, riverside temples, and deep spiritual insights' },
    { th: 'ข้อมูลสิ่งแวดล้อมเรียลไทม์', en: 'Real-Time Environmental Metrics' },
    { th: 'รายงานค่าฝุ่น PM2.5 สภาพอากาศ อุณหภูมิ ระดับน้ำโขง และสภาพจราจรสดแบบนาทีต่อนาที', en: 'Live minute-by-minute updates of PM2.5, weather, temperature, Mekong level, and traffic' },
    { th: 'AI Tour Guide อัจฉริยะ', en: 'Intelligent AI Tour Guide' },
    { th: 'ผู้ช่วยส่วนตัว AI (Planvis) คอยแนะนำทริป ตอบคำถาม และจัดตารางการเดินทางที่เหมาะสมกับคุณ', en: 'Planvis AI concierge providing trip ideas, answering questions, and scheduling custom itineraries' },
    { th: 'ขับเคลื่อนเศรษฐกิจชุมชน', en: 'Empowering Local Economy' },
    { th: 'สนับสนุนร้านอาหาร คาเฟ่ วิสาหกิจชุมชน และผู้ประกอบการท้องถิ่นให้เข้าถึงนักท่องเที่ยวโดยตรง', en: 'Connecting restaurants, cafes, community enterprises, and local entrepreneurs directly with travelers' },
    { th: 'ความหมายของตราสัญลักษณ์:', en: 'Brand Symbolism:' },
    { th: 'สื่อถึงการผสานวัฒนธรรมอันรุ่งโรจน์ของจังหวัดนครพนม เส้นทางริมฝั่งโขง และเทคโนโลยีดิจิทัลสมัยใหม่เข้าด้วยกันอย่างลงตัว', en: "Signifying the harmonious blend of Nakhon Phanom's glorious heritage, Mekong riverside vibes, and modern digital technology" },
    { th: 'พิกัดสถานที่ท่องเที่ยว', en: 'Attraction Pins' },
    { th: 'ข้อมูลสิ่งแวดล้อมสด', en: 'Live Environment Data' },
    { th: 'ผู้ช่วยวางแผนอัจฉริยะ', en: 'Smart Planner Assistant' },
    { th: 'การประชุมระดมความคิดและวางแผนสถาปัตยกรรมระบบ', en: 'Brainstorming and system architecture planning meeting' },
    { th: 'ลงพื้นที่เก็บพิกัด GPS ภาพถ่าย และบรรยากาศสถานที่จริง', en: 'Field survey collecting GPS coordinates, photography, and site insights' },
    { th: 'นำเสนอความคืบหน้าและรับฟังคำแนะนำจากอาจารย์ที่ปรึกษา', en: 'Progress presentation and mentoring review with project advisors' },
    { th: 'ทดสอบการเชื่อมต่อ API สภาพแวดล้อม และระบบตอบคำถาม AI', en: 'Integration testing of environment APIs and AI concierge system' },
    { th: 'ภาพความสำเร็จและการนำเสนอผลงานโครงการ', en: 'Project milestone showcase and achievement presentation' },
    { th: 'จังหวัดนครพนมเปี่ยมล้นไปด้วยมนต์เสน่ห์ ทั้งประวัติศาสตร์อันยาวนาน ความศักดิ์สิทธิ์ขององค์พระธาตุพนม ประเพณีไหลเรือไฟ และวิถีชีวิตสโลว์ไลฟ์ริมแม่น้ำโขง แต่ข้อมูลการท่องเที่ยวยังกระจัดกระจาย และขาดข้อมูลสภาพแวดล้อมที่จำเป็นต่อการตัดสินใจเดินทาง', en: 'Nakhon Phanom is filled with timeless charm, rich history, sacred Phra That Phanom, illuminated boat processions, and slow-life riverside living. However, travel insights were fragmented and lacked crucial environmental data.' },

    // Navigation, Tabbar & Menus
    { th: 'หน้าหลัก', en: 'Home' },
    { th: 'สถานที่ท่องเที่ยว', en: 'Attractions' },
    { th: 'ที่เที่ยว', en: 'Attractions' },
    { th: 'ไลฟ์สไตล์การเที่ยวทั้งหมด', en: 'All Lifestyle Experiences' },
    { th: 'ไลฟ์สไตล์การเที่ยว', en: 'Lifestyle' },
    { th: 'ไลฟ์สไตล์ทั้งหมด', en: 'All Lifestyle' },
    { th: 'ไลฟ์สไตล์', en: 'Lifestyle' },
    { th: 'คาเฟ่สุดชิคในนครพนม', en: 'Trendy Cafes in Nakhon Phanom' },
    { th: 'วัดและสถานที่ศักดิ์สิทธิ์', en: 'Temples & Sacred Sites' },
    { th: 'วัด/สถานที่ศักดิ์สิทธิ์', en: 'Temples & Sacred Sites' },
    { th: 'วัด/ศักดิ์สิทธิ์', en: 'Temples / Sacred' },
    { th: 'สถานที่ออกกำลังกาย', en: 'Fitness & Sports' },
    { th: 'ออกกำลังกาย', en: 'Fitness' },
    { th: 'ธรรมชาติและสิ่งแวดล้อม', en: 'Nature & Environment' },
    { th: 'ธรรมชาติ', en: 'Nature' },
    { th: 'วัฒนธรรม', en: 'Culture' },
    { th: 'ช้อปปิ้ง', en: 'Shopping' },
    { th: 'สายกิน', en: 'Foodies' },
    { th: 'ร้านอาหาร', en: 'Restaurants' },
    { th: 'คาเฟ่', en: 'Cafes' },
    { th: 'มูเตลู', en: 'Mutelu & Sacred' },
    { th: 'สภาพแวดล้อม', en: 'Environment' },
    { th: 'เช็คอินและรีวิว', en: 'Check-in & Reviews' },
    { th: 'เช็คอิน', en: 'Check-in' },
    { th: 'วิดีโอรีวิวสนุกๆ', en: 'Fun Video Reviews' },
    { th: 'วิดีโอรีวิว', en: 'Video Reviews' },
    { th: 'เกี่ยวกับเรา', en: 'About Us' },
    { th: 'ติดต่อเรา', en: 'Contact Us' },
    { th: 'เข้าสู่ระบบ', en: 'Login' },
    { th: 'สมัครสมาชิก', en: 'Sign Up' },
    { th: 'ออกจากระบบ', en: 'Sign Out' },
    { th: 'โปรไฟล์ของฉัน', en: 'My Profile' },
    { th: 'บันทึกส่วนตัว', en: 'Personal Journal' },
    { th: 'ระบบผู้ดูแล (Admin)', en: 'Admin System' },
    { th: 'ภาษา (Language)', en: 'Language' },
    { th: 'ภาษา', en: 'Language' },
    { th: 'สำรวจ', en: 'Explore' },
    { th: 'บัญชีผู้ใช้', en: 'Account' },
    { th: 'สมัครสมาชิก', en: 'Member Since' },
    { th: 'ข้อมูลเรียลไทม์', en: 'Real-Time Insights' },
    { th: 'พยากรณ์อากาศ', en: 'Weather Forecast' },
    { th: 'สภาพแวดล้อม PM2.5', en: 'PM2.5 Environment' },
    { th: 'ระดับแม่น้ำโขง', en: 'Mekong River Level' },
    { th: 'สภาพการจราจร', en: 'Traffic Conditions' },
    { th: 'แจ้งปัญหา / ติดต่อโฆษณา', en: 'Report Issue / Advertising' },
    { th: 'ติดต่อโฆษณา', en: 'Contact for Ads' },
    { th: 'พื้นที่ประชาสัมพันธ์', en: 'Sponsored' },
    { th: 'สนใจลงโฆษณา / ประชาสัมพันธ์ ติดต่อเรา', en: 'Interested in advertising? Contact us' },
    { th: 'นโยบายความเป็นส่วนตัว', en: 'Privacy Policy' },
    { th: 'ข้อกำหนดการใช้งาน', en: 'Terms of Service' },

    // Hero & Headers
    { th: 'สถานที่ท่องเที่ยวนครพนม', en: 'Nakhon Phanom Attractions' },
    { th: 'รีวิวจริงจากนักเดินทาง แผนที่นำทางครบทุกจุด และร้านเด็ดที่คัดมาให้แล้ว', en: 'Authentic reviews, comprehensive navigation map, and curated local hotspots' },
    { th: 'ข้อมูลจริงแบบเรียลไทม์ พร้อมย้อนหลัง 7 วัน วิเคราะห์และดาวน์โหลดเป็น Excel ได้ทันที', en: 'Real-time environment metrics with 7-day history and instant Excel download' },
    { th: 'แชร์โมเมนต์การเที่ยวนครพนม ให้คะแนน ติดแฮชแท็ก และเก็บบันทึกส่วนตัวไว้อ่านย้อนหลัง', en: 'Share your Nakhon Phanom travel moments, rate spots, add hashtags, and save journals' },
    { th: 'รีวิวจริงจากนักท่องเที่ยวจริง กดหัวใจ คอมเมนต์ และแชร์ให้เพื่อนดูได้เลย', en: 'Authentic reviews by real travelers — like, comment, and share with your friends' },
    { th: 'เช็คอินประสบการณ์ของคุณ', en: 'Check-in Your Experience' },
    { th: 'ทุกสายการเที่ยวของนครพนมรวมไว้ที่นี่ — เลือกสไตล์ที่ใช่สำหรับคุณ', en: 'All travel lifestyles of Nakhon Phanom united here — choose the style that fits you' },

    // Section Titles & Subtitles
    { th: 'สถานที่แนะนำประจำสัปดาห์', en: 'Weekly Highlights' },
    { th: 'วิดีโอคอนเท้นจากสายเที่ยวจริงๆ', en: 'Traveler Video Reviews' },
    { th: 'แนะนำเฉพาะสำหรับคุณ', en: 'Recommended Just For You' },
    { th: 'เข้าสู่ระบบเพื่อรับคำแนะนำที่ตรงกับไลฟ์สไตล์ของคุณ', en: 'Sign in to receive recommendations personalized to your travel lifestyle' },
    { th: 'อาหารพื้นถิ่น และ อาหารเวียดนาม', en: 'Local & Vietnamese Cuisine' },
    { th: 'เทศกาลของจังหวัดนครพนม', en: 'Festivals & Events' },
    { th: 'กิจกรรมส่งเสริมสุขภาพ', en: 'Active & Wellness' },
    { th: 'แผนที่นำทางสถานที่ท่องเที่ยว', en: 'Interactive Attractions Map' },
    { th: 'ปักหมุดวัด คาเฟ่ ร้านอาหาร และกิจกรรม พร้อมช่วงวันที่จัดงานสำหรับเทศกาล', en: 'Pins for temples, cafes, dining, and festivals with active date ranges' },
    { th: 'คลิกที่หมุดบนแผนที่เพื่อดูรายละเอียดสถานที่และช่วงวันที่จัดกิจกรรม', en: 'Click any map pin to view place details and event periods' },
    { th: 'คัดสรรคาเฟ่เด็ดทั่วนครพนม — เลื่อนดูร้านอื่นได้เรื่อยๆ', en: 'Curated cafes across Nakhon Phanom — swipe to explore more' },
    { th: 'อาหารเวียดนามและอาหารพื้นถิ่นขึ้นชื่อของนครพนม', en: 'Renowned Vietnamese and local Isan cuisine of Nakhon Phanom' },
    { th: 'ปูชนียสถานสำคัญและสถานที่ศักดิ์สิทธิ์คู่บ้านคู่เมือง', en: 'Sacred heritage shrines and spiritual landmarks' },
    { th: 'เส้นทางวิ่ง ปั่นจักรยาน และลานกิจกรรมกลางแจ้ง', en: 'Running tracks, cycling routes, and outdoor activity spaces' },
    { th: 'เลือกเขตอำเภอ — ใช้กรองเฉพาะข้อมูล PM2.5 และอุณหภูมิ ส่วนสภาพอากาศและระดับแม่น้ำโขงแสดงภาพรวมทั้งจังหวัด', en: 'Select district — filters PM2.5 and temperature; weather & river level reflect provincial overview' },
    { th: 'ค่าฝุ่นละอองขนาดเล็ก แบ่งตามเขตอำเภอ พร้อมข้อมูลย้อนหลัง 7 วันจริง', en: 'Fine dust particulate metrics by district with verified 7-day historical trends' },
    { th: 'ระดับน้ำโขงวันนี้และสถิติย้อนหลัง 7 วัน', en: "Today's Mekong river level and 7-day historical statistics" },
    { th: 'ภาพรวมสภาพอากาศและอุณหภูมิในจังหวัดนครพนม', en: 'Provincial weather and temperature overview for Nakhon Phanom' },
    { th: 'สถานที่ที่คนไปเยอะที่สุด สายทั้งหมด', en: 'Most Popular Places — All Lifestyles' },
    { th: 'อันดับสถานที่ที่มีผู้มาเยือนมากที่สุดในสายนี้ ประเมินจากยอดผู้เข้าเยี่ยมชมต่อเดือน', en: 'Rankings of the most visited spots based on estimated monthly visitors' },
    { th: 'สถานที่ในสายนี้', en: 'Places in this lifestyle' },
    { th: 'คะแนนเฉลี่ย', en: 'Average Rating' },
    { th: 'คนไปเยือน/เดือน', en: 'Visitors / Month' },
    { th: 'คนชอบไลฟ์สไตล์ทั้งหมดนี้', en: 'travelers love this lifestyle' },
    { th: 'เข้าร่วมเพื่อแสดงว่าคุณก็ชอบสายนี้ และหาเพื่อนร่วมทางที่ชอบเที่ยวแบบเดียวกัน', en: 'Join to show your interest and connect with like-minded travelers' },
    { th: '+ ร่วมสายนี้กับเรา', en: '+ Join this lifestyle' },

    // Place Names & Descriptions
    { th: 'พระธาตุพนม', en: 'Wat Phra That Phanom' },
    { th: 'วัดพระธาตุพนมวรมหาวิหาร', en: 'Wat Phra That Phanom Woramahawihan' },
    { th: 'พญาศรีสัตตนาคราช', en: 'Phaya Si Sattanakharat Monument' },
    { th: 'ลานพญาศรีสัตตนาคราช', en: 'Phaya Si Sattanakharat Landmark Square' },
    { th: 'หอสมุดแห่งชาติเฉลิมพระเกียรติฯ', en: 'National Library of Nakhon Phanom' },
    { th: 'สะพานมิตรภาพ 3', en: '3rd Thai-Lao Friendship Bridge' },
    { th: 'สะพานมิตรภาพไทย-ลาว แห่งที่ 3', en: 'Third Thai-Lao Friendship Bridge' },
    { th: 'จวนผู้ว่าราชการจังหวัด (หอแก้ว)', en: "Old Governor's Residence Museum" },
    { th: 'พิพิธภัณฑ์จวนผู้ว่าราชการจังหวัด (หอแก้ว)', en: "Old Governor's Residence Museum" },
    { th: 'อนุสรณ์สถานประธานโฮจิมินห์', en: 'President Ho Chi Minh Memorial' },
    { th: 'วัดโอกาสศรีบัวบาน', en: 'Wat Okat Sri Bua Ban' },
    { th: 'วัดพระอินทร์แปลง', en: 'Wat Phra In Plaeng' },
    { th: 'วัดมหาธาตุ', en: 'Wat Mahathat' },
    { th: 'วัดศรีชมภูองค์ตื้อ', en: 'Wat Si Chomphu Ong Tue' },
    { th: 'วัดธาตุศรีคุณ', en: 'Wat That Sri Khun' },
    { th: 'วัดพระธาตุท่าอุเทน', en: 'Wat Phra That Tha Uthen' },
    { th: 'พระมหาธาตุเจดีย์โฆสปัญโญศรีพนม', en: 'Phra Maha That Chedi Khosapan-yo Sri Phanom' },
    { th: 'จิบกาแฟชิลๆ เติมพลังให้ชีวิต', en: 'Chill coffee moments & energy refresh' },
    { th: 'บ้านไม้ริมทาง คาเฟ่', en: 'Baan Mai Rim Thang Cafe' },
    { th: 'สวนหย่อม การ์เดน คาเฟ่', en: 'Suan Yom Garden Cafe' },
    { th: 'ร้านลับ ริมทาง คาเฟ่', en: 'Hidden Roadside Cafe' },
    { th: 'แหนมเนือง ริมโขง', en: 'Riverside Nem Nuong' },
    { th: 'ตำรับอีสานลุ่มโขง', en: 'Authentic Mekong Isan Kitchen' },
    { th: 'ตลาดอินโดจีนยามค่ำ', en: 'Indochina Night Market' },
    { th: 'ก๋วยเตี๋ยวญวนป้าคำ', en: 'Pa Kham Vietnamese Noodle' },
    { th: 'ร้านลาบปลาแม่น้ำโขง', en: 'Mekong River Fish Larb' },
    { th: 'ครัวเรือนแพ ริมน้ำ', en: 'Raft Riverside Kitchen' },
    { th: 'เป๋นปลาเป็น', en: 'Pen Pla Pen Restaurant' },
    { th: 'พรเทพ - สาขา 2', en: 'Pornthep - Branch 2' },
    { th: 'เลิศโอชา - ก๋วยเตี๋ยวเนื้อเปื่อย', en: 'Lert Ocha Stewed Beef Noodle' },
    { th: 'ร้านตำตุ๊ปุ๊', en: 'Tum Tu Pu Isan Bistro' },
    { th: 'ชื่นใจ', en: 'Chuen Jai Dessert Cafe' },
    { th: 'ลานแอโรบิคริมโขง', en: 'Mekong Aerobic Waterfront' },
    { th: 'เส้นทางปั่นริมแม่น้ำโขง', en: 'Mekong Cycling Promenade' },
    { th: 'สนามกีฬากลางจังหวัด', en: 'Provincial Central Stadium' },
    { th: 'ริมโขงยามเย็น', en: 'Mekong Sunset Promenade' },
    { th: 'เรณูนคร', en: 'Renu Nakhon' },
    { th: 'วิถีชุมชนลาว-เวียดนาม', en: 'Lao-Vietnamese Community Heritage' },
    { th: 'ถนนคนเดินนครพนม', en: 'Nakhon Phanom Walking Street' },
    { th: 'ศาลหลักเมืองนครพนม', en: 'Nakhon Phanom City Pillar Shrine' },
    { th: 'ศาลเจ้าแม่นาคี ริมโขงเก้ามังกร', en: 'Chao Mae Nakee Shrine' },
    { th: 'ลานเสี่ยงทายองค์พระธาตุพนม', en: 'Phra That Phanom Fortune Square' },
    { th: 'แถวร้านดูดวงตลาดอินโดจีน', en: 'Indochina Fortune Teller Row' },
    { th: 'ตลาดอินโดจีน (ฝั่งช้อปปิ้ง)', en: 'Indochina Market (Shopping Zone)' },
    { th: 'ตลาด OTOP เรณูนคร', en: 'Renu Nakhon OTOP Market' },
    { th: 'เซ็นทรัล นครพนม', en: 'Central Nakhon Phanom' },
    { th: 'หมู่บ้านทอผ้าไหมเรณูนคร', en: 'Renu Nakhon Silk Weaving Village' },
    { th: 'แลนด์มาร์ก', en: 'Landmarks' },

    // Location Districts & Pricing
    { th: 'ริมโขง', en: 'Mekong Riverside' },
    { th: 'อำเภอเมือง', en: 'Mueang District' },
    { th: 'อำเภอธาตุพนม', en: 'That Phanom District' },
    { th: 'อำเภอท่าอุเทน', en: 'Tha Uthen District' },
    { th: 'อำเภอเรณูนคร', en: 'Renu Nakhon District' },
    { th: 'อำเภอบ้านแพง', en: 'Ban Phaeng District' },
    { th: 'อำเภอศรีสงคราม', en: 'Si Songkhram District' },
    { th: 'อำเภอนาแก', en: 'Na Kae District' },
    { th: 'ถนนสุนทรวิจิตร', en: 'Sunthon Wichit Rd.' },
    { th: 'ตลาดอินโดจีน', en: 'Indochina Market' },
    { th: 'ฟรี', en: 'Free Admission' },
    { th: 'ไม่เสียค่าเข้า', en: 'Free Admission' },

    // Festivals & Countdowns
    { th: 'งานประเพณีไหลเรือไฟ', en: 'Illuminated Boat Procession' },
    { th: 'สงกรานต์ริมโขง', en: 'Mekong Songkran Festival' },
    { th: 'งานประจำปีพระธาตุพนม', en: 'Phra That Phanom Annual Fair' },
    { th: 'งานกาชาดและงานประจำปีจังหวัด', en: 'Indochina Red Cross & Provincial Fair' },
    { th: 'เทศกาลแห่งแสงสีบนสายน้ำโขง สืบสานวัฒนธรรมออกพรรษา', en: 'Festival of lights on the Mekong River, celebrating Ok Phansa tradition' },
    { th: 'รื่นเริงสงกรานต์สไตล์ลุ่มน้ำโขง พร้อมการแสดงวัฒนธรรม', en: 'Mekong style Songkran celebration with cultural performances' },
    { th: 'งานบุญใหญ่ประจำปี นมัสการองค์พระธาตุพนมอันศักดิ์สิทธิ์', en: 'Grand annual Buddhist pilgrimage worshipping the holy Phra That Phanom' },
    { th: 'มหกรรมสินค้าและวัฒนธรรมกลุ่มประเทศอินโดจีน', en: 'Trade exhibition and cultural showcase of Indochina nations' },
    { th: '24 ต.ค. – 2 พ.ย.', en: '24 Oct – 2 Nov' },
    { th: '13 – 15 เม.ย.', en: '13 – 15 Apr' },
    { th: 'เดือน 3 (ตามจันทรคติ)', en: '3rd Lunar Month' },
    { th: 'ธ.ค. (ปลายปี)', en: 'Dec (Year-end)' },
    { th: 'เทศกาลประจำปี', en: 'Annual Festival' },
    { th: 'งานประจำปี', en: 'Annual Event' },
    { th: 'กิจกรรม', en: 'Events' },
    { th: 'วันจัดงาน', en: 'Dates' },
    { th: 'สถานที่', en: 'Location' },
    { th: 'กำลังจัดงานอยู่ตอนนี้', en: 'Event in progress right now' },
    { th: 'เริ่มพรุ่งนี้', en: 'Starts tomorrow' },
    { th: 'จบงานแล้ว', en: 'Event concluded' },
    { th: 'ยังไม่มีกิจกรรมที่กำลังจะมาถึง ติดตามได้เร็วๆนี้', en: 'No upcoming events at this moment. Stay tuned!' },
    { th: 'ดูรายละเอียดเทศกาล', en: 'View Festival Details' },

    // Common Buttons & Interactive Labels
    { th: 'เริ่มต้นการเดินทาง', en: 'Get Started' },
    { th: 'สำรวจสถานที่', en: 'Explore Places' },
    { th: 'ดูรายละเอียด', en: 'View Details' },
    { th: 'ขอเส้นทาง', en: 'Get Directions' },
    { th: 'ดูแผนที่ / พิกัด', en: 'View Map / GPS' },
    { th: 'ดูแผนที่', en: 'View Map' },
    { th: 'ดูทั้งหมด', en: 'View All' },
    { th: 'อ่านต่อ ▾', en: 'Read More ▾' },
    { th: 'อ่านต่อ', en: 'Read More' },
    { th: 'ย่อลง ▴', en: 'Show Less ▴' },
    { th: 'ย่อลง', en: 'Show Less' },
    { th: 'ปิด', en: 'Close' },
    { th: 'ปิดหน้าต่างแจ้งเตือน', en: 'Close Notification' },
    { th: 'ปิดหน้าต่าง', en: 'Close Modal' },
    { th: 'ปิดหน้าต่างนี้', en: 'Dismiss' },
    { th: 'ส่งข้อมูล', en: 'Submit' },
    { th: 'ยกเลิก', en: 'Cancel' },
    { th: 'บันทึก', en: 'Save' },
    { th: 'ดาวน์โหลด Excel', en: 'Download Excel' },
    { th: '⬇ ดาวน์โหลด Excel', en: '⬇ Download Excel' },
    { th: 'ค้นหาสถานที่...', en: 'Search places...' },
    { th: 'ค้นหาสถานที่ท่องเที่ยว...', en: 'Search attractions...' },
    { th: 'ค้นหาสถานที่ท่องเที่ยว คาเฟ่ วัด หรือร้านอาหาร...', en: 'Search attractions, cafes, temples, or dining...' },
    { th: 'ค้นหา', en: 'Search' },
    { th: 'ทั้งหมด', en: 'All' },
    { th: 'คะแนน', en: 'Rating' },
    { th: 'ยังไม่มีคะแนน', en: 'No rating yet' },
    { th: 'ยังไม่มีรีวิว', en: 'No reviews yet' },
    { th: 'รีวิวจากผู้ใช้งาน', en: 'User Reviews' },
    { th: 'เขียนรีวิวสถานที่นี้', en: 'Write a review for this place' },
    { th: 'ส่งรีวิว', en: 'Submit Review' },
    { th: 'แก้ไขชื่อ', en: 'Edit Name' },
    { th: 'เปลี่ยนรูปโปรไฟล์', en: 'Change Avatar' },
    { th: 'จดจำฉันไว้', en: 'Remember Me' },
    { th: 'ลืมรหัสผ่าน?', en: 'Forgot Password?' },
    { th: 'ยังไม่มีบัญชี?', en: "Don't have an account?" },
    { th: 'มีบัญชีอยู่แล้ว?', en: 'Already have an account?' },
    { th: 'เข้าสู่ระบบด้วย Google', en: 'Sign in with Google' },
    { th: 'สมัครด้วย Google', en: 'Sign up with Google' },
    { th: 'ฉันยอมรับข้อกำหนดการใช้งาน', en: 'I agree to the Terms of Service' },
    { th: 'การสมัครสมาชิกถือว่าคุณยอมรับ', en: 'By registering, you agree to our' },

    // Environment & Infobar Details
    { th: 'ข้อมูลย้อนหลัง 7 วัน', en: '7-Day Historical Data' },
    { th: 'คุณภาพอากาศ', en: 'Air Quality' },
    { th: 'สภาพอากาศ', en: 'Weather' },
    { th: 'อากาศ', en: 'Weather' },
    { th: 'อุณหภูมิ', en: 'Temperature' },
    { th: 'แม่น้ำโขง', en: 'Mekong River' },
    { th: 'การจราจร', en: 'Traffic' },
    { th: 'จราจร', en: 'Traffic' },
    { th: 'ดีมาก', en: 'Excellent' },
    { th: 'ดี', en: 'Good' },
    { th: 'ปานกลาง', en: 'Moderate' },
    { th: 'เริ่มมีผลกระทบ', en: 'Unhealthy for Sensitive Groups' },
    { th: 'มีผลกระทบต่อสุขภาพ', en: 'Unhealthy' },
    { th: 'คล่องตัว', en: 'Smooth' },
    { th: 'หนาแน่น', en: 'Heavy' },
    { th: 'ปกติ', en: 'Normal' },
    { th: 'วันที่', en: 'Date' },
    { th: 'ค่า PM2.5', en: 'PM2.5 Value' },

    // Auth Modal Details
    { th: 'เข้าสู่ระบบสำเร็จ', en: 'Login Successful' },
    { th: 'ยินดีต้อนรับกลับมาครับ กำลังพาคุณไปยังหน้าเดิม...', en: 'Welcome back! Redirecting you to your page...' },
    { th: 'ยินดีต้อนรับ', en: 'Welcome' },
    { th: 'เข้าสู่ระบบเพื่อเช็คอิน กดหัวใจ และคอมเมนต์ได้เต็มรูปแบบ', en: 'Log in to check-in, like places, and write reviews' },
    { th: 'ชื่อที่แสดง', en: 'Display Name' },
    { th: 'อีเมล', en: 'Email' },
    { th: 'รหัสผ่าน', en: 'Password' },
    { th: 'วันเดือนปีเกิด', en: 'Date of Birth' },
    { th: 'สนใจสถานที่แนวไหน (เลือกได้หลายอย่าง)', en: 'What places interest you? (Select multiple)' },
    { th: 'สภาพแวดล้อมที่ชอบ', en: 'Preferred Environment' },
    { th: 'ในร่ม', en: 'Indoor' },
    { th: 'กลางแจ้ง', en: 'Outdoor' },
    { th: 'ทั้งสองแบบ', en: 'Both' },
    { th: 'สไตล์การเที่ยว', en: 'Travel Style' },
    { th: 'สบาย ผ่อนคลาย', en: 'Relaxed & Cozy' },
    { th: 'ผจญภัย ท้าทาย', en: 'Active & Adventure' },
    { th: 'กรุณากรอกอีเมลให้ถูกต้อง', en: 'Please enter a valid email address' },
    { th: 'กรุณากรอกรหัสผ่าน', en: 'Please enter your password' },
    { th: 'กรุณากรอกชื่อของคุณ', en: 'Please enter your name' },
    { th: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร', en: 'Password must be at least 8 characters' },
    { th: 'กรุณาเลือกวันเดือนปีเกิด', en: 'Please select your birthdate' },

    // Review & Profile
    { th: 'เช็คอินสถานที่ใหม่', en: 'Check-in New Spot' },
    { th: 'อัปโหลดได้สูงสุด 5 รูป พร้อมติดแฮชแท็กและให้คะแนนสถานที่', en: 'Upload up to 5 photos, add hashtags, and rate the spot' },
    { th: 'อัปโหลดแล้ว', en: 'Uploaded' },
    { th: 'สถานที่', en: 'Place' },
    { th: 'แฮชแท็ก', en: 'Hashtags' },
    { th: 'บันทึกประสบการณ์ของคุณ', en: 'Share your experience...' },
    { th: 'โพสต์เช็คอิน', en: 'Post Check-in' },
    { th: 'ผู้ใช้งาน', en: 'User' },
    { th: 'กรุณาเข้าสู่ระบบ', en: 'Please Sign In' },
    { th: 'คุณต้องเข้าสู่ระบบก่อนจึงจะดูโปรไฟล์ได้', en: 'You must sign in to view your profile' },
    { th: 'เข้าสู่ระบบ / สมัครสมาชิก', en: 'Sign In / Register' },
    { th: 'ประวัติการเช็คอิน', en: 'Check-in History' },
    { th: 'สถานที่ที่ถูกใจ', en: 'Favorite Places' },
    { th: 'การตั้งค่าบัญชี', en: 'Account Settings' },

    // Planvis AI Tour Guide
    { th: 'สวัสดีครับ ผมคือ Planvis AI ไกด์ส่วนตัวของคุณผมจะพาเที่ยวจังหวัดนครพนมเองครับ ยินดีต้อนรับสู่ประสบการณ์การท่องเที่ยวเหนือระดับ ให้ผมช่วยออกแบบการเดินทางที่สมบูรณ์แบบสำหรับคุณนะครับ', en: 'Hello! I am Planvis, your AI travel concierge for Nakhon Phanom. Welcome to a premier travel journey. Let me help you design your ideal trip itinerary!' },
    { th: 'พิมพ์ข้อความ... (เช่น แนะนำที่เที่ยว 1 วัน)', en: 'Type a message... (e.g. 1-day trip plan)' },
    { th: 'แนะนำที่เที่ยว 1 วัน', en: '1-Day Trip Plan' },
    { th: 'คาเฟ่ริมโขงบรรยากาศดี', en: 'Best Riverside Cafes' },
    { th: 'ไหว้พระ 8 พระธาตุประจำวันเกิด', en: '8 Birthday Relic Temples' },
    { th: 'ร้านอาหารเวียดนามเด็ดๆ', en: 'Top Vietnamese Food' },
    { th: 'สภาพอากาศวันนี้เป็นไง', en: "How's the weather today?" }
  ];

  // Two independent sorted arrays:
  // 1. For TH -> EN: sorted by descending Thai length (long Thai phrases match first)
  const SORTED_TH_TO_EN = [...RAW_PHRASES].sort((a, b) => b.th.length - a.th.length);
  // 2. For EN -> TH: sorted by descending English length (long English phrases match first)
  const SORTED_EN_TO_TH = [...RAW_PHRASES].sort((a, b) => b.en.length - a.en.length);

  let currentLang = 'TH';

  function getLang() {
    return currentLang;
  }

  function setLang(lang, skipStore) {
    const target = (lang || 'TH').toUpperCase() === 'EN' ? 'EN' : 'TH';
    currentLang = target;
    if (!skipStore) {
      try {
        localStorage.setItem(STORAGE_KEY, target);
      } catch (e) { }
    }

    document.documentElement.lang = target.toLowerCase();
    updateUIButtons(target);
    translateDom(target);

    // Notify other components & scripts
    document.dispatchEvent(new CustomEvent('lang:changed', { detail: { lang: target } }));
  }

  function toggleLang() {
    setLang(currentLang === 'TH' ? 'EN' : 'TH');
  }

  function t(key, fallback) {
    const dict = DICTIONARY[currentLang] || DICTIONARY.TH;
    if (dict && dict[key]) return dict[key];
    return fallback || key;
  }

  // Update visual state of all language toggle buttons on Desktop and Mobile
  function updateUIButtons(lang) {
    const isEN = lang === 'EN';

    document.querySelectorAll('#lang-switch, #navbar-mobile-lang-switch, #mnx-m-lang-switch, #mnx-m-lang-switch-row').forEach((btn) => {
      const thOpt = btn.querySelector('.mnx-m-lang-th, .mnx-lang-opt:first-child');
      const enOpt = btn.querySelector('.mnx-m-lang-en, .mnx-lang-opt:last-child');
      if (thOpt && enOpt) {
        thOpt.classList.toggle('is-active', !isEN);
        thOpt.classList.toggle('text-gold', !isEN);
        thOpt.classList.toggle('text-muted', isEN);
        thOpt.style.fontWeight = isEN ? 'normal' : '700';
        thOpt.style.opacity = isEN ? '0.6' : '1';

        enOpt.classList.toggle('is-active', isEN);
        enOpt.classList.toggle('text-gold', isEN);
        enOpt.classList.toggle('text-muted', !isEN);
        enOpt.style.fontWeight = isEN ? '700' : 'normal';
        enOpt.style.opacity = isEN ? '1' : '0.6';
      }
    });
  }

  // Translate Thai string -> English string using phrase matrix
  function translateThaiToEn(text) {
    if (!text || typeof text !== 'string') return text;
    let result = text;
    for (const pair of SORTED_TH_TO_EN) {
      if (result.includes(pair.th)) {
        result = result.split(pair.th).join(pair.en);
      }
    }
    return result;
  }

  // Translate English string -> Thai string using reverse sorted phrase matrix
  function translateEnToThai(text) {
    if (!text || typeof text !== 'string') return text;
    let result = text;
    for (const pair of SORTED_EN_TO_TH) {
      if (result.includes(pair.en)) {
        result = result.split(pair.en).join(pair.th);
      }
    }
    return result;
  }

  // Check if string contains Thai characters
  function hasThaiChar(str) {
    return /[\u0E00-\u0E7F]/.test(str);
  }

  // Bidirectional DOM text walker
  function walkAndTranslate(root, targetLang) {
    if (!root) return;
    const isEN = targetLang === 'EN';

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName;
          if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEXTAREA' || tag === 'CODE' || tag === 'PRE' || tag === 'TITLE') {
            return NodeFilter.FILTER_REJECT;
          }
          if (
            parent.hasAttribute('data-i18n') ||
            parent.closest('.no-translate, .navbar__logo, .footer__logo, .hero__title, .hero__kicker, .about-brand-title, .about-brand-sub, .mnx-m-infobar__brand') ||
            parent.closest('#lang-switch') ||
            parent.closest('#navbar-mobile-lang-switch') ||
            parent.closest('#mnx-m-lang-switch')
          ) {
            return NodeFilter.FILTER_REJECT;
          }
          if (!node.nodeValue || node.nodeValue.trim() === '') return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodes = [];
    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }

    for (const node of nodes) {
      const currentVal = node.nodeValue;

      // Always protect exact platform brand names from being translated or modified
      if (currentVal.includes('Nakhon Phanom Lifestyle Travel Platform') || currentVal.includes('NAKHON PHANOM') || currentVal.includes('NKP')) {
        continue;
      }

      // If the node currently contains Thai characters, always save/refresh its pristine Thai text
      if (hasThaiChar(currentVal)) {
        node.__mnx_orig_th = currentVal;
      }

      if (isEN) {
        const src = node.__mnx_orig_th || currentVal;
        const translated = translateThaiToEn(src);
        if (node.nodeValue !== translated) {
          node.nodeValue = translated;
        }
      } else {
        // Target is TH
        if (node.__mnx_orig_th) {
          if (node.nodeValue !== node.__mnx_orig_th) {
            node.nodeValue = node.__mnx_orig_th;
          }
        } else {
          // If original Thai was not captured, reverse translate with EN->TH sorted dictionary
          const restored = translateEnToThai(currentVal);
          if (node.nodeValue !== restored) {
            node.nodeValue = restored;
          }
        }
      }
    }
  }

  // Full DOM translation routine (TH <-> EN)
  function translateDom(lang) {
    const target = lang || currentLang;
    const isEN = target === 'EN';
    const dict = isEN ? DICTIONARY.EN : DICTIONARY.TH;

    // 1. Translate elements with data-i18n attributes
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });

    // 2. Translate placeholders with data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[key]) {
        el.setAttribute('placeholder', dict[key]);
      }
    });

    // 3. Translate all standard input & textarea placeholders
    document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach((input) => {
      if (input.closest('.no-translate')) return;
      const curPh = input.getAttribute('placeholder') || '';
      if (hasThaiChar(curPh)) {
        input.setAttribute('data-mnx-orig-ph', curPh);
      }
      const origPh = input.getAttribute('data-mnx-orig-ph') || curPh;
      if (isEN) {
        input.setAttribute('placeholder', translateThaiToEn(origPh));
      } else {
        input.setAttribute('placeholder', origPh);
      }
    });

    // 4. Translate aria-label & title attributes
    document.querySelectorAll('[aria-label], [title]').forEach((el) => {
      if (el.closest('#lang-switch') || el.closest('#navbar-mobile-lang-switch') || el.closest('#mnx-m-lang-switch')) return;

      const aria = el.getAttribute('aria-label');
      if (aria) {
        if (hasThaiChar(aria)) el.setAttribute('data-mnx-orig-aria', aria);
        const origAria = el.getAttribute('data-mnx-orig-aria') || aria;
        el.setAttribute('aria-label', isEN ? translateThaiToEn(origAria) : origAria);
      }

      const title = el.getAttribute('title');
      if (title) {
        if (hasThaiChar(title)) el.setAttribute('data-mnx-orig-title', title);
        const origTitle = el.getAttribute('data-mnx-orig-title') || title;
        el.setAttribute('title', isEN ? translateThaiToEn(origTitle) : origTitle);
      }
    });

    // 5. Walk entire body DOM for complete bilingual coverage
    walkAndTranslate(document.body, target);
  }

  // Setup Global Unified Event Delegations for all Lang Switch buttons
  function initLangListeners() {
    const handleEvent = (e) => {
      // Check if user clicked specifically on a TH or EN option
      const opt = e.target.closest('.mnx-lang-opt, .mnx-m-lang-th, .mnx-m-lang-en');
      if (opt) {
        const text = opt.textContent.trim().toUpperCase();
        if (text === 'TH' || text === 'EN') {
          e.preventDefault();
          e.stopPropagation();
          setLang(text);
          return;
        }
      }

      // Check if user clicked the toggle button container
      const btn = e.target.closest('#lang-switch, #navbar-mobile-lang-switch, #mnx-m-lang-switch, [data-action="toggle-lang"], [data-lang-switch]');
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        toggleLang();
      }
    };

    document.addEventListener('click', handleEvent, true);
  }

  // Dynamic Mutation Observer to auto-translate dynamically rendered cards & modals
  let debounceTimer = null;
  function initMutationObserver() {
    if (!window.MutationObserver) return;
    const observer = new MutationObserver((mutations) => {
      let shouldTranslate = false;
      for (const m of mutations) {
        if (m.addedNodes && m.addedNodes.length > 0) {
          shouldTranslate = true;
          break;
        }
      }
      if (shouldTranslate) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          translateDom(currentLang);
        }, 50);
      }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // Initialize on page load
  function init() {
    let saved = 'TH';
    try {
      saved = localStorage.getItem(STORAGE_KEY) || 'TH';
    } catch (e) { }

    currentLang = saved.toUpperCase() === 'EN' ? 'EN' : 'TH';
    document.documentElement.lang = currentLang.toLowerCase();

    // Cache initial DOM text before performing any transformations
    walkAndTranslate(document.body, 'TH');

    updateUIButtons(currentLang);
    initLangListeners();
    initMutationObserver();

    if (currentLang === 'EN') {
      setTimeout(() => translateDom('EN'), 30);
      setTimeout(() => translateDom('EN'), 200);
      setTimeout(() => translateDom('EN'), 600);
    }
  }

  // Re-translate when custom component events fire
  ['includes:loaded', 'app:content-updated', 'places:rendered', 'reviews:loaded', 'weather:rendered', 'mnx:mobile-shell-loaded'].forEach((evtName) => {
    document.addEventListener(evtName, () => {
      updateUIButtons(currentLang);
      translateDom(currentLang);
    });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose Global API
  window.MNX_I18N = {
    getLang,
    setLang,
    toggleLang,
    t,
    translateDom,
    translateString: (str, isEN) => isEN ? translateThaiToEn(str) : translateEnToThai(str),
    DICTIONARY,
    PHRASE_MAP: RAW_PHRASES
  };

  // Backward compatibility helpers
  window.MNX_SET_LANG = setLang;
  window.MNX_GET_LANG = getLang;
  window.MNX_TOGGLE_LANG = toggleLang;

})();
