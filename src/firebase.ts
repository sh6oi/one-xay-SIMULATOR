import {initializeApp} from 'firebase/app';
import {getAnalytics, isSupported as isAnalyticsSupported} from 'firebase/analytics';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {getDatabase, get, ref, set} from 'firebase/database';
import type {ClinicSaveState} from './types/radiology';

const firebaseConfig = {
  apiKey: 'AIzaSyAalmn8YA_1pYiUGCCD19SZjwQ5OOeXzpU',
  authDomain: 'xray-game.firebaseapp.com',
  databaseURL: 'https://xray-game-default-rtdb.firebaseio.com',
  projectId: 'xray-game',
  storageBucket: 'xray-game.firebasestorage.app',
  messagingSenderId: '188510345189',
  appId: '1:188510345189:web:72ae0e90edf8d55582c10c',
  measurementId: 'G-X09JXHF2CP',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const rtdb = getDatabase(app);

void setPersistence(auth, browserLocalPersistence).catch(() => {
  // Fallback safely if storage is restricted
});

if (typeof window !== 'undefined') {
  void isAnalyticsSupported()
    .then((supported) => {
      if (supported) {
        getAnalytics(app);
      }
    })
    .catch(() => {
      // Ignore analytics errors in sandboxed frames
    });
}

export interface AuthResult {
  user: User;
  saveState: ClinicSaveState | null;
}

export function mapFirebaseAuthError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as {code: string}).code)
      : '';

  switch (code) {
    case 'auth/email-already-in-use':
      return 'هذا البريد الإلكتروني مسجل مسبقاً. جرّب تسجيل الدخول بدلاً من إنشاء حساب جديد.';
    case 'auth/invalid-email':
      return 'صيغة البريد الإلكتروني غير صحيحة.';
    case 'auth/weak-password':
      return 'كلمة المرور ضعيفة جداً؛ يجب أن تتكون من 6 أحرف على الأقل.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
    case 'auth/too-many-requests':
      return 'تم تجاوز عدد المحاولات المسموح بها مؤقتاً. انتظر قليلاً ثم أعد المحاولة.';
    case 'auth/network-request-failed':
      return 'تعذر الاتصال بالشبكة. تحقق من اتصالك بالإنترنت وحاول مجدداً.';
    case 'auth/operation-not-allowed':
      return 'يرجى تفعيل تسجيل الدخول بالبريد الإلكتروني وكلمة المرور في إعدادات Firebase Authentication.';
    default:
      return 'حدث خطأ أثناء المصادقة. تأكد من البيانات وحاول مرة أخرى.';
  }
}

export function getLocalBackupKey(uid: string): string {
  return `radiology_clinic_save_uid_${uid}`;
}

export async function saveClinicProgressToCloud(
  uid: string,
  saveState: ClinicSaveState
): Promise<{synced: boolean}> {
  try {
    localStorage.setItem(getLocalBackupKey(uid), JSON.stringify(saveState));
  } catch {
    // Ignore storage quota issues
  }

  try {
    await set(ref(rtdb, `clinics/${uid}/save`), {
      ...saveState,
      updatedAt: Date.now(),
    });
    return {synced: true};
  } catch {
    return {synced: false};
  }
}

export async function loadClinicProgressFromCloud(uid: string): Promise<{
  saveState: ClinicSaveState | null;
  synced: boolean;
}> {
  try {
    const snap = await get(ref(rtdb, `clinics/${uid}/save`));
    if (snap.exists()) {
      const data = snap.val() as ClinicSaveState;
      try {
        localStorage.setItem(getLocalBackupKey(uid), JSON.stringify(data));
      } catch {
        // Ignore
      }
      return {saveState: data, synced: true};
    }
  } catch {
    // Fallback silently to local cache
  }

  try {
    const cached = localStorage.getItem(getLocalBackupKey(uid));
    if (cached) {
      return {
        saveState: JSON.parse(cached) as ClinicSaveState,
        synced: false,
      };
    }
  } catch {
    // Ignore
  }

  return {saveState: null, synced: false};
}

export async function registerTechAccount(params: {
  name: string;
  email: string;
  password: string;
  initialSave: ClinicSaveState;
}): Promise<AuthResult> {
  const cleanName = params.name.trim();
  const cleanEmail = params.email.trim();

  const cred = await createUserWithEmailAndPassword(
    auth,
    cleanEmail,
    params.password
  );

  if (cleanName) {
    await updateProfile(cred.user, {displayName: cleanName});
  }

  try {
    await set(ref(rtdb, `clinics/${cred.user.uid}`), {
      profile: {
        name: cleanName,
        email: cleanEmail,
        createdAt: Date.now(),
      },
      save: {
        ...params.initialSave,
        updatedAt: Date.now(),
      },
    });
  } catch {
    // Local cache handles persistence silently if RTDB rules aren't open yet
  }

  try {
    localStorage.setItem(
      getLocalBackupKey(cred.user.uid),
      JSON.stringify(params.initialSave)
    );
  } catch {
    // Ignore
  }

  return {
    user: cred.user,
    saveState: params.initialSave,
  };
}

export async function loginTechAccount(params: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const cred = await signInWithEmailAndPassword(
    auth,
    params.email.trim(),
    params.password
  );

  const loaded = await loadClinicProgressFromCloud(cred.user.uid);
  return {
    user: cred.user,
    saveState: loaded.saveState,
  };
}

export async function logoutTechAccount(): Promise<void> {
  await signOut(auth);
}
