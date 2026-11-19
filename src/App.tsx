import React, {useEffect, useMemo, useRef, useState} from 'react';
import {onAuthStateChanged} from 'firebase/auth';
import {
  Activity,
  CheckCircle2,
  Coins,
  Film,
  LogOut,
  Package,
  Play,
  RotateCcw,
  Shield,
  Sliders,
  Sparkles,
  UserCheck,
  Users,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import type {
  BodyRegion,
  ClinicSaveState,
  CompletedCase,
  PatientCase,
  PatientPosture,
  ProjectionType,
  ScanEvaluation,
  ScreenMode,
  TechProfile,
  UpgradeId,
  WorkspaceTab,
} from './types/radiology';
import {
  BULK_CARTON_COST,
  BULK_CARTON_SIZE,
  CLINIC_RECEPTION_IMAGE,
  CLINIC_ROOM_IMAGE,
  FILM_CARTON_COST,
  FILM_CARTON_SIZE,
  POSTURE_LABELS_AR,
  PROJECTION_LABELS_AR,
  REGION_LABELS_AR,
  UPGRADES,
  evaluateExposure,
  generatePatient,
  getClinicRank,
  getExamById,
  getNextClinicRank,
} from './data/radiologyData';
import {
  auth,
  loadClinicProgressFromCloud,
  logoutTechAccount,
  saveClinicProgressToCloud,
  type AuthResult,
} from './firebase';
import {AuthScreen} from './components/AuthScreen';
import {RadiologyRoom3D} from './components/RadiologyRoom3D';
import {RadiographDisplay} from './components/RadiographDisplay';
import {ShopView} from './components/ShopView';
import {PatientLogView} from './components/PatientLogView';
import {ProtocolsView} from './components/ProtocolsView';
import {soundFx} from './utils/soundFx';

const INITIAL_SAVE: ClinicSaveState = {
  cash: 0,
  totalRevenue: 0,
  films: 20,
  cartonsBought: 0,
  patientsServed: 0,
  retakesCount: 0,
  filmDebt: 0,
  ownedUpgrades: [],
  completedCases: [],
  soundEnabled: true,
};

function sanitizeSaveState(raw: Partial<ClinicSaveState> | null): ClinicSaveState {
  if (!raw) return INITIAL_SAVE;
  return {
    ...INITIAL_SAVE,
    ...raw,
    ownedUpgrades: Array.isArray(raw.ownedUpgrades) ? raw.ownedUpgrades : [],
    completedCases: Array.isArray(raw.completedCases) ? raw.completedCases : [],
  };
}

function buildStarterQueue(upgrades: UpgradeId[]): PatientCase[] {
  return [
    {...generatePatient(upgrades), examId: 'chest_pa'},
    {...generatePatient(upgrades), examId: 'lumbar_ap'},
    {...generatePatient(upgrades), examId: 'spine_prone'},
  ];
}

export default function App() {
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [techProfile, setTechProfile] = useState<TechProfile | null>(null);

  const [screenMode, setScreenMode] = useState<ScreenMode>('AUTH');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('CLINIC');

  const [save, setSave] = useState<ClinicSaveState>(INITIAL_SAVE);
  const [queue, setQueue] = useState<PatientCase[]>(() => buildStarterQueue([]));
  const [activePatientId, setActivePatientId] = useState<string | null>(null);

  // Console Control State
  const [selectedRegion, setSelectedRegion] = useState<BodyRegion>('chest');
  const [selectedPosture, setSelectedPosture] =
    useState<PatientPosture>('ERECT_PA');
  const [selectedProjection, setSelectedProjection] =
    useState<ProjectionType>('PA');
  const [kvp, setKvp] = useState<number>(110);
  const [mas, setMas] = useState<number>(4);
  const [shieldUsed, setShieldUsed] = useState<boolean>(false);
  const [patientPrepped, setPatientPrepped] = useState<boolean>(false);

  // Exposure & Developing State
  const [isExposing, setIsExposing] = useState<boolean>(false);
  const [isDeveloping, setIsDeveloping] = useState<boolean>(false);
  const [currentEvaluation, setCurrentEvaluation] =
    useState<ScanEvaluation | null>(null);

  // UI Notifications & Reset Confirmation
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);
  const [roomImgError, setRoomImgError] = useState<boolean>(false);

  const exposeTimerRef = useRef<number | null>(null);
  const developTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const cloudSyncTimerRef = useRef<number | null>(null);
  const skipNextCloudSaveRef = useRef<boolean>(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMsg(null);
    }, 3600);
  };

  // Listen for persistent Firebase Auth session across visits/days
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setTechProfile(null);
        setScreenMode('AUTH');
        setAuthChecking(false);
        return;
      }

      const profile: TechProfile = {
        uid: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'تقني الأشعة',
        email: user.email || '',
      };
      setTechProfile(profile);

      const loaded = await loadClinicProgressFromCloud(user.uid);
      const restored = sanitizeSaveState(loaded.saveState);
      skipNextCloudSaveRef.current = true;
      setSave(restored);
      setQueue(buildStarterQueue(restored.ownedUpgrades));

      setScreenMode((prev) => (prev === 'AUTH' ? 'TITLE_MENU' : prev));
      setAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  // Sync sound preference & debounced save
  useEffect(() => {
    soundFx.setEnabled(save.soundEnabled);

    if (!techProfile) return;
    if (skipNextCloudSaveRef.current) {
      skipNextCloudSaveRef.current = false;
      return;
    }

    if (cloudSyncTimerRef.current) window.clearTimeout(cloudSyncTimerRef.current);
    cloudSyncTimerRef.current = window.setTimeout(() => {
      void saveClinicProgressToCloud(techProfile.uid, save);
    }, 450);
  }, [save, techProfile]);

  useEffect(() => {
    return () => {
      if (exposeTimerRef.current) window.clearTimeout(exposeTimerRef.current);
      if (developTimerRef.current) window.clearTimeout(developTimerRef.current);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (cloudSyncTimerRef.current) window.clearTimeout(cloudSyncTimerRef.current);
    };
  }, []);

  // Assistant Radiographer passive income loop
  const hasAssistant = save.ownedUpgrades.includes('assistant_tech');
  useEffect(() => {
    if (screenMode !== 'PLAYING' || !hasAssistant || !techProfile) return;
    const interval = window.setInterval(() => {
      setSave((prev) => {
        const fee = prev.ownedUpgrades.includes('digital_dr') ? 22 : 15;
        return {
          ...prev,
          cash: prev.cash + fee,
          totalRevenue: prev.totalRevenue + fee,
          patientsServed: prev.patientsServed + 1,
        };
      });
    }, 7500);
    return () => window.clearInterval(interval);
  }, [screenMode, hasAssistant, techProfile]);

  const maxQueueSize = save.ownedUpgrades.includes('waiting_room') ? 6 : 3;
  const hasDR = save.ownedUpgrades.includes('digital_dr');
  const hasAutoProc = save.ownedUpgrades.includes('auto_processor');
  const hasProtocolAssist = save.ownedUpgrades.includes('protocol_assist');
  const hasLeadShield = save.ownedUpgrades.includes('lead_shield');

  // Keep queue topped up
  useEffect(() => {
    if (queue.length < maxQueueSize) {
      const needed = maxQueueSize - queue.length;
      const newcomers = Array.from({length: needed}, () =>
        generatePatient(save.ownedUpgrades)
      );
      setQueue((prev) => [...prev, ...newcomers]);
    }
  }, [queue.length, maxQueueSize, save.ownedUpgrades]);

  const activePatient = useMemo(() => {
    if (queue.length === 0) return null;
    return queue.find((p) => p.id === activePatientId) || queue[0];
  }, [queue, activePatientId]);

  const requestedExam = useMemo(
    () =>
      activePatient
        ? getExamById(activePatient.examId)
        : getExamById('chest_pa'),
    [activePatient]
  );

  const currentRank = getClinicRank(save.totalRevenue);
  const nextRank = getNextClinicRank(save.totalRevenue);

  const handleAuthenticated = (result: AuthResult) => {
    const profile: TechProfile = {
      uid: result.user.uid,
      name:
        result.user.displayName ||
        result.user.email?.split('@')[0] ||
        'تقني الأشعة',
      email: result.user.email || '',
    };
    setTechProfile(profile);
    const restored = sanitizeSaveState(result.saveState);
    skipNextCloudSaveRef.current = true;
    setSave(restored);
    setQueue(buildStarterQueue(restored.ownedUpgrades));
    setScreenMode('PLAYING');
    setActiveTab('CLINIC');
  };

  const handleLogout = async () => {
    if (techProfile) {
      await saveClinicProgressToCloud(techProfile.uid, save);
    }
    await logoutTechAccount();
    setTechProfile(null);
    setScreenMode('AUTH');
  };

  const handleSelectPatient = (pt: PatientCase) => {
    if (isDeveloping) return;
    setActivePatientId(pt.id);
    setCurrentEvaluation(null);
    setPatientPrepped(false);
  };

  const handlePrepPatient = () => {
    if (patientPrepped || !activePatient) return;
    setPatientPrepped(true);
    soundFx.playPurchase();
    showToast('تم تجهيز المريض وتثبيت الوضعية (+$2 مكافأة جودة)');
  };

  const handleSelectPosture = (posture: PatientPosture) => {
    if (isDeveloping || isExposing || Boolean(currentEvaluation)) return;
    setSelectedPosture(posture);
    if (requestedExam.modality === 'CT' || requestedExam.modality === 'MRI') {
      return;
    }
    if (posture === 'ERECT_PA' || posture === 'PRONE') {
      setSelectedProjection('PA');
    } else if (posture === 'ERECT_AP') {
      setSelectedProjection('AP');
    } else if (
      posture === 'ERECT_LEFT_LAT' ||
      posture === 'ERECT_RIGHT_LAT' ||
      posture === 'TABLE_LEFT_LAT' ||
      posture === 'TABLE_RIGHT_LAT'
    ) {
      setSelectedProjection('LATERAL');
    } else if (posture === 'SUPINE' && selectedProjection === 'LATERAL') {
      setSelectedProjection('AP');
    }
  };

  const handleSelectProjection = (proj: ProjectionType) => {
    setSelectedProjection(proj);
    const isErect = selectedPosture.startsWith('ERECT_');
    if (proj === 'AXIAL' || proj === 'SAGITTAL') {
      setSelectedPosture('SUPINE');
      return;
    }
    if (proj === 'LATERAL') {
      if (isErect) {
        if (
          selectedPosture !== 'ERECT_LEFT_LAT' &&
          selectedPosture !== 'ERECT_RIGHT_LAT'
        ) {
          setSelectedPosture('ERECT_LEFT_LAT');
        }
      } else if (
        selectedPosture !== 'TABLE_LEFT_LAT' &&
        selectedPosture !== 'TABLE_RIGHT_LAT'
      ) {
        setSelectedPosture('TABLE_LEFT_LAT');
      }
    } else if (proj === 'PA') {
      if (isErect) setSelectedPosture('ERECT_PA');
      else if (
        selectedPosture === 'TABLE_LEFT_LAT' ||
        selectedPosture === 'TABLE_RIGHT_LAT'
      ) {
        setSelectedPosture('SUPINE');
      }
    } else if (proj === 'AP') {
      if (isErect) setSelectedPosture('ERECT_AP');
      else if (selectedPosture !== 'SUPINE') {
        setSelectedPosture('SUPINE');
      }
    }
  };

  const handleAutoCalibrate = () => {
    if (!hasProtocolAssist || !activePatient) return;
    setSelectedRegion(requestedExam.region);
    setSelectedPosture(requestedExam.recommendedPosture);
    setSelectedProjection(requestedExam.recommendedProjection);
    setKvp(
      Math.round((requestedExam.kvpRange[0] + requestedExam.kvpRange[1]) / 2)
    );
    setMas(
      Math.round((requestedExam.masRange[0] + requestedExam.masRange[1]) / 2)
    );
    if (hasLeadShield) setShieldUsed(true);
    setPatientPrepped(true);
    showToast(`تم ضبط بروتوكول ${requestedExam.titleAr} تلقائياً`);
  };

  const handleExpose = () => {
    if (!activePatient || isDeveloping || isExposing) return;

    const needsPhysicalFilm = requestedExam.modality === 'XRAY' && !hasDR;
    if (needsPhysicalFilm && save.films <= 0) {
      soundFx.playError();
      showToast('نفدت أفلام الأشعة! توجه إلى المتجر لشراء كرتون أفلام.');
      setActiveTab('SHOP');
      return;
    }

    soundFx.playExpose();
    setIsExposing(true);

    const evaluation = evaluateExposure({
      exam: requestedExam,
      selectedRegion,
      selectedProjection,
      selectedPosture,
      kvp,
      mas,
      shieldUsed: hasLeadShield && shieldUsed,
      patientPrepped,
      ownedUpgrades: save.ownedUpgrades,
    });

    if (evaluation.filmConsumed > 0 || !evaluation.success) {
      setSave((prev) => ({
        ...prev,
        films: Math.max(0, prev.films - evaluation.filmConsumed),
        retakesCount: evaluation.success
          ? prev.retakesCount
          : prev.retakesCount + 1,
      }));
    }

    if (exposeTimerRef.current) window.clearTimeout(exposeTimerRef.current);
    if (developTimerRef.current) window.clearTimeout(developTimerRef.current);

    // Let the 3D X-ray tube drop & cyan exposure cone animate for 680ms before developing
    exposeTimerRef.current = window.setTimeout(() => {
      setIsExposing(false);
      const developDelay = hasDR ? 220 : hasAutoProc ? 420 : 950;
      setIsDeveloping(true);

      developTimerRef.current = window.setTimeout(() => {
        setIsDeveloping(false);
        setCurrentEvaluation(evaluation);
        if (!evaluation.success) {
          soundFx.playError();
        }
      }, developDelay);
    }, 680);
  };

  const handleApproveAndCollect = () => {
    if (!currentEvaluation || !currentEvaluation.success || !activePatient) {
      return;
    }

    soundFx.playCashEarned();

    const gross = currentEvaluation.totalEarned;
    const debtRepayment = Math.min(save.filmDebt, gross);
    const netToCash = gross - debtRepayment;

    const record: CompletedCase = {
      id: `case-${Date.now()}`,
      patientNameAr: activePatient.nameAr,
      patientAvatarPath: activePatient.avatarPath,
      examTitleAr: requestedExam.titleAr,
      examImagePath: requestedExam.imagePath,
      modality: requestedExam.modality,
      findingAr: activePatient.findingAr,
      earned: gross,
      kvpUsed: kvp,
      masUsed: mas,
      shieldUsed: hasLeadShield && shieldUsed,
      postureUsed: selectedPosture,
      timestamp: Date.now(),
    };

    setSave((prev) => ({
      ...prev,
      cash: prev.cash + netToCash,
      totalRevenue: prev.totalRevenue + gross,
      filmDebt: prev.filmDebt - debtRepayment,
      patientsServed: prev.patientsServed + 1,
      completedCases: [record, ...prev.completedCases].slice(0, 60),
    }));

    showToast(
      debtRepayment > 0
        ? `تم تحصيل $${gross} (سُدّد $${debtRepayment} من السلفة)`
        : `تم استلام $${gross} من ${activePatient.nameAr}`
    );

    setQueue((prev) => prev.filter((p) => p.id !== activePatient.id));
    setActivePatientId(null);
    setCurrentEvaluation(null);
    setPatientPrepped(false);
  };

  const handleBuyCarton = (count: 1 | 5) => {
    const cost = count === 1 ? FILM_CARTON_COST : BULK_CARTON_COST;
    const filmsToAdd = count === 1 ? FILM_CARTON_SIZE : BULK_CARTON_SIZE;

    if (save.cash < cost) {
      soundFx.playError();
      showToast('الرصيد الحالي لا يكفي لشراء هذا العرض.');
      return;
    }

    soundFx.playPurchase();
    setSave((prev) => ({
      ...prev,
      cash: prev.cash - cost,
      films: prev.films + filmsToAdd,
      cartonsBought: prev.cartonsBought + count,
    }));
    showToast(`تمت إضافة ${filmsToAdd} فيلم أشعة إلى مخزون العيادة`);
  };

  const handleTakeEmergencyLoan = () => {
    soundFx.playPurchase();
    setSave((prev) => ({
      ...prev,
      films: prev.films + 10,
      filmDebt: prev.filmDebt + 50,
    }));
    showToast('تم استلام 10 أفلام طوارئ (آجل $50)');
  };

  const handleBuyUpgrade = (id: UpgradeId) => {
    if (save.ownedUpgrades.includes(id)) return;
    const upgrade = UPGRADES.find((u) => u.id === id);
    if (!upgrade || save.cash < upgrade.cost) {
      soundFx.playError();
      return;
    }

    soundFx.playPurchase();
    setSave((prev) => ({
      ...prev,
      cash: prev.cash - upgrade.cost,
      ownedUpgrades: [...prev.ownedUpgrades, id],
    }));

    if (id === 'lead_shield') {
      setShieldUsed(true);
    }

    showToast(`تم تركيب ${upgrade.titleAr} بنجاح`);
  };

  const handleStartNewClinic = () => {
    if (exposeTimerRef.current) window.clearTimeout(exposeTimerRef.current);
    if (developTimerRef.current) window.clearTimeout(developTimerRef.current);
    setIsExposing(false);
    setIsDeveloping(false);
    setSave(INITIAL_SAVE);
    setQueue(buildStarterQueue([]));
    setActivePatientId(null);
    setCurrentEvaluation(null);
    setPatientPrepped(false);
    setSelectedRegion('chest');
    setSelectedPosture('ERECT_PA');
    setSelectedProjection('PA');
    setKvp(110);
    setMas(4);
    setShieldUsed(false);
    setConfirmReset(false);
    setActiveTab('CLINIC');
    setScreenMode('PLAYING');
  };

  const rankProgressPct = nextRank
    ? Math.min(
        100,
        Math.round(
          ((save.totalRevenue - currentRank.minRevenue) /
            (nextRank.minRevenue - currentRank.minRevenue)) *
            100
        )
      )
    : 100;

  const availableProjections: ProjectionType[] = useMemo(() => {
    const base: ProjectionType[] = ['PA', 'AP', 'LATERAL'];
    if (save.ownedUpgrades.includes('ct_scanner')) base.push('AXIAL');
    if (save.ownedUpgrades.includes('mri_suite')) base.push('SAGITTAL');
    return base;
  }, [save.ownedUpgrades]);

  // =========================================================================
  // RENDER: AUTH LOADING CHECK
  // =========================================================================
  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#0B111A] text-slate-100 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
        <p className="text-sm text-slate-300">
          جاري التحقق من حساب العيادة واسترجاع التقدم...
        </p>
      </div>
    );
  }

  // =========================================================================
  // RENDER: AUTH SCREEN (LOGIN / REGISTER)
  // =========================================================================
  if (screenMode === 'AUTH' || !techProfile) {
    return (
      <AuthScreen
        initialSave={INITIAL_SAVE}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  // =========================================================================
  // RENDER: TITLE MENU (AFTER LOGIN)
  // =========================================================================
  if (screenMode === 'TITLE_MENU') {
    const hasProgress =
      save.patientsServed > 0 ||
      save.totalRevenue > 0 ||
      save.films !== 20 ||
      save.ownedUpgrades.length > 0;

    return (
      <div className="min-h-screen bg-[#0B111A] text-slate-100 flex flex-col">
        <header className="border-b border-slate-800/90 bg-[#0D1520]">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
            <span className="text-lg font-display font-bold text-white whitespace-nowrap shrink-0">
              عيادة الأشعة التخصصية
            </span>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
              <button
                type="button"
                onClick={() => {
                  setScreenMode('PLAYING');
                  setActiveTab('CLINIC');
                }}
                className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                غرفة التصوير
              </button>
              <button
                type="button"
                onClick={() => {
                  setScreenMode('PLAYING');
                  setActiveTab('SHOP');
                }}
                className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                المتجر والتجهيزات
              </button>
              <button
                type="button"
                onClick={() => {
                  setScreenMode('PLAYING');
                  setActiveTab('PROTOCOLS');
                }}
                className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                دليل البروتوكولات
              </button>
            </nav>
            <button
              type="button"
              onClick={() => setScreenMode('PLAYING')}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              دخول العيادة
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center py-10 px-6">
          <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#111A27] p-8 space-y-6">
              <div className="space-y-4">
                <div className="text-xs font-medium text-cyan-400">
                  مرحباً يا {techProfile.name} · حساب محفوظ
                </div>
                <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-white leading-tight [text-wrap:balance]">
                  أدِر عيادة الأشعة الخاصة بك من البداية حتى الاحتراف
                </h1>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  استقبل المرضى، جهّزهم للتصوير، اضبط طاقة الجهاز وكمية الإشعاع بدقة لتخرج صور الأشعة واضحة على لوحة الفحص الضوئية.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                <div>
                  <div className="text-xs text-slate-400">رصيدك الحالي</div>
                  <div className="mt-1 font-mono-num text-sm font-bold text-emerald-400">
                    ${save.cash.toLocaleString('en-US')}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">الأفلام المتبقية</div>
                  <div className="mt-1 font-mono-num text-sm font-bold text-cyan-300">
                    {hasDR ? 'تصوير رقمي DR' : `${save.films} فيلم`}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">تصنيف العيادة</div>
                  <div className="mt-1 text-sm font-bold text-white">
                    {currentRank.titleAr}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">أجرة الفحص الأساسي</div>
                  <div className="mt-1 font-mono-num text-sm font-bold text-white">
                    $15 · كرتون 20 فيلم بـ $100
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setScreenMode('PLAYING')}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                >
                  <Play className="w-4 h-4 shrink-0" />
                  <span>
                    {hasProgress
                      ? `متابعة العيادة ($${save.cash})`
                      : 'ابدأ العمل في العيادة'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="px-4 py-3 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-300 font-medium text-sm whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                >
                  تبديل الحساب
                </button>
              </div>
            </div>

            <div className="lg:col-span-6 rounded-2xl border border-slate-800 bg-[#0E1622] overflow-hidden flex flex-col">
              {!roomImgError ? (
                <img
                  src={CLINIC_ROOM_IMAGE}
                  alt="غرفة التصوير الإشعاعي الحديثة"
                  referrerPolicy="no-referrer"
                  onError={() => setRoomImgError(true)}
                  className="w-full h-full min-h-[280px] object-cover"
                />
              ) : (
                <div className="w-full h-full min-h-[280px] bg-gradient-to-br from-slate-900 via-[#111D2D] to-cyan-950/30 flex flex-col items-center justify-center p-8 text-center gap-3">
                  <Activity className="w-10 h-10 text-cyan-400" />
                  <p className="text-sm font-medium text-slate-300">
                    غرفة التصوير الإشعاعي جاهزة لاستقبال المرضى
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // =========================================================================
  // RENDER: ACTIVE CLINIC SIMULATION
  // =========================================================================
  const lowFilmsWarning = !hasDR && save.films <= 5;

  return (
    <div className="min-h-screen text-slate-100 flex flex-col">
      {/* Strict 3-Zone Top Bar */}
      <header className="border-b border-slate-800/80 bg-[#0A111D]/95 sticky top-0 z-30">
        <div className="max-w-[1480px] mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => setScreenMode('TITLE_MENU')}
            className="text-lg font-display font-bold text-white whitespace-nowrap shrink-0 cursor-pointer hover:text-cyan-300 transition-colors"
          >
            عيادة الأشعة التخصصية
          </button>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {(
              [
                {id: 'CLINIC', label: 'غرفة التصوير'},
                {id: 'SHOP', label: 'المتجر والتجهيزات'},
                {id: 'LOG', label: 'سجل الحالات'},
                {id: 'PROTOCOLS', label: 'دليل البروتوكولات'},
              ] as {id: WorkspaceTab; label: string}[]
            ).map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'border-cyan-400 text-white font-semibold'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => {
              if (!hasDR && save.cash >= FILM_CARTON_COST && activeTab !== 'SHOP') {
                handleBuyCarton(1);
              } else {
                setActiveTab(activeTab === 'SHOP' ? 'CLINIC' : 'SHOP');
              }
            }}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            {!hasDR && save.cash >= FILM_CARTON_COST && activeTab !== 'SHOP'
              ? 'شراء كرتون أفلام ($100)'
              : activeTab === 'SHOP'
                ? 'العودة لغرفة التصوير'
                : 'فتح المتجر'}
          </button>
        </div>

        {/* Mobile Navigation Strip */}
        <div className="md:hidden border-t border-slate-800/80 px-4 py-2 flex items-center gap-2 overflow-x-auto">
          {(
            [
              {id: 'CLINIC', label: 'التصوير'},
              {id: 'SHOP', label: 'المتجر'},
              {id: 'LOG', label: 'السجل'},
              {id: 'PROTOCOLS', label: 'البروتوكولات'},
            ] as {id: WorkspaceTab; label: string}[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-200'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-[1480px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Clinic Telemetry / KPI Strip */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-800/90 bg-[#0E1726] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] px-4 py-3.5 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-slate-400">رصيد العيادة</div>
              <div className="mt-0.5 font-mono-num text-xl font-bold text-emerald-400">
                ${save.cash.toLocaleString('en-US')}
              </div>
            </div>
            <Coins className="w-5 h-5 text-emerald-400/80 shrink-0" />
          </div>

          <div
            className={`rounded-2xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] px-4 py-3.5 flex items-center justify-between gap-3 ${
              lowFilmsWarning
                ? 'border-amber-600/70 bg-amber-950/25'
                : 'border-slate-800/90 bg-[#0E1726]'
            }`}
          >
            <div>
              <div className="text-xs text-slate-400">مخزون الأفلام</div>
              <div
                className={`mt-0.5 font-mono-num text-xl font-bold ${
                  hasDR
                    ? 'text-cyan-300'
                    : lowFilmsWarning
                      ? 'text-amber-300'
                      : 'text-white'
                }`}
              >
                {hasDR ? 'رقمي DR' : `${save.films} فيلم`}
              </div>
            </div>
            <Film
              className={`w-5 h-5 shrink-0 ${
                lowFilmsWarning ? 'text-amber-400' : 'text-cyan-400/80'
              }`}
            />
          </div>

          <div className="rounded-2xl border border-slate-800/90 bg-[#0E1726] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] px-4 py-3.5 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-slate-400">المرضى المنجزون</div>
              <div className="mt-0.5 font-mono-num text-xl font-bold text-white">
                {save.patientsServed}
              </div>
            </div>
            <UserCheck className="w-5 h-5 text-slate-400 shrink-0" />
          </div>

          <div className="rounded-2xl border border-slate-800/90 bg-[#0E1726] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] px-4 py-3.5 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400">مستوى العيادة</span>
              <span className="font-mono-num text-xs text-cyan-300">
                ${save.totalRevenue.toLocaleString('en-US')}
              </span>
            </div>
            <div className="text-sm font-bold text-white truncate">
              {currentRank.titleAr}
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-cyan-400 transition-transform duration-300"
                style={{width: `${rankProgressPct}%`}}
              />
            </div>
          </div>
        </section>

        {/* Clean Utility Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              التقني:{' '}
              <strong className="text-white font-semibold">
                {techProfile.name}
              </strong>
            </span>
            {nextRank && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  الترقية التالية: {nextRank.titleAr} ($
                  {nextRank.minRevenue.toLocaleString('en-US')})
                </span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setSave((prev) => ({
                  ...prev,
                  soundEnabled: !prev.soundEnabled,
                }))
              }
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-slate-800 text-slate-300 cursor-pointer transition-colors"
            >
              {save.soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>{save.soundEnabled ? 'الصوت مُفعّل' : 'الصوت مكتوم'}</span>
            </button>

            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة البدء</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-amber-300">تأكيد مسح التقدم؟</span>
                <button
                  type="button"
                  onClick={handleStartNewClinic}
                  className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-semibold cursor-pointer"
                >
                  نعم، ابدأ من جديد
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleLogout()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>

        {toastMsg && (
          <div className="rounded-lg border border-cyan-700/60 bg-cyan-950/50 px-4 py-2.5 text-sm text-cyan-100 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {activeTab === 'CLINIC' && (
          <div className="space-y-4">
            {lowFilmsWarning && (
              <div className="rounded-xl border border-amber-600/60 bg-amber-950/30 px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-sm text-amber-200">
                  <Package className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>
                    {save.films === 0
                      ? 'نفدت أفلام الأشعة لديك! لا يمكنك تصوير مرضى جدد قبل شراء كرتون أفلام.'
                      : `تنبيه: تبقّى لديك ${save.films} أفلام فقط في المخزون.`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {save.cash >= FILM_CARTON_COST ? (
                    <button
                      type="button"
                      onClick={() => handleBuyCarton(1)}
                      className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                    >
                      شراء كرتون (20 فيلم) — $100
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveTab('SHOP')}
                      className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                    >
                      الذهاب للمتجر
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Main Interactive 3D Stage */}
              <div className="lg:col-span-8 space-y-4">
                {isDeveloping ? (
                  <div className="rounded-2xl border border-slate-800/90 bg-[#0E1726] p-12 min-h-[550px] flex flex-col items-center justify-center gap-4 text-center">
                    <div className="w-12 h-12 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-white">
                        {hasDR
                          ? 'جاري معالجة الصورة الرقمية...'
                          : hasAutoProc
                            ? 'جاري التحميض السريع للفيلم...'
                            : 'جاري تحميض الفيلم في الغرفة المظلمة...'}
                      </h3>
                      <p className="text-xs text-slate-400">
                        يتم فحص تباين العظام والأنسجة قبل عرضها على اللوحة الضوئية
                      </p>
                    </div>
                  </div>
                ) : currentEvaluation && activePatient ? (
                  <RadiographDisplay
                    patient={activePatient}
                    requestedExam={requestedExam}
                    evaluation={currentEvaluation}
                    kvp={kvp}
                    mas={mas}
                    filmsRemaining={save.films}
                    hasDR={hasDR}
                    onApproveAndCollect={handleApproveAndCollect}
                    onRetake={() => setCurrentEvaluation(null)}
                    onGoToShop={() => setActiveTab('SHOP')}
                  />
                ) : (
                  <RadiologyRoom3D
                    patient={activePatient}
                    requestedExam={requestedExam}
                    selectedRegion={selectedRegion}
                    selectedPosture={selectedPosture}
                    onSelectRegion={setSelectedRegion}
                    onSelectPosture={handleSelectPosture}
                    shieldUsed={hasLeadShield && shieldUsed}
                    patientPrepped={patientPrepped}
                    onPrepPatient={handlePrepPatient}
                    isExposing={isExposing}
                    filmsRemaining={save.films}
                    ownedUpgrades={save.ownedUpgrades}
                    kvp={kvp}
                    mas={mas}
                  />
                )}
              </div>

              {/* Control & Patient Queue Deck */}
              <div className="lg:col-span-4 space-y-5">
                {/* Active Patient Card */}
                {activePatient && (
                  <div className="rounded-2xl border border-slate-800/90 bg-[#0E1726] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800/80">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img
                          src={activePatient.avatarPath}
                          alt={activePatient.nameAr}
                          referrerPolicy="no-referrer"
                          className="w-14 h-14 rounded-xl object-cover border border-slate-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                            <span>
                              {activePatient.gender === 'F' ? 'أنثى' : 'ذكر'} ·{' '}
                              {activePatient.age} سنة
                            </span>
                            {activePatient.isUrgent && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-amber-400 font-semibold">
                                  حالة مستعجلة
                                </span>
                              </>
                            )}
                          </div>
                          <h3 className="mt-0.5 text-lg font-bold text-white truncate">
                            {activePatient.nameAr}
                          </h3>
                        </div>
                      </div>
                      <div className="text-left shrink-0">
                        <div className="text-xs text-slate-400">الأجرة</div>
                        <div className="font-mono-num text-lg font-bold text-emerald-400">
                          $
                          {requestedExam.modality === 'XRAY' && hasDR
                            ? 25
                            : requestedExam.baseFee}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      <span className="text-slate-400">الشكوى السريرية: </span>
                      {activePatient.complaintAr}
                    </p>

                    <div className="rounded-xl bg-[#09101B] border border-slate-800/90 p-3 flex items-center gap-3.5">
                      <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-700 bg-[#0A1929] shrink-0">
                        <img
                          src={requestedExam.imagePath}
                          alt={requestedExam.titleAr}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-400">الفحص:</span>
                          <span className="text-sm font-bold text-cyan-300 truncate">
                            {requestedExam.titleAr}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-400">الوضع المطلوب:</span>
                          <span className="font-semibold text-emerald-300 truncate">
                            {POSTURE_LABELS_AR[requestedExam.recommendedPosture]}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-400">البروتوكول:</span>
                          <span className="font-mono-num text-slate-200">
                            {requestedExam.kvpRange[0]}–
                            {requestedExam.kvpRange[1]} kVp ·{' '}
                            {requestedExam.masRange[0]}–
                            {requestedExam.masRange[1]} mAs
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Exposure Console */}
                <div className="rounded-2xl border border-slate-800/90 bg-[#0E1726] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] p-5 space-y-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                      <Sliders className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>لوحة التحكم بالتعريض</span>
                    </div>
                    {hasProtocolAssist && (
                      <button
                        type="button"
                        onClick={handleAutoCalibrate}
                        disabled={Boolean(currentEvaluation) || isDeveloping}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-200 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span>ضبط تلقائي</span>
                      </button>
                    )}
                  </div>

                  {/* Projection Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">
                        إسقاط الأشعة (Projection)
                      </span>
                      <span className="text-cyan-300">
                        {PROJECTION_LABELS_AR[selectedProjection]}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {availableProjections.map((proj) => (
                        <button
                          key={proj}
                          type="button"
                          onClick={() => handleSelectProjection(proj)}
                          disabled={Boolean(currentEvaluation) || isDeveloping}
                          className={`py-2 px-2 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors disabled:opacity-60 ${
                            selectedProjection === proj
                              ? 'bg-cyan-500 text-slate-950 font-bold'
                              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          {proj}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* kVp Slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <label
                        htmlFor="kvp-slider"
                        className="text-slate-300 font-medium"
                      >
                        طاقة الاختراق (kVp)
                      </label>
                      <span className="font-mono-num text-sm font-bold text-cyan-300">
                        {kvp} kVp
                      </span>
                    </div>
                    <input
                      id="kvp-slider"
                      type="range"
                      min={45}
                      max={130}
                      step={1}
                      value={kvp}
                      disabled={Boolean(currentEvaluation) || isDeveloping}
                      onChange={(e) => setKvp(Number(e.target.value))}
                      className="w-full radiology-slider"
                    />
                    <div className="flex justify-between text-[11px] font-mono-num text-slate-500">
                      <span>45 kVp</span>
                      <span>85 kVp</span>
                      <span>130 kVp</span>
                    </div>
                  </div>

                  {/* mAs Slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <label
                        htmlFor="mas-slider"
                        className="text-slate-300 font-medium"
                      >
                        كمية الإشعاع (mAs)
                      </label>
                      <span className="font-mono-num text-sm font-bold text-cyan-300">
                        {mas} mAs
                      </span>
                    </div>
                    <input
                      id="mas-slider"
                      type="range"
                      min={1}
                      max={50}
                      step={1}
                      value={mas}
                      disabled={Boolean(currentEvaluation) || isDeveloping}
                      onChange={(e) => setMas(Number(e.target.value))}
                      className="w-full radiology-slider"
                    />
                    <div className="flex justify-between text-[11px] font-mono-num text-slate-500">
                      <span>1 mAs</span>
                      <span>25 mAs</span>
                      <span>50 mAs</span>
                    </div>
                  </div>

                  {/* Lead Shield Toggle */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs">
                      <Shield className="w-4 h-4 text-sky-400 shrink-0" />
                      <span className="text-slate-300">
                        {hasLeadShield
                          ? 'درع الحماية الرصاصي (+$3 جودة)'
                          : 'درع الحماية الرصاصي (متوفر بالمتجر $80)'}
                      </span>
                    </div>
                    {hasLeadShield ? (
                      <button
                        type="button"
                        onClick={() => setShieldUsed((v) => !v)}
                        disabled={Boolean(currentEvaluation) || isDeveloping}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                          shieldUsed
                            ? 'bg-sky-500/20 text-sky-200 border border-sky-400/60'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {shieldUsed ? 'مُفعّل' : 'غير مُفعّل'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveTab('SHOP')}
                        className="text-xs text-cyan-400 hover:text-cyan-300 underline whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        شراء
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleExpose}
                    disabled={
                      !activePatient ||
                      isExposing ||
                      isDeveloping ||
                      Boolean(currentEvaluation) ||
                      (!hasDR &&
                        requestedExam.modality === 'XRAY' &&
                        save.films <= 0)
                    }
                    className="w-full py-3.5 px-5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed transition-colors"
                  >
                    <Zap className="w-4 h-4 shrink-0" />
                    <span>
                      {isExposing
                        ? 'جاري إطلاق حزمة الأشعة...'
                        : !hasDR &&
                            requestedExam.modality === 'XRAY' &&
                            save.films <= 0
                          ? 'نفدت الأفلام — اشترِ كرتوناً من المتجر'
                          : `إطلاق الأشعة (${REGION_LABELS_AR[selectedRegion]})`}
                    </span>
                  </button>
                </div>

                {/* Waiting Room Queue with Clinic Reception Visual Banner */}
                <div className="rounded-xl border border-slate-800 bg-[#131C29] overflow-hidden">
                  <div className="relative h-24 w-full overflow-hidden border-b border-slate-800">
                    <img
                      src={CLINIC_RECEPTION_IMAGE}
                      alt="صالة استقبال المرضى"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#131C29] via-[#131C29]/45 to-transparent" />
                    <div className="absolute bottom-2.5 right-4 left-4 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-bold text-white text-sm">
                        <Users className="w-4 h-4 text-cyan-300 shrink-0" />
                        <span>صالة انتظار المرضى</span>
                      </div>
                      <span className="font-mono-num text-cyan-200 font-semibold">
                        {queue.length} / {maxQueueSize}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    {queue.map((pt) => {
                      const ptExam = getExamById(pt.examId);
                      const isActive = activePatient?.id === pt.id;
                      return (
                        <button
                          key={pt.id}
                          type="button"
                          onClick={() => handleSelectPatient(pt)}
                          className={`w-full text-right rounded-lg border p-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                            isActive
                              ? 'border-cyan-500/70 bg-cyan-950/25'
                              : 'border-slate-800 bg-[#0D141F] hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={pt.avatarPath}
                              alt={pt.nameAr}
                              referrerPolicy="no-referrer"
                              className="w-11 h-11 rounded-lg object-cover border border-slate-700 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-white truncate">
                                {pt.nameAr}
                              </div>
                              <div className="mt-0.5 text-xs text-slate-400 truncate">
                                {ptExam.titleAr} · {ptExam.projectionLabelAr}
                              </div>
                            </div>
                          </div>
                          <span className="font-mono-num text-xs font-bold text-emerald-400 shrink-0">
                            $
                            {ptExam.modality === 'XRAY' && hasDR
                              ? 25
                              : ptExam.baseFee}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'SHOP' && (
          <ShopView
            cash={save.cash}
            films={save.films}
            filmDebt={save.filmDebt}
            ownedUpgrades={save.ownedUpgrades}
            onBuyCarton={handleBuyCarton}
            onTakeEmergencyLoan={handleTakeEmergencyLoan}
            onBuyUpgrade={handleBuyUpgrade}
          />
        )}

        {activeTab === 'LOG' && (
          <PatientLogView
            cases={save.completedCases}
            totalRevenue={save.totalRevenue}
            retakesCount={save.retakesCount}
          />
        )}

        {activeTab === 'PROTOCOLS' && <ProtocolsView />}
      </main>
    </div>
  );
}
