import React, {useState} from 'react';
import {
  AlertTriangle,
  Lock,
  LogIn,
  Mail,
  User,
  UserPlus,
} from 'lucide-react';
import {
  CLINIC_ROOM_IMAGE,
  PATIENT_AVATARS,
  REGION_SCAN_IMAGES,
} from '../data/radiologyData';
import {
  loginTechAccount,
  mapFirebaseAuthError,
  registerTechAccount,
  type AuthResult,
} from '../firebase';
import type {ClinicSaveState} from '../types/radiology';

interface AuthScreenProps {
  initialSave: ClinicSaveState;
  onAuthenticated: (result: AuthResult) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  initialSave,
  onAuthenticated,
}) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('REGISTER');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [heroError, setHeroError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (mode === 'REGISTER' && name.trim().length < 2) {
      setErrorMsg('يرجى إدخال الاسم الكامل لتقني الأشعة (حرفين على الأقل).');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('يرجى إدخال بريد إلكتروني صحيح.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('كلمة المرور يجب أن تتكون من 6 أحرف على الأقل.');
      return;
    }

    setLoading(true);
    try {
      const result =
        mode === 'REGISTER'
          ? await registerTechAccount({
              name,
              email,
              password,
              initialSave,
            })
          : await loginTechAccount({
              email,
              password,
            });
      onAuthenticated(result);
    } catch (err) {
      setErrorMsg(mapFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B111A] text-slate-100 flex flex-col">
      {/* 3-Zone Top Bar */}
      <header className="border-b border-slate-800/90 bg-[#0D1520]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <span className="text-lg font-display font-bold text-white whitespace-nowrap shrink-0">
            عيادة الأشعة التخصصية
          </span>
          <div className="hidden md:flex items-center gap-6 text-sm text-slate-400">
            <span>حفظ سحابي تلقائي للتقدم</span>
            <span aria-hidden="true">·</span>
            <span>فحوصات الصدر والعمود الفقري</span>
            <span aria-hidden="true">·</span>
            <span>تجهيزات CT و MRI</span>
          </div>
          <button
            type="button"
            onClick={() => setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN')}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            {mode === 'LOGIN' ? 'إنشاء حساب جديد' : 'لدي حساب مسبق'}
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center py-10 px-6">
        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Form Column */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-[#111A27] p-7 sm:p-8 flex flex-col justify-between gap-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-white [text-wrap:balance]">
                  {mode === 'REGISTER'
                    ? 'إنشاء حساب تقني الأشعة'
                    : 'تسجيل الدخول إلى عيادتك'}
                </h1>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {mode === 'REGISTER'
                    ? 'سجّل اسمك وبريدك الإلكتروني ليتم حفظ رصيدك والأفلام والأجهزة في السحابة والعودة لها في أي وقت.'
                    : 'أدخل بريدك الإلكتروني وكلمة المرور لاستعادة عيادتك وإكمال التقدم من حيث توقفت.'}
                </p>
              </div>

              {/* Segmented Mode Switcher */}
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#0B111A] border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setMode('REGISTER');
                    setErrorMsg(null);
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                    mode === 'REGISTER'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  إنشاء حساب جديد
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('LOGIN');
                    setErrorMsg(null);
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                    mode === 'LOGIN'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  تسجيل الدخول
                </button>
              </div>

              {errorMsg && (
                <div className="rounded-lg border border-amber-600/60 bg-amber-950/35 p-3.5 flex items-start gap-2.5 text-xs text-amber-200 leading-relaxed">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'REGISTER' && (
                  <div className="space-y-1.5">
                    <label
                      htmlFor="tech-name"
                      className="block text-xs font-medium text-slate-300"
                    >
                      الاسم الكامل
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="tech-name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="مثال: تقني أشعة مجتبى كريم"
                        className="w-full rounded-lg border border-slate-700 bg-[#0B111A] pr-10 pl-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label
                    htmlFor="tech-email"
                    className="block text-xs font-medium text-slate-300"
                  >
                    البريد الإلكتروني
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="tech-email"
                      type="email"
                      required
                      dir="ltr"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full rounded-lg border border-slate-700 bg-[#0B111A] pr-10 pl-3.5 py-2.5 text-sm text-white text-left placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="tech-password"
                    className="block text-xs font-medium text-slate-300"
                  >
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="tech-password"
                      type="password"
                      required
                      minLength={6}
                      dir="ltr"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-slate-700 bg-[#0B111A] pr-10 pl-3.5 py-2.5 text-sm text-white text-left placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <span>جاري الاتصال بقاعدة البيانات...</span>
                  ) : mode === 'REGISTER' ? (
                    <>
                      <UserPlus className="w-4 h-4 shrink-0" />
                      <span>إنشاء الحساب وبدء العيادة</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 shrink-0" />
                      <span>تسجيل الدخول ومتابعة التقدم</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 leading-relaxed">
              تُحفظ بيانات جلستك تلقائياً؛ عند العودة بعد أيام ستبقى مسجلاً أو يمكنك الدخول بنفس البريد لاسترجاع رصيدك والأفلام والتجهيزات.
            </div>
          </div>

          {/* Visual Showcase Column */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-[#0E1622] overflow-hidden flex flex-col justify-between">
            <div className="relative flex-1 min-h-[260px] bg-slate-900 overflow-hidden">
              {!heroError ? (
                <img
                  src={CLINIC_ROOM_IMAGE}
                  alt="غرفة الأشعة الطبية التخصصية"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-900 to-cyan-950/30" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0E1622] via-transparent to-transparent" />
            </div>

            {/* Preview Strip: Patients & Scans */}
            <div className="p-6 space-y-4 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>عيادة متكاملة لاستقبال المرضى وفحص الصور الإشعاعية</span>
                <span className="font-mono-num text-cyan-300">
                  $15 / فحص · $100 / كرتون 20 فيلم
                </span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                {[
                  {src: PATIENT_AVATARS.manYoung, alt: 'مريض شاب'},
                  {src: PATIENT_AVATARS.womanYoung, alt: 'مريضة شابة'},
                  {src: REGION_SCAN_IMAGES.chest, alt: 'أشعة الصدر'},
                  {src: REGION_SCAN_IMAGES.cervical, alt: 'أشعة الفقرات العنقية'},
                  {src: REGION_SCAN_IMAGES.hand, alt: 'أشعة اليد'},
                  {src: PATIENT_AVATARS.manSenior, alt: 'مريض مسن'},
                ].map((thumb, idx) => (
                  <div
                    key={idx}
                    className="aspect-square rounded-lg overflow-hidden border border-slate-800 bg-black"
                  >
                    <img
                      src={thumb.src}
                      alt={thumb.alt}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
