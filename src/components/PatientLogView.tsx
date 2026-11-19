import React from 'react';
import {FileText} from 'lucide-react';
import type {CompletedCase} from '../types/radiology';
import {PATIENT_AVATARS, REGION_SCAN_IMAGES} from '../data/radiologyData';

interface PatientLogViewProps {
  cases: CompletedCase[];
  totalRevenue: number;
  retakesCount: number;
}

export const PatientLogView: React.FC<PatientLogViewProps> = ({
  cases,
  totalRevenue,
  retakesCount,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            سجل الحالات والفحوصات المنجزة
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            أرشيف الفحوصات الإشعاعية وصور المرضى التي تم تصويرها واعتماد تقاريرها في العيادة.
          </p>
        </div>
        <div className="flex items-center gap-6 text-sm text-slate-300">
          <div>
            <span className="text-slate-400">إجمالي الإيرادات: </span>
            <span className="font-mono-num font-bold text-emerald-400">
              ${totalRevenue.toLocaleString('en-US')}
            </span>
          </div>
          <div>
            <span className="text-slate-400">إعادات التصوير: </span>
            <span className="font-mono-num font-bold text-amber-300">
              {retakesCount}
            </span>
          </div>
        </div>
      </div>

      {cases.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-[#131C29] p-12 text-center space-y-2">
          <FileText className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-base font-medium text-slate-300">
            لا توجد حالات مسجلة بعد
          </p>
          <p className="text-xs text-slate-500">
            ابدأ باستقبال المريض الأول في غرفة التصوير لتظهر التقارير والصور هنا.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-[#131C29] overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-400">
                <th className="py-3.5 px-4 font-medium">المريض</th>
                <th className="py-3.5 px-4 font-medium">صورة الفحص</th>
                <th className="py-3.5 px-4 font-medium">إعدادات التعريض</th>
                <th className="py-3.5 px-4 font-medium">النتيجة التشخيصية</th>
                <th className="py-3.5 px-4 font-medium">الرسوم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-sm">
              {cases.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-white whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <img
                        src={c.patientAvatarPath || PATIENT_AVATARS.manYoung}
                        alt={c.patientNameAr}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-lg object-cover border border-slate-700 shrink-0"
                      />
                      <span>{c.patientNameAr}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={c.examImagePath || REGION_SCAN_IMAGES.chest}
                        alt={c.examTitleAr}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-md object-cover border border-slate-800 bg-black shrink-0"
                      />
                      <span>{c.examTitleAr}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono-num text-xs text-cyan-300 whitespace-nowrap">
                    {c.kvpUsed} kVp · {c.masUsed} mAs
                    {c.shieldUsed ? ' · حماية' : ''}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-300 max-w-md">
                    {c.findingAr}
                  </td>
                  <td className="py-3.5 px-4 font-mono-num font-bold text-emerald-400 whitespace-nowrap">
                    +${c.earned}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
