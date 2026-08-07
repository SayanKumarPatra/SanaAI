// Helper to store and retrieve custom VRM Avatar models in IndexedDB for permanent local storage

const DB_NAME = 'SanaAvatarDB';
const STORE_NAME = 'vrm_store';
const AVATAR_KEY = 'active_vrm_model';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Validate if buffer is a valid GLB/VRM binary file (starts with 'glTF' 0x46546C67 or JSON '{')
 */
export function isValidVRMBuffer(buffer: ArrayBuffer): boolean {
  if (!buffer || !(buffer instanceof ArrayBuffer) || buffer.byteLength < 50) return false;
  try {
    const dataView = new DataView(buffer);
    const magic = dataView.getUint32(0, true);
    // 0x46546C67 is 'glTF' magic header in little endian
    if (magic === 0x46546C67) {
      const totalLength = dataView.getUint32(8, true);
      // Validate that the file length isn't truncated or corrupted
      if (totalLength > buffer.byteLength + 100 || totalLength < 50) {
        console.warn(`VRM file length mismatch: expected ${totalLength} bytes, but got ${buffer.byteLength} bytes.`);
        return false;
      }
      return true;
    }

    // Check if text/JSON glTF
    const headerBytes = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 100));
    const textDecoder = new TextDecoder();
    const sample = textDecoder.decode(headerBytes).trim();
    if (sample.startsWith('{') || sample.includes('"asset"') || sample.includes('asset')) return true;

    return false;
  } catch (e) {
    console.warn('Invalid buffer during VRM validation:', e);
    return false;
  }
}

/**
 * Save custom VRM File or ArrayBuffer to IndexedDB
 */
export async function saveCustomVRM(fileOrBuffer: File | ArrayBuffer, fileName: string): Promise<string> {
  let buffer: ArrayBuffer;
  if (fileOrBuffer instanceof File) {
    buffer = await fileOrBuffer.arrayBuffer();
  } else {
    buffer = fileOrBuffer;
  }

  if (!isValidVRMBuffer(buffer)) {
    throw new Error('Invalid .vrm file format. Please upload a valid 3D VRM file (not an HTML page or corrupted download).');
  }

  const blob = new Blob([buffer], { type: 'model/gltf-binary' });
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const data = {
      blob,
      fileName,
      updatedAt: Date.now()
    };
    const req = store.put(data, AVATAR_KEY);
    req.onsuccess = () => {
      const objectUrl = URL.createObjectURL(blob);
      localStorage.setItem('sana_vrm_name', fileName);
      resolve(objectUrl);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Helper to convert Google Drive URL to direct download URL or check if it's a folder
 */
export function processVRMUrl(inputUrl: string): { directUrl: string; isFolder: boolean } {
  let url = inputUrl.trim();
  if (!url) throw new Error('Please enter a valid URL');

  // Check for Google Drive folder
  if (url.includes('drive.google.com/drive/folders/') || url.includes('/folders/')) {
    return { directUrl: url, isFolder: true };
  }

  // Convert Google Drive file share link to direct download
  const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveFileMatch && driveFileMatch[1]) {
    const fileId = driveFileMatch[1];
    return { directUrl: `https://lh3.googleusercontent.com/d/${fileId}`, isFolder: false };
  }

  const driveUcMatch = url.match(/drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/);
  if (driveUcMatch && driveUcMatch[1]) {
    const fileId = driveUcMatch[1];
    return { directUrl: `https://lh3.googleusercontent.com/d/${fileId}`, isFolder: false };
  }

  return { directUrl: url, isFolder: false };
}

/**
 * Fetch a VRM model from a web URL (e.g. Google Drive direct link) and save permanently to IndexedDB
 */
export async function fetchAndSaveVRMFromUrl(url: string): Promise<string> {
  const { directUrl, isFolder } = processVRMUrl(url);

  if (isFolder) {
    throw new Error(
      'এটি একটি Google Drive ফোল্ডার লিঙ্ক। ফোল্ডার সরাসরি থ্রিডি অবতার হিসেবে লোড হয় না। অনুগ্রহ করে ড্রাইভ লিঙ্কে গিয়ে SANA.vrm ফাইলটি ডাউনলোড করে "Upload Custom .vrm Model" বোতামে আপলোড করুন!'
    );
  }

  try {
    const response = await fetch(directUrl);
    if (!response.ok) {
      throw new Error(`Failed to download VRM model from URL (HTTP ${response.status})`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      throw new Error(
        'Google Drive link returned an HTML preview page instead of direct file bytes. Please download the .vrm file directly and upload it using the file picker!'
      );
    }

    const buffer = await response.arrayBuffer();
    if (!isValidVRMBuffer(buffer)) {
      throw new Error('The URL did not return a valid .vrm 3D model binary. Please upload the .vrm file directly!');
    }

    const fileName = 'Custom_Avatar.vrm';
    return await saveCustomVRM(buffer, fileName);
  } catch (err: any) {
    throw new Error(err?.message || 'Could not fetch VRM model from URL');
  }
}

/**
 * Get stored VRM model as an Object URL
 */
export async function getCustomVRMUrl(): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(AVATAR_KEY);
      req.onsuccess = () => {
        const result = req.result;
        if (result) {
          let blob: Blob | null = null;
          if (result.blob instanceof Blob) {
            blob = result.blob;
          } else if (result.buffer && result.buffer instanceof ArrayBuffer) {
            if (isValidVRMBuffer(result.buffer)) {
              blob = new Blob([result.buffer], { type: 'model/gltf-binary' });
            }
          }

          if (blob) {
            resolve(URL.createObjectURL(blob));
            return;
          }
        }
        resolve(null);
      };
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    console.error('Failed to load custom VRM from IndexedDB:', e);
    return null;
  }
}

/**
 * Reset avatar to default SANA.vrm
 */
export async function resetCustomVRM(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(AVATAR_KEY);
    localStorage.removeItem('sana_vrm_name');
  } catch (e) {
    console.error('Failed to reset custom VRM:', e);
  }
}
