import type {
  BodyRegion,
  ClinicRank,
  ExamProtocol,
  PatientCase,
  PatientPosture,
  ProjectionType,
  ScanEvaluation,
  UpgradeId,
  UpgradeItem,
} from '../types/radiology';
import {ASSETS} from './assets';

export const CLINIC_ROOM_IMAGE = ASSETS.clinicRoomImg;
export const CLINIC_RECEPTION_IMAGE = ASSETS.clinicReceptionImg;
export const FILM_CARTON_IMAGE = ASSETS.shopFilmCartonImg;

export const PATIENT_AVATARS = {
  manYoung: ASSETS.patientManYoungImg,
  manSenior: ASSETS.patientManSeniorImg,
  womanYoung: ASSETS.patientWomanYoungImg,
  womanSenior: ASSETS.patientWomanSeniorImg,
};

export const REGION_SCAN_IMAGES: Record<BodyRegion, string> = {
  chest: ASSETS.xrayChestImg,
  cervical: ASSETS.xrayCervicalImg,
  lumbar: ASSETS.xrayLumbarImg,
  hand: ASSETS.xrayHandImg,
  knee: ASSETS.xrayKneeImg,
  pelvis: ASSETS.xrayPelvisImg,
  head: ASSETS.xraySkullImg,
};

export const CT_SCAN_IMAGE = ASSETS.ctChestImg;
export const MRI_SCAN_IMAGE = ASSETS.mriLumbarImg;

export const FILM_CARTON_SIZE = 20;
export const FILM_CARTON_COST = 100;
export const BULK_CARTON_SIZE = 100;
export const BULK_CARTON_COST = 450;

export const REGION_LABELS_AR: Record<BodyRegion, string> = {
  head: 'الرأس والجمجمة',
  cervical: 'الفقرات العنقية (الرقبة)',
  chest: 'الصدر والرئتين',
  lumbar: 'العمود الفقري القطني',
  pelvis: 'الحوض والورك',
  hand: 'اليد والرسغ',
  knee: 'الركبة',
};

export const PROJECTION_LABELS_AR: Record<ProjectionType, string> = {
  PA: 'خلفي-أمامي (PA)',
  AP: 'أمامي-خلفي (AP)',
  LATERAL: 'جانبي (Lateral)',
  AXIAL: 'مقطعي محوري (Axial)',
  SAGITTAL: 'رنين سهمي (Sagittal)',
};

export const POSTURE_LABELS_AR: Record<PatientPosture, string> = {
  SUPINE: 'مستلقٍ على الظهر (Supine)',
  PRONE: 'مستلقٍ على البطن (Prone)',
  TABLE_LEFT_LAT: 'نائم جانبياً — يسار (Left Lateral)',
  TABLE_RIGHT_LAT: 'نائم جانبياً — يمين (Right Lateral)',
  ERECT_PA: 'واقف (Erect) · خلفي-أمامي PA',
  ERECT_AP: 'واقف (Erect) · أمامي-خلفي AP',
  ERECT_LEFT_LAT: 'واقف (Erect) · جانبي أيسر (Left Lat)',
  ERECT_RIGHT_LAT: 'واقف (Erect) · جانبي أيمن (Right Lat)',
};

export const POSTURE_SHORT_AR: Record<PatientPosture, string> = {
  SUPINE: 'Supine (على الظهر)',
  PRONE: 'Prone (على البطن)',
  TABLE_LEFT_LAT: 'Left Lat (طاولة)',
  TABLE_RIGHT_LAT: 'Right Lat (طاولة)',
  ERECT_PA: 'Erect PA (واقف)',
  ERECT_AP: 'Erect AP (واقف)',
  ERECT_LEFT_LAT: 'Erect Left Lat',
  ERECT_RIGHT_LAT: 'Erect Right Lat',
};

