const DB_NAME = 'renderless-db';
const STORE_NAME = 'blobs';
const DB_VERSION = 1;

type BlobRecord = { key: string; blob: Blob };

const openDb = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);

  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'key' });
    }
  };

  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB.'));
});

const withStore = async <T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await openDb();

  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = run(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));

    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
    };
    transaction.onabort = () => {
      db.close();
      reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
    };
  });
};

export const putBlob = async (key: string, blob: Blob): Promise<void> => {
  await withStore('readwrite', (store) => store.put({ key, blob } satisfies BlobRecord));
};

export const getBlob = async (key: string): Promise<Blob | null> => {
  const result = await withStore<BlobRecord | undefined>('readonly', (store) => store.get(key));
  return result?.blob ?? null;
};

export const deleteBlob = async (key: string): Promise<void> => {
  await withStore('readwrite', (store) => store.delete(key));
};
