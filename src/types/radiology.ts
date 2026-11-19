export type BodyRegion =
  | 'head'
  | 'cervical'
  | 'chest'
  | 'lumbar'
  | 'pelvis'
  | 'hand'
  | 'knee';

export type Modality = 'XRAY' | 'CT' | 'MRI';

export type ProjectionType = 'PA' | 'AP' | 'LATERAL' | 'AXIAL' | 'SAGITTAL';

export type PatientPosture =
  | 'SUPINE'
  | 'PRONE'
  | 'TABLE_LEFT_LAT'
  | 'TABLE_RIGHT_LAT'
  | 'ERECT_PA'
  | 'ERECT_AP'
  | 'ERECT_LEFT_LAT'
  | 'ERECT_RIGHT_LAT';

export interface TechProfile {
  uid: string;
  name: string;
  email: string;
}

export interface ExamProtocol {
  id: string;
  titleAr: string;
  titleEn: string;
  region: BodyRegion;
  regionLabelAr: string;
  modality: Modality;
  modalityLabelAr: string;
  recommendedProjection: ProjectionType;
  projectionLabelAr: string;
  recommendedPosture: PatientPosture;
  postureLabelAr: string;
  kvpRange: [number, number];
  masRange: [number, number];
  baseFee: number;
  imagePath: string;
  clinicalTipAr: string;
}

export interface PatientCase {
  id: string;
  nameAr: string;
  age: number;
  gender: 'M' | 'F';
  avatarPath: string;
  complaintAr: string;
  examId: string;
  findingAr: string;
  isUrgent: boolean;
  arrivedAt: number;
}

export interface ScanEvaluation {
  success: boolean;
  reasonCode:
    | 'OPTIMAL'
    | 'WRONG_REGION'
    | 'WRONG_PROJECTION'
    | 'WRONG_POSTURE'
    | 'UNDEREXPOSED'
    | 'OVEREXPOSED';
  titleAr: string;
  feedbackAr: string;
  targetRegionScanned: BodyRegion;
  exposureDelta: number; // < 0 underexposed, > 0 overexposed, 0 optimal
  baseEarned: number;
  safetyBonus: number;
  qualityBonus: number;
  totalEarned: number;
  filmConsumed: number;
}

export interface CompletedCase {
  id: string;
  patientNameAr: string;
  patientAvatarPath?: string;
  examTitleAr: string;
  examImagePath?: string;
  modality: Modality;
  findingAr: string;
  earned: number;
  kvpUsed: number;
  masUsed: number;
  shieldUsed: boolean;
  postureUsed?: PatientPosture;
  timestamp: number;
}

export type UpgradeId =
  | 'lead_shield'
  | 'auto_processor'
  | 'protocol_assist'
  | 'waiting_room'
  | 'digital_dr'
  | 'assistant_tech'
  | 'ct_scanner'
  | 'mri_suite';

export interface UpgradeItem {
  id: UpgradeId;
  titleAr: string;
  subtitleAr: string;
  descriptionAr: string;
  cost: number;
  category: 'safety' | 'efficiency' | 'modality' | 'staff';
  benefitSummaryAr: string;
  imagePath: string;
}

export interface ClinicRank {
  id: string;
  titleAr: string;
  minRevenue: number;
  subtitleAr: string;
}

export type ScreenMode = 'AUTH' | 'TITLE_MENU' | 'PLAYING';
export type WorkspaceTab = 'CLINIC' | 'SHOP' | 'LOG' | 'PROTOCOLS';

export interface ClinicSaveState {
  cash: number;
  totalRevenue: number;
  films: number;
  cartonsBought: number;
  patientsServed: number;
  retakesCount: number;
  filmDebt: number;
  ownedUpgrades: UpgradeId[];
  completedCases: CompletedCase[];
  soundEnabled: boolean;
}