export const EXAMS: ExamProtocol[] = [
  {
    id: 'chest_pa',
    titleAr: 'أشعة الصدر (واقف PA)',
    titleEn: 'Chest X-Ray (Erect PA)',
    region: 'chest',
    regionLabelAr: 'الصدر',
    modality: 'XRAY',
    modalityLabelAr: 'أشعة سينية',
    recommendedProjection: 'PA',
    projectionLabelAr: 'خلفي-أمامي (PA)',
    recommendedPosture: 'ERECT_PA',
    postureLabelAr: 'واقف (Erect) · PA',
    kvpRange: [105, 125],
    masRange: [2, 6],
    baseFee: 15,
    imagePath: REGION_SCAN_IMAGES.chest,
    clinicalTipAr:
      'يُقف المريض بوضع Erect PA مواجهاً للحامل الجداري مع كتم النفس بجهد 105–125 kVp لإظهار الرئتين بالكامل.',
  },
  {
    id: 'chest_lat_left',
    titleAr: 'أشعة الصدر الجانبية (واقف يسار)',
    titleEn: 'Chest X-Ray (Erect Left Lateral)',
    region: 'chest',
    regionLabelAr: 'الصدر',
    modality: 'XRAY',
    modalityLabelAr: 'أشعة سينية',
    recommendedProjection: 'LATERAL',
    projectionLabelAr: 'جانبي (Lateral)',
    recommendedPosture: 'ERECT_LEFT_LAT',
    postureLabelAr: 'واقف (Erect) · جانبي أيسر',
    kvpRange: [110, 128],
    masRange: [4, 9],
    baseFee: 15,
    imagePath: REGION_SCAN_IMAGES.chest,
    clinicalTipAr:
      'الوضع الجانبي الأيسر الواقف (Left Lateral) يقرّب القلب من المستقبل لتقليل التكبير مع رفع الذراعين للأعلى.',
  },
  {
    id: 'cervical_lat',
    titleAr: 'أشعة الفقرات العنقية (واقف جانبي)',
    titleEn: 'Cervical Spine (Erect Lateral)',
    region: 'cervical',
    regionLabelAr: 'الرقبة',
    modality: 'XRAY',
    modalityLabelAr: 'أشعة سينية',
    recommendedProjection: 'LATERAL',
    projectionLabelAr: 'جانبي (Lateral)',
    recommendedPosture: 'ERECT_RIGHT_LAT',
    postureLabelAr: 'واقف (Erect) · جانبي أيمن',
    kvpRange: [68, 82],
    masRange: [12, 22],
    baseFee: 15,
    imagePath: REGION_SCAN_IMAGES.cervical,
    clinicalTipAr:
      'الوضع الجانبي الواقف (Erect Lateral) يُظهر الفقرات C1–C7 واستقامة العمود العنقي مع خفض الكتفين.',
  },
  {
    id: 'lumbar_ap',
    titleAr: 'أشعة القطنية (مستلقٍ على الظهر)',
    titleEn: 'Lumbar Spine (Supine AP)',
    region: 'lumbar',
    regionLabelAr: 'أسفل الظهر',
    modality: 'XRAY',
    modalityLabelAr: 'أشعة سينية',
    recommendedProjection: 'AP',
    projectionLabelAr: 'أمامي-خلفي (AP)',
    recommendedPosture: 'SUPINE',
    postureLabelAr: 'على الظهر (Supine)',
    kvpRange: [74, 88],
    masRange: [24, 40],
    baseFee: 15,
    imagePath: REGION_SCAN_IMAGES.lumbar,
    clinicalTipAr:
      'يستلقي المريض على ظهره (Supine) لتصوير الفقرات L1–L5 بجرعة 24–40 mAs لإبراز تفاصيل العظام.',
  },
  {
    id: 'lumbar_lat_left',
    titleAr: 'أشعة القطنية الجانبية (نائم يسار)',
    titleEn: 'Lumbar Spine (Left Lateral)',
    region: 'lumbar',
    regionLabelAr: 'أسفل الظهر',
    modality: 'XRAY',
    modalityLabelAr: 'أشعة سينية',
    recommendedProjection: 'LATERAL',
    projectionLabelAr: 'جانبي (Lateral)',
    recommendedPosture: 'TABLE_LEFT_LAT',
    postureLabelAr: 'نائم جانبياً · يسار (Left Lat)',
    kvpRange: [80, 95],
    masRange: [28, 45],
    baseFee: 15,
    imagePath: REGION_SCAN_IMAGES.lumbar,
    clinicalTipAr:
      'يستلقي المريض على جانبه الأيسر (Left Lateral) مع ثني الركبتين قليلاً لاستقرار الحوض وإظهار المسافات الغضروفية.',
  },
  {
    id: 'spine_prone',
    titleAr: 'أشعة الظهر والعمود الفقري (انبطاح)',
    titleEn: 'Thoracolumbar Spine (Prone PA)',
    region: 'lumbar',
    regionLabelAr: 'الظهر والعمود',
    modality: 'XRAY',
    modalityLabelAr: 'أشعة سينية',
    recommendedProjection: 'PA',
    projectionLabelAr: 'خلفي-أمامي (PA)',
    recommendedPosture: 'PRONE',
    postureLabelAr: 'على البطن (Prone)',
    kvpRange: [74, 88],
    masRange: [22, 38],
    baseFee: 15,
    imagePath: REGION_SCAN_IMAGES.lumbar,
    clinicalTipAr:
      'وضعية الانبطاح على البطن (Prone) تُستخدم لتقييم انحناءات العمود الفقري وتقليل تباعد الأشعة للفقرات.',
  },
  {
    id: 'chest_decubitus_right',
    titleAr: 'أشعة الصدر الجانبية (نائم يمين)',
    titleEn: 'Chest Decubitus (Right Lateral)',
    region: 'chest',
    regionLabelAr: 'الصدر',
    modality: 'XRAY',
    modalityLabelAr: 'أشعة سينية',
    recommendedProjection: 'LATERAL',
    projectionLabelAr: 'جانبي (Lateral)',
    recommendedPosture: 'TABLE_RIGHT_LAT',
    postureLabelAr: 'نائم جانبياً · يمين (Right Lat)',
    kvpRange: [100, 120],
    masRange: [3, 8],
    baseFee: 15,
    imagePath: REGION_SCAN_IMAGES.chest,
    clinicalTipAr:
      'الاستلقاء على الجانب الأيمن (Right Lateral Decubitus) يساعد في رصد تجمعات السوائل الجنبية الحرة.',
  },
  {
    id: 'hand_pa',
    titleAr: 'أشعة اليد والرسغ',
    titleEn: 'Hand & Wrist (PA)',
    region: 'hand',
    regionLabelAr: 'اليد والرسغ',
    modality: 'XRAY',
    modalityLabelAr: 'أشعة سينية',
    recommendedProjection: 'PA',
    projectionLabelAr: 'خلفي-أمامي (PA)',
    recommendedPosture: 'SUPINE',
    postureLabelAr: 'على الظهر (Supine)',
    kvpRange: [48, 60],
    masRange: [2, 5],
    baseFee: 15,
    imagePath: REGION_SCAN_IMAGES.hand,
    clinicalTipAr:
      'الأطراف الدقيقة لا تحتاج طاقة اختراق عالية؛ يُكتفى بـ 48–60 kVp لإبراز السلاميات والمشط.',
  },
  {
    id: 'knee_ap',
    titleAr: 'أشعة مفصل الركبة',
    titleEn: 'Knee Joint (AP)',
    region: 'knee',
    regionLabelAr: 'الركبة',
    modality: 'XRAY',
    modalityLabelAr: 'أشعة سينية',
    recommendedProjection: 'AP',
    projectionLabelAr: 'أمامي-خلفي (AP)',
    recommendedPosture: 'SUPINE',
    postureLabelAr: 'على الظهر (Supine)',
    kvpRange: [58, 70],
    masRange: [6, 12],
    baseFee: 15,
    imagePath: REGION_SCAN_IMAGES.knee,
    clinicalTipAr:
      'توجيه الشعاع نحو الحافة السفلية للرضفة بجرعة متوسطة (58–70 kVp) يوضح المسافة المفصلية.',
  },
  {
    id: 'pelvis_ap',
    titleAr: 'أشعة الحوض والورك',
    titleEn: 'Pelvis (Supine AP)',
    region: 'pelvis',
    regionLabelAr: 'الحوض',
    modality: 'XRAY',
    modalityLabelAr: 'أشعة سينية',
    recommendedProjection: 'AP',
    projectionLabelAr: 'أمامي-خلفي (AP)',
    recommendedPosture: 'SUPINE',
    postureLabelAr: 'على الظهر (Supine)',
    kvpRange: [74, 86],
    masRange: [20, 32],
    baseFee: 15,
    imagePath: REGION_SCAN_IMAGES.pelvis,
    clinicalTipAr:
      'الاستلقاء على الظهر (Supine) مع تدوير القدمين للداخل قليلاً يُظهر عنق عظم الفخذ بالكامل.',
  },
  {
    id: 'skull_ap',
    titleAr: 'أشعة الجمجمة والجيوب (واقف AP)',
    titleEn: 'Skull & Sinuses (Erect AP)',
    region: 'head',
    regionLabelAr: 'الرأس',
    modality: 'XRAY',
    modalityLabelAr: 'أشعة سينية',
    recommendedProjection: 'AP',
    projectionLabelAr: 'أمامي-خلفي (AP)',
    recommendedPosture: 'ERECT_AP',
    postureLabelAr: 'واقف (Erect) · AP',
    kvpRange: [70, 82],
    masRange: [14, 24],
    baseFee: 15,
    imagePath: REGION_SCAN_IMAGES.head,
    clinicalTipAr:
      'الوضعية القائمة (Erect AP) ضرورية لتصوير الجيوب الأنفية وكشف أي مستويات سوائل هوائية.',
  },
  {
    id: 'ct_chest',
    titleAr: 'أشعة مقطعية للصدر',
    titleEn: 'Chest CT Scan',
    region: 'chest',
    regionLabelAr: 'الصدر',
    modality: 'CT',
    modalityLabelAr: 'أشعة مقطعية CT',
    recommendedProjection: 'AXIAL',
    projectionLabelAr: 'مقطعي محوري (Axial)',
    recommendedPosture: 'SUPINE',
    postureLabelAr: 'على الظهر (Supine)',
    kvpRange: [115, 130],
    masRange: [30, 48],
    baseFee: 85,
    imagePath: CT_SCAN_IMAGE,
    clinicalTipAr:
      'التصوير المقطعي المحوري يعطي شرائح دقيقة ثلاثية الأبعاد للرئة والأوعية الدموية بوضع Supine.',
  },
  {
    id: 'mri_lumbar',
    titleAr: 'رنين مغناطيسي للعمود الفقري',
    titleEn: 'Lumbar Spine MRI',
    region: 'lumbar',
    regionLabelAr: 'أسفل الظهر',
    modality: 'MRI',
    modalityLabelAr: 'رنين مغناطيسي MRI',
    recommendedProjection: 'SAGITTAL',
    projectionLabelAr: 'رنين سهمي (Sagittal)',
    recommendedPosture: 'SUPINE',
    postureLabelAr: 'على الظهر (Supine)',
    kvpRange: [80, 100],
    masRange: [20, 35],
    baseFee: 150,
    imagePath: MRI_SCAN_IMAGE,
    clinicalTipAr:
      'الرنين المغناطيسي يصور الغضاريف والأعصاب بدقة فائقة دون استخدام إشعاع مؤين.',
  },
];

