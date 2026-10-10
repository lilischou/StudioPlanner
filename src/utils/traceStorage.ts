/**
 * Stockage des fichiers de traces (couvertures + documents) dans IndexedDB.
 * Le localStorage ne contient que des références (clés) vers ces blobs.
 */
import { useEffect, useState } from 'react';

const DB_NAME = 'studioplanner_files_v1';
const STORE = 'files';

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 Mo
export const FILE_TOO_BIG_MESSAGE = 'Fichier trop lourd : ajoute plutôt un lien Drive.';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        reject(req.error);
      };
    });
  }
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        t.oncomplete = () => resolve(req.result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
  );
}

export function newFileId(): string {
  return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function putFile(blob: Blob, id: string = newFileId()): Promise<string> {
  await tx('readwrite', (s) => s.put(blob, id));
  return id;
}

export async function getFile(id: string): Promise<Blob | undefined> {
  const r = await tx<Blob | undefined>('readonly', (s) => s.get(id));
  return r ?? undefined;
}

export async function deleteFile(id: string): Promise<void> {
  try {
    await tx('readwrite', (s) => s.delete(id));
  } catch (e) {
    console.error('deleteFile failed', e);
  }
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(',');
  const mime = /data:([^;]+)/.exec(head)?.[1] || 'application/octet-stream';
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Ouvre un fichier stocké dans un nouvel onglet (fenêtre ouverte tout de suite pour éviter le blocage popup). */
export async function openStoredFile(id: string): Promise<void> {
  const w = window.open('', '_blank');
  const blob = await getFile(id);
  if (!blob) {
    w?.close();
    window.alert('Fichier introuvable sur cet appareil.');
    return;
  }
  const url = URL.createObjectURL(blob);
  if (w) w.location.href = url;
  else window.location.href = url;
  setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
}

/** Hook : URL d'objet pour un blob IndexedDB (révoquée au démontage). */
export function useStoredFileUrl(ref?: string): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!ref) {
      setUrl(undefined);
      return;
    }
    let cancelled = false;
    let created: string | undefined;
    getFile(ref)
      .then((blob) => {
        if (cancelled || !blob) return;
        created = URL.createObjectURL(blob);
        setUrl(created);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [ref]);
  return url;
}
