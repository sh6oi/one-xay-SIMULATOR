import React from 'react';
import {
  CheckCircle2,
  Crosshair,
  ShieldCheck,
  Sparkles,
  Wind,
} from 'lucide-react';
import type {
  BodyRegion,
  ExamProtocol,
  PatientCase,
  UpgradeId,
} from '../types/radiology';
import {
  CLINIC_ROOM_IMAGE,
  FILM_CARTON_IMAGE,
  REGION_LABELS_AR,
  UPGRADES,
} from '../data/radiologyData';
import {ASSETS} from '../data/assets';

interface PatientTableStageProps {
  patient: PatientCase | null;
  requestedExam: ExamProtocol;
  selectedRegion: BodyRegion;
  onSelectRegion: (region: BodyRegion) => void;
  shieldUsed: boolean;
  patientPrepped: boolean;
  onPrepPatient: () => void;
  isExposing: boolean;
  filmsRemaining: number;
  ownedUpgrades: UpgradeId[];
}

interface RegionHotspot {
  id: BodyRegion;
  label: string;
  cx: number;
  cy: number;
  w: number;
  h: number;
}

const HOTSPOTS: RegionHotspot[] = [
  {id: 'head', label: 'الرأس', cx: 210, cy: 56, w: 64, h: 56},
  {id: 'cervical', label: 'الرقبة', cx: 210, cy: 96, w: 54, h: 32},
  {id: 'chest', label: 'الصدر', cx: 210, cy: 152, w: 102, h: 74},
  {id: 'lumbar', label: 'الفقرات القطنية', cx: 210, cy: 216, w: 72, h: 52},
  {id: 'pelvis', label: 'الحوض', cx: 210, cy: 268, w: 100, h: 50},
  {id: 'hand', label: 'اليد والرسغ', cx: 112, cy: 256, w: 54, h: 58},
  {id: 'knee', label: 'الركبة', cx: 184, cy: 368, w: 62, h: 54},
];