export const UPGRADES: UpgradeItem[] = [
  {
    id: 'lead_shield',
    titleAr: 'درع رصاصي للحماية الإشعاعية',
    subtitleAr: 'Lead Apron & Gonadal Shield',
    descriptionAr:
      'توفير دروع الرصاص الواقية للمرضى أثناء التصوير يرفع التقييم الطبي ويضيف $3 مكافأة جودة لكل فحص.',
    cost: 80,
    category: 'safety',
    benefitSummaryAr: '+$3 مكافأة أمان وجودة لكل مريض',
    imagePath: ASSETS.shopLeadApronImg,
  },
  {
    id: 'auto_processor',
    titleAr: 'ماكينة تحميض أفلام آلية',
    subtitleAr: 'Automatic Film Processor',
    descriptionAr:
      'تحميض سريع للأفلام خلال 0.5 ثانية بدلاً من التحميض اليدوي، مع وضوح تشخيصي أعلى.',
    cost: 220,
    category: 'efficiency',
    benefitSummaryAr: 'تحميض فوري + $2 مكافأة دقة',
    imagePath: ASSETS.shopAutoProcessorImg,
  },
  {
    id: 'protocol_assist',
    titleAr: 'مساعد البروتوكول الذكي',
    subtitleAr: 'Protocol Auto-Calibration',
    descriptionAr:
      'يُضيف زر ضبط تلقائي لقيم kVp و mAs والوضعية الصحيحة بنقرة واحدة لتقليل هدر الأفلام.',
    cost: 350,
    category: 'efficiency',
    benefitSummaryAr: 'زر ضبط تلقائي يمنع تلف الأفلام',
    imagePath: ASSETS.shopDrSystemImg,
  },
  {
    id: 'waiting_room',
    titleAr: 'توسعة صالة استقبال المرضى',
    subtitleAr: 'Waiting Room Expansion',
    descriptionAr:
      'زيادة سعة قائمة الانتظار من 3 إلى 6 مرضى مع استقطاب تحويلات طبية أكثر للعيادة.',
    cost: 450,
    category: 'efficiency',
    benefitSummaryAr: 'سعة 6 مرضى في قائمة الانتظار',
    imagePath: ASSETS.clinicReceptionImg,
  },
  {
    id: 'digital_dr',
    titleAr: 'جهاز الأشعة الرقمي (DR)',
    subtitleAr: 'Digital Radiography Flat-Panel',
    descriptionAr:
      'التحول للتصوير الرقمي المباشر! لا استهلاك لأفلام الأشعة بعد الآن، ورفع سعر الأشعة السينية إلى $25.',
    cost: 1200,
    category: 'modality',
    benefitSummaryAr: 'بدون استهلاك أفلام + سعر الفحص $25',
    imagePath: ASSETS.shopDrSystemImg,
  },
  {
    id: 'assistant_tech',
    titleAr: 'توظيف تقني أشعة مساعد',
    subtitleAr: 'Assistant Radiographer',
    descriptionAr:
      'تقني مساعد يدير غرفة الفحص الجانبية ويُنجز فحوصات إضافية تدر دخلاً مستمراً كل بضع ثوانٍ.',
    cost: 1800,
    category: 'staff',
    benefitSummaryAr: 'دخل تلقائي مستمر للعيادة',
    imagePath: ASSETS.shopAssistantTechImg,
  },
  {
    id: 'ct_scanner',
    titleAr: 'جهاز الأشعة المقطعية (CT)',
    subtitleAr: '64-Slice CT Scanner',
    descriptionAr:
      'يستقبل مرضى الفحوصات المقطعية المتقدمة للصدر والدماغ بعائد $85 للفحص الواحد.',
    cost: 4500,
    category: 'modality',
    benefitSummaryAr: 'يفتح فحوصات CT بعائد $85 للفحص',
    imagePath: ASSETS.shopCtScannerImg,
  },
  {
    id: 'mri_suite',
    titleAr: 'وحدة الرنين المغناطيسي (MRI)',
    subtitleAr: '1.5T MRI Imaging Suite',
    descriptionAr:
      'أعلى مستويات التصوير الطبي لتشخيص الغضاريف والأعصاب بعائد $150 للفحص الواحد.',
    cost: 9500,
    category: 'modality',
    benefitSummaryAr: 'يفتح فحوصات MRI بعائد $150 للفحص',
    imagePath: ASSETS.shopMriSuiteImg,
  },
];

