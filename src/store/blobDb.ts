const DB_NAME = 'renderless.db';
const DB_VERSION = 1;

type BlobStoreName = 'assets' | 'fonts';

const openDb = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);

  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains('assets')) db.createObjectStore('assets');
    if (!db.objectStoreNames.contains('fonts')) db.createObjectStore('fonts');
  };

  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB.'));
});

const runRequest = async <T>(
  storeName: BlobStoreName,
  mode: IDBTransactionMode,
  runner: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const db = await openDb();

  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = runner(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));

    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('IndexedDB transaction failed.'));
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error ?? new Error('IndexedDB transaction aborted.'));
    };
  });
};

export const putBlob = async (storeName: BlobStoreName, key: string, blob: Blob): Promise<void> => {
  await runRequest(storeName, 'readwrite', (store) => store.put(blob, key));
};

export const getBlob = async (storeName: BlobStoreName, key: string): Promise<Blob | null> => {
  const result = await runRequest<Blob | undefined>(storeName, 'readonly', (store) => store.get(key));
  return result ?? null;
};

export const deleteBlob = async (storeName: BlobStoreName, key: string): Promise<void> => {
  await runRequest(storeName, 'readwrite', (store) => store.delete(key));
};

export const clearStore = async (storeName: BlobStoreName): Promise<void> => {
  await runRequest(storeName, 'readwrite', (store) => store.clear());
};
