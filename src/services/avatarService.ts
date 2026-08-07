import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { saveCustomVRM, fetchAndSaveVRMFromUrl, resetCustomVRM } from '../utils/avatarStorage';

export interface LiveAvatarSettings {
  vrmUrl: string | null;
  vrmName: string | null;
  logoUrl: string | null;
  updatedAt?: string;
  updatedBy?: string;
}

const SETTINGS_DOC_PATH = ['settings', 'avatar'] as const;
const ADMIN_PASSWORD = '100';

/**
 * Verify if entered password matches Admin Password (100)
 */
export function checkAdminPassword(password: string): boolean {
  return password.trim() === ADMIN_PASSWORD;
}

/**
 * Compress Data URL image to lightweight format (< 50KB) to ensure it fits safely inside Firestore's 1MB limit
 */
export async function compressImageForFirestore(
  dataUrl: string,
  maxWidth = 300,
  maxHeight = 300
): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl.startsWith('data:image')) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = Math.max(width, 1);
      canvas.height = Math.max(height, 1);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Real-time listener for live Avatar and Logo settings from Firebase Firestore
 */
export function subscribeLiveAvatarSettings(
  callback: (settings: LiveAvatarSettings) => void
): () => void {
  try {
    const docRef = doc(db, SETTINGS_DOC_PATH[0], SETTINGS_DOC_PATH[1]);

    const unsubscribe = onSnapshot(
      docRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as LiveAvatarSettings;
          callback({
            vrmUrl: data.vrmUrl !== undefined ? data.vrmUrl : null,
            vrmName: data.vrmName !== undefined ? data.vrmName : null,
            logoUrl: data.logoUrl !== undefined ? data.logoUrl : null,
            updatedAt: data.updatedAt,
            updatedBy: data.updatedBy
          });
        } else {
          callback({ vrmUrl: null, vrmName: null, logoUrl: null });
        }
      },
      (error) => {
        console.warn('Firestore live avatar settings listener error:', error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to live avatar settings:', err);
    return () => {};
  }
}

/**
 * Save new 3D Avatar model URL to Firebase Firestore (Admin Only)
 */
export async function updateLiveAvatarInFirebase(
  vrmUrl: string,
  vrmName: string = 'Live Admin Avatar'
): Promise<void> {
  const docRef = doc(db, SETTINGS_DOC_PATH[0], SETTINGS_DOC_PATH[1]);
  const now = new Date().toISOString();

  await setDoc(
    docRef,
    {
      vrmUrl,
      vrmName,
      updatedAt: now,
      updatedBy: 'admin'
    },
    { merge: true }
  );
}

/**
 * Save new Logo image URL / Data URL to Firebase Firestore (Admin Only)
 */
export async function updateLiveLogoInFirebase(logoUrl: string | null): Promise<void> {
  const docRef = doc(db, SETTINGS_DOC_PATH[0], SETTINGS_DOC_PATH[1]);
  const now = new Date().toISOString();

  let finalLogoUrl = logoUrl;
  if (logoUrl && logoUrl.startsWith('data:image')) {
    finalLogoUrl = await compressImageForFirestore(logoUrl, 300, 300);
  }

  await setDoc(
    docRef,
    {
      logoUrl: finalLogoUrl,
      updatedAt: now,
      updatedBy: 'admin'
    },
    { merge: true }
  );
}

/**
 * Reset live 3D Avatar in Firebase Firestore (Admin Only)
 */
export async function resetLiveAvatarInFirebase(): Promise<void> {
  const docRef = doc(db, SETTINGS_DOC_PATH[0], SETTINGS_DOC_PATH[1]);
  const now = new Date().toISOString();

  await setDoc(
    docRef,
    {
      vrmUrl: null,
      vrmName: null,
      updatedAt: now,
      updatedBy: 'admin'
    },
    { merge: true }
  );
}

/**
 * Reset live Logo in Firebase Firestore (Admin Only)
 */
export async function resetLiveLogoInFirebase(): Promise<void> {
  const docRef = doc(db, SETTINGS_DOC_PATH[0], SETTINGS_DOC_PATH[1]);
  const now = new Date().toISOString();

  await setDoc(
    docRef,
    {
      logoUrl: null,
      updatedAt: now,
      updatedBy: 'admin'
    },
    { merge: true }
  );
}