export const CLINIC_RANKS: ClinicRank[] = [
  {
    id: 'starter',
    titleAr: 'عيادة أشعة ناشئة',
    minRevenue: 0,
    subtitleAr: 'جهاز تقليدي واحد وبداية المشوار المهني',
  },
  {
    id: 'neighborhood',
    titleAr: 'عيادة حي معتمدة',
    minRevenue: 300,
    subtitleAr: 'سمعة طيبة وإقبال متزايد من المرضى',
  },
  {
    id: 'specialized',
    titleAr: 'مركز الأشعة التخصصي',
    minRevenue: 1500,
    subtitleAr: 'تجهيزات متطورة وكفاءة تشخيصية عالية',
  },
  {
    id: 'diagnostic_hub',
    titleAr: 'مجمع التصوير الطبي المتكامل',
    minRevenue: 5000,
    subtitleAr: 'وجهة رئيسية لفحوصات الأشعة المقطعية والرقمية',
  },
  {
    id: 'medical_empire',
    titleAr: 'صرح التصوير التشخيصي الرائد',
    minRevenue: 12000,
    subtitleAr: 'إيرادات ضخمة وتجهيزات طبية من الطراز الأول',
  },
];

const MALE_NAMES = [
  'أحمد محمود',
  'كريم العلي',
  'يوسف حسن',
  'مصطفى كريم',
  'طارق السالم',
  'عمر خالد',
  'حسام الدين',
  'سعد الجبوري',
  'وليد المنصور',
  'ماجد الفهد',
  'باسل النجار',
  'زياد راشد',
];

