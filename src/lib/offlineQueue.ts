const DB_NAME = 'sip-offline';
const DB_VERSION = 1;
const STORE_INSERTS = 'pending_inserts';
const STORE_DELETES = 'pending_deletes';

export type PendingInsert = {
  id: string;
  user_id: string;
  amount_ml: number;
  source: string;
  logged_at: string;
};

export type PendingDelete = {
  id: string;
  deleted_at: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_INSERTS)) {
        db.createObjectStore(STORE_INSERTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_DELETES)) {
        db.createObjectStore(STORE_DELETES, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const request = run(tx.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function queueInsert(entry: PendingInsert) {
  return withStore(STORE_INSERTS, 'readwrite', (store) => store.put(entry));
}

export function removeQueuedInsert(id: string) {
  return withStore(STORE_INSERTS, 'readwrite', (store) => store.delete(id));
}

export function getAllQueuedInserts() {
  return withStore<PendingInsert[]>(STORE_INSERTS, 'readonly', (store) => store.getAll());
}

export function queueDelete(entry: PendingDelete) {
  return withStore(STORE_DELETES, 'readwrite', (store) => store.put(entry));
}

export function removeQueuedDelete(id: string) {
  return withStore(STORE_DELETES, 'readwrite', (store) => store.delete(id));
}

export function getAllQueuedDeletes() {
  return withStore<PendingDelete[]>(STORE_DELETES, 'readonly', (store) => store.getAll());
}
