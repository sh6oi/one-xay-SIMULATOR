import React, {useState} from 'react';
import {
  Package,
  ShoppingCart,
  Check,
  Shield,
  Cpu,
  Users,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import type {UpgradeId} from '../types/radiology';
import {
  BULK_CARTON_COST,
  BULK_CARTON_SIZE,
  FILM_CARTON_COST,
  FILM_CARTON_IMAGE,
  FILM_CARTON_SIZE,
  UPGRADES,
} from '../data/radiologyData';

interface ShopViewProps {
  cash: number;
  films: number;
  filmDebt: number;
  ownedUpgrades: UpgradeId[];
  onBuyCarton: (count: 1 | 5) => void;
  onTakeEmergencyLoan: () => void;
  onBuyUpgrade: (id: UpgradeId) => void;
}

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  safety: <Shield className="w-4 h-4 text-sky-400 shrink-0" />,
  efficiency: <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />,
  modality: <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />,
  staff: <Users className="w-4 h-4 text-amber-400 shrink-0" />,
};

const ShopImageFrame: React.FC<{
  src: string;
  alt: string;
  fallbackIcon: React.ReactNode;
}> = ({src, alt, fallbackIcon}) => {
  const [errored, setErrored] = useState(false);

  return (
    <div className="relative aspect-[4/3] w-full rounded-lg overflow-hidden bg-[#0B111A] border border-slate-800/90">
      {!errored ? (
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setErrored(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-slate-900 to-cyan-950/25 flex flex-col items-center justify-center gap-2 text-slate-400">
          {fallbackIcon}
          <span className="text-xs">{alt}</span>
        </div>
      )}
    </div>
  );
};

export const ShopView: React.FC<ShopViewProps> = ({
  cash,
  films,
  filmDebt,
  ownedUpgrades,
  onBuyCarton,
  onTakeEmergencyLoan,
  onBuyUpgrade,
}) => {
  const hasDR = ownedUpgrades.includes('digital_dr');
  const needsEmergencyLoan =
    !hasDR && films === 0 && cash < FILM_CARTON_COST;

  return (
    <div className="space-y-8">
      {/* Header Summary */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            متجر مستلزمات وتجهيزات الأشعة
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            اشترِ كراتين الأفلام للحفاظ على استمرار العمل، واستثمر أرباحك في أجهزة وتجهيزات العيادة.
          </p>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-slate-400">الرصيد المتاح: </span>
            <span className="font-mono-num font-bold text-emerald-400 text-base">
              ${cash.toLocaleString('en-US')}
            </span>
          </div>
          <div>
            <span className="text-slate-400">مخزون الأفلام: </span>
            <span
              className={`font-mono-num font-bold text-base ${
                hasDR
                  ? 'text-cyan-400'
                  : films <= 5
                    ? 'text-amber-400'
                    : 'text-slate-100'
              }`}
            >
              {hasDR ? 'رقمي غير محدود' : `${films} فيلم`}
            </span>
          </div>
        </div>
      </div>

      {/* Emergency Film Loan Banner */}
      {needsEmergencyLoan && (
        <div className="rounded-xl border border-amber-600/60 bg-amber-950/30 p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3 max-w-2xl">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-200">
                توريد طارئ للأفلام من المستودع الطبي
              </h3>
              <p className="mt-1 text-xs text-amber-100/80 leading-relaxed">
                نفدت جميع أفلامك ولا تملك $100 حالياً لشراء كرتون كامل. يمكنك طلب حزمة طوارئ (10 أفلام أشعة) وتُسدد قيمتها ($50) تلقائياً من عوائد المرضى القادمين.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onTakeEmergencyLoan}
            className="px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            استلام 10 أفلام طارئة (آجل $50)
          </button>
        </div>
      )}

      {filmDebt > 0 && (
        <div className="rounded-lg border border-slate-800 bg-[#131C29] px-4 py-3 text-xs text-amber-300 flex items-center justify-between">
          <span>مستحقات آجل للموزع الطبي سيتم خصمها تدريجياً من الفحوصات:</span>
          <span className="font-mono-num font-bold">${filmDebt}</span>
        </div>
      )}

      {/* Section 1: X-Ray Films */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-100">
            أفلام التصوير الإشعاعي
          </h3>
          {hasDR && (
            <span className="text-xs text-cyan-300">
              تم تفعيل التصوير الرقمي DR — لا حاجة للأفلام التقليدية
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Standard 20-Film Carton ($100) */}
          <div className="rounded-xl border border-slate-800 bg-[#131C29] p-5 flex flex-col justify-between gap-4">
            <ShopImageFrame
              src={FILM_CARTON_IMAGE}
              alt="كرتون أفلام أشعة سينية 20 فيلم"
              fallbackIcon={<Package className="w-7 h-7 text-cyan-400" />}
            />

            <div className="space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-base font-bold text-white">
                    كرتون أفلام أشعة (20 فيلم)
                  </h4>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                    <span>20 فيلم أشعة سينية</span>
                    <span aria-hidden="true">·</span>
                    <span>$5 لكل فيلم</span>
                  </div>
                </div>
                <span className="font-mono-num text-lg font-bold text-emerald-400 shrink-0">
                  ${FILM_CARTON_COST}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                الكرتون القياسي المعتمد في العيادات؛ يحقق صافي ربح $200 عند تصوير 20 مريضاً بنجاح ($300 إيرادات - $100 تكلفة).
              </p>
            </div>

            <button
              type="button"
              disabled={cash < FILM_CARTON_COST || hasDR}
              onClick={() => onBuyCarton(1)}
              className="w-full py-2.5 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed transition-colors"
            >
              <ShoppingCart className="w-4 h-4 shrink-0" />
              <span>
                {hasDR
                  ? 'غير مطلوب مع جهاز DR'
                  : `شراء كرتون (${FILM_CARTON_SIZE} فيلم) — $${FILM_CARTON_COST}`}
              </span>
            </button>
          </div>

          {/* Bulk 5-Carton Pack ($450) */}
          <div className="rounded-xl border border-slate-800 bg-[#131C29] p-5 flex flex-col justify-between gap-4">
            <ShopImageFrame
              src={FILM_CARTON_IMAGE}
              alt="حزمة جملة 5 كراتين أفلام أشعة"
              fallbackIcon={<Package className="w-7 h-7 text-slate-300" />}
            />

            <div className="space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-base font-bold text-white">
                    حزمة جملة (5 كراتين · 100 فيلم)
                  </h4>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                    <span>100 فيلم</span>
                    <span aria-hidden="true">·</span>
                    <span>توفير $50</span>
                  </div>
                </div>
                <span className="font-mono-num text-lg font-bold text-emerald-400 shrink-0">
                  ${BULK_CARTON_COST}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                توريد اقتصادي مخصص للعيادات المزدحمة؛ يغنيك عن إعادة الطلب المتكرر ويخفض تكلفة الفيلم إلى $4.50.
              </p>
            </div>

            <button
              type="button"
              disabled={cash < BULK_CARTON_COST || hasDR}
              onClick={() => onBuyCarton(5)}
              className="w-full py-2.5 px-4 rounded-lg bg-slate-100 hover:bg-white disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed transition-colors"
            >
              <ShoppingCart className="w-4 h-4 shrink-0" />
              <span>
                {hasDR
                  ? 'غير مطلوب مع جهاز DR'
                  : `شراء 5 كراتين (${BULK_CARTON_SIZE} فيلم) — $${BULK_CARTON_COST}`}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Section 2: Equipment & Clinic Upgrades */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-slate-100">
          الأجهزة الطبية وترقيات العيادة
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {UPGRADES.map((item) => {
            const isOwned = ownedUpgrades.includes(item.id);
            const canAfford = cash >= item.cost;

            return (
              <div
                key={item.id}
                className={`rounded-xl border p-5 flex flex-col justify-between gap-4 transition-colors ${
                  isOwned
                    ? 'border-emerald-800/60 bg-emerald-950/15'
                    : 'border-slate-800 bg-[#131C29]'
                }`}
              >
                <div className="space-y-4">
                  <ShopImageFrame
                    src={item.imagePath}
                    alt={item.titleAr}
                    fallbackIcon={CATEGORY_ICON[item.category]}
                  />

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {CATEGORY_ICON[item.category]}
                      <h4 className="text-base font-bold text-white leading-snug">
                        {item.titleAr}
                      </h4>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span>{item.subtitleAr}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-cyan-300">
                        {item.benefitSummaryAr}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300/90 leading-relaxed">
                      {item.descriptionAr}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
                  <span className="font-mono-num text-base font-bold text-emerald-400">
                    ${item.cost.toLocaleString('en-US')}
                  </span>

                  {isOwned ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                      <Check className="w-4 h-4 shrink-0" />
                      <span>تم التركيب في العيادة</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => onBuyUpgrade(item.id)}
                      className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed transition-colors"
                    >
                      {canAfford ? 'شراء وتركيب' : 'رصيد غير كافٍ'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