const FEMALE_NAMES = [
  'سارة عبد الله',
  'نور الهدى',
  'مريم إبراهيم',
  'ليلى الشمري',
  'دينا عادل',
  'فاطمة الزهراء',
  'هدى السعيد',
  'رنا الحسن',
  'سمية طارق',
  'أمل القحطاني',
  'سلمى ناصر',
  'نجلاء فؤاد',
];

const EXAM_SCENARIOS: Record<
  string,
  {complaints: string[]; findings: string[]}
> = {
  chest_pa: {
    complaints: [
      'سعال مستمر وضيق خفيف بالتنفس منذ أسبوع',
      'فحص صدر روتيني قبل العمل',
      'ألم صدري خفيف بعد نزلة برد حادة',
    ],
    findings: [
      'الرئتان صافيتان وحجم القلب ضمن الحدود الطبيعية',
      'التهاب شعبي خفيف في الفص السفلي الأيمن',
      'تكثف رئوي بسيط يستدعي المتابعة الدوائية',
    ],
  },
  chest_lat_left: {
    complaints: [
      'متابعة التهاب رئوي في الفص السفلي يتطلب تصويراً جانبياً',
      'فحص تكميلي للصدر بالوضع الواقف الجانبي الأيسر',
    ],
    findings: [
      'الزاوية الضلعية الحجابية الخلفية صافية وخالية من الارتشاح',
      'عتامة محدودة خلف القلب تستدعي المتابعة',
    ],
  },
  chest_decubitus_right: {
    complaints: [
      'اشتباه بانصباب جنبي في الرئة اليمنى يستدعي التصوير بوضع الاستلقاء الجانبي الأيمن',
      'ألم بالصدر مع صعوبة الوقوف الطويل أثناء الفحص',
    ],
    findings: [
      'عدم وجود سوائل حرة متحركة في الجنب الأيمن',
      'طبقة ارتشاح جنبي بسيطة واضحة بالوضع الجانبي الأيمن',
    ],
  },
  cervical_lat: {
    complaints: [
      'تيبس وألم في الرقبة يمتد إلى الكتف',
      'تنميل في الأصابع بعد حادث سير بسيط',
      'آلام مزمنة في الفقرات العنقية بسبب العمل المكتبي',
    ],
    findings: [
      'استقامة طبيعية للفقرات العنقية C1-C7 دون كسور',
      'تضيق طفيف في المسافة الغضروفية بين C5 و C6',
      'تشنج عضلي مع تقوّس طفيف في الانحناء العنقي',
    ],
  },
  lumbar_ap: {
    complaints: [
      'ألم شديد أسفل الظهر بعد رفع جسم ثقيل',
      'ألم قطني مزمن مع إشعاع خفيف للساق',
      'فحص متابعة للفقرات القطنية',
    ],
    findings: [
      'الفقرات القطنية L1-L5 سليمة ومنتظمة الاصطفاف',
      'بداية خشونة وتضيق خفيف بين L4-L5',
      'التواء عضلي قطني دون إصابات عظمية',
    ],
  },
  lumbar_lat_left: {
    complaints: [
      'تقييم المسافة الغضروفية للفقرات القطنية بالاستلقاء على الجانب الأيسر',
      'ألم متزايد أسفل الظهر عند الانحناء',
    ],
    findings: [
      'استقامة طبيعية للمسافات الغضروفية القطنية دون انزلاق فقاري',
      'تضيق خفيف في الحيز الغضروفي L5-S1',
    ],
  },
  spine_prone: {
    complaints: [
      'تقييم انحناء العمود الفقري بوضعية الاستلقاء على البطن (Prone)',
      'ألم في منتصف الظهر بعد مجهود بدني',
    ],
    findings: [
      'الفقرات الصدرية والقطنية متناسقة دون انحراف جانبي ملحوظ',
      'التواء عضلي في عضلات الظهر الوسطى',
    ],
  },
  hand_pa: {
    complaints: [
      'تورم في الرسغ والأصابع بعد سقوط أثناء الرياضة',
      'ألم حاد في عظمة المشط عند تحريك الإبهام',
      'الاشتباه برضّ في سلاميات اليد اليمنى',
    ],
    findings: [
      'عظام اليد والرسغ سليمة دون كسور واضحة',
      'كسر شعري دقيق في المشط الرابع يتطلب جبيرة',
      'تورم أنسجة رخوة مع سلامة المفاصل',
    ],
  },
  knee_ap: {
    complaints: [
      'ألم وتيبس في مفصل الركبة عند صعود الدرج',
      'إصابة التواء في الركبة أثناء مباراة كرة قدم',
      'طقطقة وألم متكرر في المفصل',
    ],
    findings: [
      'المسافة المفصلية للركبة متناسقة وسليمة',
      'بداية احتكاك غضروفي خفيف في الجانب الأنسي',
      'ارتشاح بسيط داخل المفصل دون كسور عظمية',
    ],
  },
  pelvis_ap: {
    complaints: [
      'ألم في مفصل الورك الأيمن بعد تعثر في المنزل',
      'تقييم تناسق عظام الحوض',
      'وجع عميق في منطقة الورك عند المشي',
    ],
    findings: [
      'عظام الحوض ومفصلا الورك متناظران وسليمان',
      'بداية تكلس بسيط في مفصل الورك الأيمن',
      'لا توجد شروخ عظمية في عنق الفخذ',
    ],
  },
  skull_ap: {
    complaints: [
      'صداع جبهي متكرر واحتقان في الجيوب الأنفية',
      'ضربة خفيفة على الرأس تستدعي الاطمئنان',
      'ألم ضاغط حول العينين والأنف',
    ],
    findings: [
      'عظام القحف سليمة وخالية من الشروخ',
      'عتامة خفيفة توحي بالتهاب الجيوب الفكية',
      'تجاويف الجيوب الأنفية مهواة بشكل طبيعي',
    ],
  },
  ct_chest: {
    complaints: [
      'متابعة دقيقة لعقيدة رئوية بالمسح المقطعي',
      'ضيق نفس حاد يتطلب تصوير مقطعي عالي الدقة',
    ],
    findings: [
      'مقاطع الصدر طبيعية مع تروية وعائية سليمة',
      'بؤرة التهابية محدودة في الفص السفلي',
    ],
  },
  mri_lumbar: {
    complaints: [
      'عرق نسا مستمر وتقييم انزلاق غضروفي بالرنين',
      'ألم ظهر مزمن يتطلب فحص الأعصاب والأقراص',
    ],
    findings: [
      'بروز غضروفي بسيط في L4-L5 دون ضغط شديد على الحبل الشوكي',
      'الأقراص الغضروفية مرطبة وبنية القناة العصبية سليمة',
    ],
  },
};

