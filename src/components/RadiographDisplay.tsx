import React, {useState} from 'react';
import {
  Contrast,
  Eye,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import type {
  ExamProtocol,
  PatientCase,
  ScanEvaluation,
} from '../types/radiology';
import {
  CT_SCAN_IMAGE,
  MRI_SCAN_IMAGE,
  REGION_LABELS_AR,
  REGION_SCAN_IMAGES,
} from '../data/radiologyData';

interface RadiographDisplayProps {
  patient: PatientCase;
  requestedExam: ExamProtocol;
  evaluation: ScanEvaluation;
  kvp: number;
  mas: number;
  filmsRemaining: number;
  hasDR: boolean;
  onApproveAndCollect: () => void;
  onRetake: () => void;
  onGoToShop: () => void;
}

export const RadiographDisplay: React.FC<RadiographDisplayProps> = ({
  patient,
  requestedExam,
  evaluation,
  kvp,
  mas,
  filmsRemaining,
  hasDR,
  onApproveAndCollect,
  onRetake,
  onGoToShop,
}) => {
  const [inverted, setInverted] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  const imageSrc =
    requestedExam.modality === 'CT'
      ? CT_SCAN_IMAGE
      : requestedExam.modality === 'MRI'
        ? MRI_SCAN_IMAGE
        : REGION_SCAN_IMAGES[evaluation.targetRegionScanned];

  let exposureFilter = 'contrast(1.08) brightness(1.08)';
  if (evaluation.exposureDelta < 0) {
    exposureFilter = 'brightness(1.85) contrast(0.45) opacity(0.7)';
  } else if (evaluation.exposureDelta > 0) {
    exposureFilter = 'brightness(0.35) contrast(1.55)';
  } else if (highContrast) {
    exposureFilter = 'contrast(1.34) brightness(1.12)';
  }

  if (inverted) {
    exposureFilter = `${exposureFilter} invert(1)`;
  }

  const outOfFilms =
    !hasDR && requestedExam.modality === 'XRAY' && filmsRemaining <= 0;

  return (
    <div className="flex flex-col rounded-xl border border-slate-700/80 bg-[#0E1622] p-5 gap-4">
      {/* Lightbox Header & Patient Identity */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <img
            src={patient.avatarPath}
            alt={patient.nameAr}
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-lg object-cover border border-cyan-500/40 shrink-0"
          />
          <div>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-100">
              <Eye className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>لوحة الفحص الضوئية · {patient.nameAr}</span>
            </div>
            <div className="text-xs text-slate-400">
              {REGION_LABELS_AR[evaluation.targetRegionScanned]} ·{' '}
              {requestedExam.modalityLabelAr}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHighContrast((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              highContrast
                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/50'
                : 'bg-slate-800 text-slate-300 border border-slate-700 hover:text-white'
            }`}
          >
            <Contrast className="w-3.5 h-3.5 shrink-0" />
            <span>تعزيز التباين</span>
          </button>
          <button
            type="button"
            onClick={() => setInverted((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              inverted
                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/50'
                : 'bg-slate-800 text-slate-300 border border-slate-700 hover:text-white'
            }`}
          >
            عكس الألوان
          </button>
          <button
            type="button"
            onClick={() => setZoomed((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer bg-slate-800 text-slate-300 border border-slate-700 hover:text-white transition-colors"
            aria-label={zoomed ? 'تصغير الصورة' : 'تكبير الصورة'}
          >
            {zoomed ? (
              <ZoomOut className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <ZoomIn className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{zoomed ? 'تصغير' : 'تكبير'}</span>
          </button>
        </div>
      </div>

      {/* Illuminated Medical Viewer Lightbox */}
      <div className="relative mx-auto w-full max-w-[440px] aspect-[4/4.3] rounded-xl bg-gradient-to-b from-[#0A1929] via-[#06111D] to-[#0A1929] border-2 border-cyan-900/60 overflow-hidden flex items-center justify-center shadow-[0_0_45px_rgba(34,211,238,0.14)]">
        <div className="absolute top-2.5 right-3 z-10 text-[11px] font-mono-num text-cyan-200 pointer-events-none text-right leading-relaxed">
          <div>{patient.nameAr}</div>
          <div>{REGION_LABELS_AR[evaluation.targetRegionScanned]}</div>
        </div>
        <div className="absolute top-2.5 left-3 z-10 text-[11px] font-mono-num text-cyan-200 pointer-events-none text-left leading-relaxed">
          <div>{kvp} kVp</div>
          <div>{mas} mAs</div>
        </div>
        <div className="absolute bottom-2.5 left-3 z-10 text-xs font-mono-num font-bold text-cyan-100 pointer-events-none">
          R
        </div>

        <div
          className="w-full h-full flex items-center justify-center transition-transform duration-200"
          style={{
            filter: exposureFilter,
            transform: zoomed ? 'scale(1.22)' : 'scale(1)',
          }}
        >
          <img
            src={imageSrc}
            alt={`صورة أشعة ${REGION_LABELS_AR[evaluation.targetRegionScanned]}`}
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Diagnostic Evaluation Result */}
      <div
        className={`rounded-lg border p-4 ${
          evaluation.success
            ? 'bg-emerald-950/35 border-emerald-700/60'
            : 'bg-amber-950/35 border-amber-700/60'
        }`}
      >
        <div className="flex items-start gap-3">
          {evaluation.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4
                className={`text-sm font-bold ${
                  evaluation.success ? 'text-emerald-300' : 'text-amber-300'
                }`}
              >
                {evaluation.titleAr}
              </h4>
              {evaluation.filmConsumed > 0 && (
                <span className="text-xs font-mono-num text-slate-400">
                  -1 فيلم أشعة
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-300 leading-relaxed">
              {evaluation.feedbackAr}
            </p>
            {evaluation.success && (
              <div className="mt-2.5 pt-2.5 border-t border-emerald-800/50 text-xs text-emerald-100/90">
                <span className="text-emerald-400 font-semibold">
                  النتيجة التشخيصية:{' '}
                </span>
                <span>{patient.findingAr}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
          {evaluation.success ? (
            <button
              type="button"
              onClick={onApproveAndCollect}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <span>اعتماد الصورة واستلام</span>
              <span className="font-mono-num">${evaluation.totalEarned}</span>
            </button>
          ) : outOfFilms ? (
            <button
              type="button"
              onClick={onGoToShop}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <span>نفدت الأفلام — اذهب للمتجر لشراء كرتون ($100)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onRetake}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>تعديل الإعدادات وإعادة التصوير</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
