import React from 'react';
import {EXAMS} from '../data/radiologyData';

export const ProtocolsView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-white">
          دليل بروتوكولات التصوير الإشعاعي
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          المرجع القياسي لقيم الطاقة (kVp) وكمية الإشعاع (mAs) والوضعيات المعتمدة مع نماذج الصور التشخيصية.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {EXAMS.map((exam) => (
          <div
            key={exam.id}
            className="rounded-xl border border-slate-800 bg-[#131C29] p-5 flex gap-4 items-start"
          >
            <div className="w-24 h-28 rounded-lg overflow-hidden border border-slate-800 bg-black shrink-0">
              <img
                src={exam.imagePath}
                alt={exam.titleAr}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white">
                    {exam.titleAr}
                  </h3>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                    <span>{exam.titleEn}</span>
                    <span aria-hidden="true">·</span>
                    <span>{exam.modalityLabelAr}</span>
                  </div>
                </div>
                <span className="font-mono-num text-sm font-bold text-emerald-400 shrink-0">
                  ${exam.baseFee}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                <div>
                  <div className="text-slate-400">الوضعية</div>
                  <div className="mt-0.5 font-medium text-cyan-300 truncate">
                    {exam.postureLabelAr}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">نطاق kVp</div>
                  <div className="mt-0.5 font-mono-num font-semibold text-white">
                    {exam.kvpRange[0]} – {exam.kvpRange[1]}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">نطاق mAs</div>
                  <div className="mt-0.5 font-mono-num font-semibold text-white">
                    {exam.masRange[0]} – {exam.masRange[1]}
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300/90 leading-relaxed">
                {exam.clinicalTipAr}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