export const PatientTableStage: React.FC<PatientTableStageProps> = ({
  patient,
  requestedExam,
  selectedRegion,
  onSelectRegion,
  shieldUsed,
  patientPrepped,
  onPrepPatient,
  isExposing,
  filmsRemaining,
  ownedUpgrades,
}) => {
  const activeSpot =
    HOTSPOTS.find((h) => h.id === selectedRegion) || HOTSPOTS[2];

  const roomPhoto =
    requestedExam.modality === 'CT'
      ? ASSETS.shopCtScannerImg
      : requestedExam.modality === 'MRI'
        ? ASSETS.shopMriSuiteImg
        : CLINIC_ROOM_IMAGE;

  const hasDR = ownedUpgrades.includes('digital_dr');
  const installedGear = UPGRADES.filter((u) => ownedUpgrades.includes(u.id));

  return (
    <div className="flex flex-col rounded-xl border border-slate-800 bg-[#0E1622] overflow-hidden select-none">
      {/* Live Illustrated Room Header with Patient Consultation Bubble */}
      <div className="relative h-36 sm:h-40 w-full overflow-hidden border-b border-slate-800">
        <img
          src={roomPhoto}
          alt="غرفة التصوير الإشعاعي النشطة"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0E1622] via-[#0E1622]/60 to-transparent" />

        {/* Patient Live Dialog Overlay */}
        {patient && (
          <div className="absolute bottom-3 right-4 left-4 flex items-end justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={patient.avatarPath}
                alt={patient.nameAr}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-xl object-cover border-2 border-cyan-400/60 shrink-0 shadow-lg"
              />
              <div className="rounded-lg bg-[#0B111A]/90 border border-slate-700/80 px-3.5 py-2 text-xs text-slate-100 max-w-md backdrop-blur-sm">
                <div className="font-semibold text-cyan-300">
                  {patient.nameAr}
                </div>
                <p className="mt-0.5 text-slate-200 leading-snug line-clamp-2">
                  {patientPrepped
                    ? requestedExam.region === 'chest'
                      ? 'حاضر دكتور، أخذت نفساً عميقاً وكتمت نفسي للتصوير!'
                      : 'تم نزع المعادن وأنا ثابت تماماً على منضدة الأشعة.'
                    : `"${patient.complaintAr}"`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onPrepPatient}
              disabled={patientPrepped}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer transition-colors ${
                patientPrepped
                  ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/50 cursor-default'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md'
              }`}
            >
              {patientPrepped ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>المريض جاهز (+$2)</span>
                </>
              ) : requestedExam.region === 'chest' ? (
                <>
                  <Wind className="w-3.5 h-3.5 shrink-0" />
                  <span>اطلب كتم النفس (+$2)</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>تحضير وتثبيت المريض (+$2)</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Positioning Sub-header */}
      <div className="px-5 py-3 flex items-center justify-between gap-4 border-b border-slate-800/80 bg-[#101927]">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <Crosshair className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>انقر على الجسم لتوجيه أنبوب الأشعة</span>
        </div>
        <span className="text-xs font-semibold text-cyan-300">
          الهدف الحالي: {REGION_LABELS_AR[selectedRegion]}
        </span>
      </div>

      {/* Interactive Patient Anatomy Table SVG */}
      <div className="relative w-full max-w-[440px] mx-auto my-3 px-4 flex items-center justify-center">
        <svg
          viewBox="0 0 420 450"
          className="w-full h-auto max-h-[380px]"
          role="img"
          aria-label="تحديد منطقة الفحص التشريحية للمريض"
        >
          <defs>
            <radialGradient id="collimatorGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.34" />
              <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.04" />
            </radialGradient>
            <pattern
              id="tableGrid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="#1E293B"
                strokeWidth="0.7"
              />
            </pattern>
            <clipPath id="headPortraitClip">
              <ellipse cx="210" cy="54" rx="21" ry="24" />
            </clipPath>
          </defs>

          {/* Examination Table Surface */}
          <rect
            x="65"
            y="14"
            width="290"
            height="422"
            rx="16"
            fill="#142030"
            stroke="#2D4159"
            strokeWidth="1.5"
          />
          <rect
            x="77"
            y="24"
            width="266"
            height="402"
            rx="10"
            fill="url(#tableGrid)"
          />

          {/* Bucky Center Line */}
          <line
            x1="210"
            y1="26"
            x2="210"
            y2="424"
            stroke="#22D3EE"
            strokeOpacity="0.2"
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          {/* Patient Silhouette */}
          <g fill="#223247" stroke="#64748B" strokeWidth="1.6">
            <ellipse cx="210" cy="54" rx="22" ry="26" />
            <rect x="197" y="78" width="26" height="22" rx="6" />
            <path d="M155 110 C155 98, 265 98, 265 110 L256 266 C256 282, 164 282, 164 266 Z" />
            <path d="M155 114 L126 196 L112 248 L128 253 L144 202 L162 135 Z" />
            <ellipse cx="114" cy="264" rx="12" ry="18" />
            <path d="M265 114 L294 196 L308 248 L292 253 L276 202 L258 135 Z" />
            <ellipse cx="306" cy="264" rx="12" ry="18" />
            <path d="M168 274 L162 410 L188 410 L198 282 Z" />
            <path d="M252 274 L258 410 L232 410 L222 282 Z" />
          </g>

          {/* Embed Real Patient Portrait at Head of Table */}
          {patient && (
            <image
              href={patient.avatarPath}
              x="187"
              y="28"
              width="46"
              height="52"
              preserveAspectRatio="xMidYMid slice"
              clipPath="url(#headPortraitClip)"
              opacity="0.92"
            />
          )}

          {/* Subtle Skeletal Reference Landmarks */}
          <g
            stroke="#94A3B8"
            strokeWidth="1.2"
            strokeOpacity="0.45"
            fill="none"
          >
            <line x1="210" y1="84" x2="210" y2="262" strokeDasharray="3 3" />
            <path d="M174 126 Q210 118 246 126" />
            <path d="M170 142 Q210 134 250 142" />
            <path d="M172 158 Q210 150 248 158" />
            <path d="M176 174 Q210 166 244 174" />
            <path d="M174 256 Q210 278 246 256" />
          </g>

          {/* Lead Apron Shield Overlay */}
          {shieldUsed && selectedRegion !== 'pelvis' && (
            <g opacity="0.92">
              <rect
                x="170"
                y="246"
                width="80"
                height="42"
                rx="6"
                fill="#0EA5E9"
                fillOpacity="0.28"
                stroke="#38BDF8"
                strokeWidth="1.5"
                strokeDasharray="3 2"
              />
              <text
                x="210"
                y="271"
                textAnchor="middle"
                fill="#BAE6FD"
                fontSize="10"
                fontWeight="600"
              >
                درع الرصاص
              </text>
            </g>
          )}

          {/* Clickable Anatomical Regions */}
          {HOTSPOTS.map((spot) => {
            const isActive = spot.id === selectedRegion;
            return (
              <g
                key={spot.id}
                onClick={() => onSelectRegion(spot.id)}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`توجيه الجهاز نحو ${spot.label}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectRegion(spot.id);
                  }
                }}
              >
                <rect
                  x={spot.cx - spot.w / 2}
                  y={spot.cy - spot.h / 2}
                  width={spot.w}
                  height={spot.h}
                  rx="8"
                  fill={isActive ? 'url(#collimatorGlow)' : 'transparent'}
                  stroke={isActive ? '#22D3EE' : '#475569'}
                  strokeWidth={isActive ? 2.2 : 1}
                  strokeDasharray={isActive ? undefined : '3 3'}
                />
              </g>
            );
          })}

          {/* Active Collimator Crosshair Overlay */}
          <g
            style={{
              transform: `translate(${activeSpot.cx}px, ${activeSpot.cy}px)`,
              transition: 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            pointerEvents="none"
          >
            <line
              x1="-38"
              y1="0"
              x2="38"
              y2="0"
              stroke="#22D3EE"
              strokeWidth="1.4"
              strokeOpacity="0.9"
            />
            <line
              x1="0"
              y1="-32"
              x2="0"
              y2="32"
              stroke="#22D3EE"
              strokeWidth="1.4"
              strokeOpacity="0.9"
            />
            <circle
              cx="0"
              cy="0"
              r="8"
              fill="none"
              stroke="#22D3EE"
              strokeWidth="1.6"
            />
          </g>
        </svg>

        {isExposing && (
          <div
            className="absolute inset-0 rounded-xl bg-cyan-200/35 pointer-events-none transition-opacity duration-150"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Quick Anatomical Region Buttons */}
      <div className="px-5 py-3 border-t border-slate-800/80 bg-[#101927]">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {HOTSPOTS.map((spot) => {
            const active = spot.id === selectedRegion;
            return (
              <button
                key={spot.id}
                type="button"
                onClick={() => onSelectRegion(spot.id)}
                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/60'
                    : 'bg-slate-800/80 text-slate-300 border border-slate-700/70 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {spot.label}
              </button>
            );
          })}
        </div>
        {shieldUsed && (
          <div className="mt-2.5 flex items-center justify-center gap-1.5 text-xs text-sky-300">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>درع الحماية الرصاصي مُفعّل للمريض</span>
          </div>
        )}
      </div>

      {/* Active Clinic Equipment & Film Inventory Strip */}
      <div className="px-5 py-3.5 border-t border-slate-800 bg-[#0B111A]">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2.5">
          <span>تجهيزات ومخزون الغرفة</span>
          <span>
            {hasDR ? 'التصوير الرقمي نشط' : `${filmsRemaining} فيلم متاح`}
          </span>
        </div>
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          {/* Starter Film Carton Card */}
          <div className="flex items-center gap-2.5 rounded-lg border border-slate-800 bg-[#131C29] p-2 shrink-0">
            <img
              src={FILM_CARTON_IMAGE}
              alt="أفلام الأشعة"
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-md object-cover shrink-0"
            />
            <div className="text-xs">
              <div className="font-semibold text-white">أفلام الأشعة</div>
              <div className="font-mono-num text-cyan-300">
                {hasDR ? 'رقمي DR' : `${filmsRemaining} فيلم`}
              </div>
            </div>
          </div>

          {/* Starter X-Ray Room */}
          <div className="flex items-center gap-2.5 rounded-lg border border-slate-800 bg-[#131C29] p-2 shrink-0">
            <img
              src={CLINIC_ROOM_IMAGE}
              alt="جهاز الأشعة الأساسي"
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-md object-cover shrink-0"
            />
            <div className="text-xs">
              <div className="font-semibold text-white">جهاز الأشعة</div>
              <div className="text-emerald-400">نشط</div>
            </div>
          </div>

          {/* Installed Upgrades */}
          {installedGear.map((gear) => (
            <div
              key={gear.id}
              className="flex items-center gap-2.5 rounded-lg border border-emerald-800/60 bg-emerald-950/20 p-2 shrink-0"
            >
              <img
                src={gear.imagePath}
                alt={gear.titleAr}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-md object-cover shrink-0"
              />
              <div className="text-xs">
                <div className="font-semibold text-white truncate max-w-[120px]">
                  {gear.titleAr}
                </div>
                <div className="text-emerald-400">مُركّب</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