export function getClinicRank(totalRevenue: number): ClinicRank {
  let current = CLINIC_RANKS[0];
  for (const rank of CLINIC_RANKS) {
    if (totalRevenue >= rank.minRevenue) {
      current = rank;
    }
  }
  return current;
}

export function getNextClinicRank(totalRevenue: number): ClinicRank | null {
  for (const rank of CLINIC_RANKS) {
    if (totalRevenue < rank.minRevenue) {
      return rank;
    }
  }
  return null;
}

export function getExamById(id: string): ExamProtocol {
  return EXAMS.find((e) => e.id === id) || EXAMS[0];
}

export function pickAvatarForPatient(
  gender: 'M' | 'F',
  age: number
): string {
  if (gender === 'F') {
    return age >= 42 ? PATIENT_AVATARS.womanSenior : PATIENT_AVATARS.womanYoung;
  }
  return age >= 42 ? PATIENT_AVATARS.manSenior : PATIENT_AVATARS.manYoung;
}

export function generatePatient(ownedUpgrades: UpgradeId[]): PatientCase {
  const availableExams = EXAMS.filter((exam) => {
    if (exam.modality === 'CT') return ownedUpgrades.includes('ct_scanner');
    if (exam.modality === 'MRI') return ownedUpgrades.includes('mri_suite');
    return true;
  });

  const exam =
    availableExams[Math.floor(Math.random() * availableExams.length)];
  const isFemale = Math.random() > 0.5;
  const namesPool = isFemale ? FEMALE_NAMES : MALE_NAMES;
  const nameAr = namesPool[Math.floor(Math.random() * namesPool.length)];
  const age = Math.floor(Math.random() * 52) + 18;
  const avatarPath = pickAvatarForPatient(isFemale ? 'F' : 'M', age);
  const scenario = EXAM_SCENARIOS[exam.id] || EXAM_SCENARIOS.chest_pa;
  const complaintAr =
    scenario.complaints[
      Math.floor(Math.random() * scenario.complaints.length)
    ];
  const findingAr =
    scenario.findings[Math.floor(Math.random() * scenario.findings.length)];

  return {
    id: `pt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    nameAr,
    age,
    gender: isFemale ? 'F' : 'M',
    avatarPath,
    complaintAr,
    examId: exam.id,
    findingAr,
    isUrgent: Math.random() < 0.22,
    arrivedAt: Date.now(),
  };
}

export function evaluateExposure(params: {
  exam: ExamProtocol;
  selectedRegion: BodyRegion;
  selectedProjection: ProjectionType;
  selectedPosture: PatientPosture;
  kvp: number;
  mas: number;
  shieldUsed: boolean;
  patientPrepped: boolean;
  ownedUpgrades: UpgradeId[];
}): ScanEvaluation {
  const {
    exam,
    selectedRegion,
    selectedProjection,
    selectedPosture,
    kvp,
    mas,
    shieldUsed,
    patientPrepped,
    ownedUpgrades,
  } = params;

  const hasDR = ownedUpgrades.includes('digital_dr');
  const hasAutoProc = ownedUpgrades.includes('auto_processor');
  const hasShieldUpgrade = ownedUpgrades.includes('lead_shield');

  const filmConsumed = exam.modality === 'XRAY' && !hasDR ? 1 : 0;

  if (selectedRegion !== exam.region) {
    return {
      success: false,
      reasonCode: 'WRONG_REGION',
      titleAr: 'تصوير منطقة خاطئة!',
      feedbackAr: `المريض طلب ${exam.titleAr} (${exam.regionLabelAr})، لكنك وجّهت جهاز الأشعة إلى ${REGION_LABELS_AR[selectedRegion]}. تم استهلاك الفيلم وتحتاج لإعادة التصوير.`,
      targetRegionScanned: selectedRegion,
      exposureDelta: 0,
      baseEarned: 0,
      safetyBonus: 0,
      qualityBonus: 0,
      totalEarned: 0,
      filmConsumed,
    };
  }

  if (selectedPosture !== exam.recommendedPosture) {
    return {
      success: false,
      reasonCode: 'WRONG_POSTURE',
      titleAr: 'وضعية المريض غير مطابقة!',
      feedbackAr: `الوضعية المطلوبة لهذا الفحص هي: ${POSTURE_LABELS_AR[exam.recommendedPosture]}، بينما الوضعية الحالية هي ${POSTURE_LABELS_AR[selectedPosture]}. عدّل وضعية المريض في المشهد ثلاثي الأبعاد وأعد التصوير.`,
      targetRegionScanned: selectedRegion,
      exposureDelta: 0,
      baseEarned: 0,
      safetyBonus: 0,
      qualityBonus: 0,
      totalEarned: 0,
      filmConsumed,
    };
  }

  if (selectedProjection !== exam.recommendedProjection) {
    return {
      success: false,
      reasonCode: 'WRONG_PROJECTION',
      titleAr: 'وضعية إسقاط غير مطابقة',
      feedbackAr: `البروتوكول المطلوب هو ${exam.projectionLabelAr}. يُرجى تعديل وضعية التصوير وإعادة المحاولة.`,
      targetRegionScanned: selectedRegion,
      exposureDelta: 0,
      baseEarned: 0,
      safetyBonus: 0,
      qualityBonus: 0,
      totalEarned: 0,
      filmConsumed,
    };
  }

  const [minKvp, maxKvp] = exam.kvpRange;
  const [minMas, maxMas] = exam.masRange;

  const kvpTooLow = kvp < minKvp - 6;
  const kvpTooHigh = kvp > maxKvp + 6;
  const masTooLow = mas < Math.max(1, minMas - 3);
  const masTooHigh = mas > maxMas + 5;

  if (kvpTooLow || masTooLow) {
    return {
      success: false,
      reasonCode: 'UNDEREXPOSED',
      titleAr: 'تعريض ضعيف (صورة باهتة)',
      feedbackAr: `قيم التعريض (${kvp} kVp · ${mas} mAs) أقل من اللازم؛ لم تخترق الأشعة الأنسجة بشكل كافٍ. ارفع الإعدادات إلى النطاق الموصى به (${minKvp}–${maxKvp} kVp و ${minMas}–${maxMas} mAs).`,
      targetRegionScanned: selectedRegion,
      exposureDelta: -1,
      baseEarned: 0,
      safetyBonus: 0,
      qualityBonus: 0,
      totalEarned: 0,
      filmConsumed,
    };
  }

  if (kvpTooHigh || masTooHigh) {
    return {
      success: false,
      reasonCode: 'OVEREXPOSED',
      titleAr: 'تعريض زائد (فيلم محترق)',
      feedbackAr: `قيم التعريض (${kvp} kVp · ${mas} mAs) مرتفعة جداً مما أدى لاسوداد الفيلم وفقدان التفاصيل. التزم بنطاق (${minKvp}–${maxKvp} kVp و ${minMas}–${maxMas} mAs).`,
      targetRegionScanned: selectedRegion,
      exposureDelta: 1,
      baseEarned: 0,
      safetyBonus: 0,
      qualityBonus: 0,
      totalEarned: 0,
      filmConsumed,
    };
  }

  const baseEarned = exam.modality === 'XRAY' && hasDR ? 25 : exam.baseFee;
  const safetyBonus = hasShieldUpgrade && shieldUsed ? 3 : 0;
  const qualityBonus = (hasAutoProc ? 2 : 0) + (patientPrepped ? 2 : 0);
  const totalEarned = baseEarned + safetyBonus + qualityBonus;

  return {
    success: true,
    reasonCode: 'OPTIMAL',
    titleAr: 'صورة أشعة واضحة ومعتمدة',
    feedbackAr: patientPrepped
      ? 'تباين العظام والأنسجة مثالي بفضل تحضير المريض وتثبيت الوضعية (+$2 جودة إضافية).'
      : 'تباين العظام والأنسجة مثالي للتشخيص الطبي. يمكنك الآن اعتماد النتيجة وتحصيل الرسوم.',
    targetRegionScanned: selectedRegion,
    exposureDelta: 0,
    baseEarned,
    safetyBonus,
    qualityBonus,
    totalEarned,
    filmConsumed,
  };
}
