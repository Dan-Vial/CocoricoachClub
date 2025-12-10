import { supabase } from "@/integrations/supabase/client";

const DB_NAME = "rugby-offline-db";
const DB_VERSION = 1;
const STORE_NAME = "pending-operations";

export interface PendingOperation {
  id: string;
  table: string;
  operation: "insert" | "update" | "delete";
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

// Open IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("timestamp", "timestamp", { unique: false });
        store.createIndex("table", "table", { unique: false });
      }
    };
  });
}

// Add operation to queue
export async function queueOperation(
  table: string,
  operation: "insert" | "update" | "delete",
  data: Record<string, unknown>
): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  const pendingOp: PendingOperation = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    table,
    operation,
    data,
    timestamp: Date.now(),
    retryCount: 0,
  };

  store.add(pendingOp);
  db.close();
}

// Get all pending operations
export async function getPendingOperations(): Promise<PendingOperation[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const index = store.index("timestamp");

  return new Promise((resolve, reject) => {
    const request = index.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db.close();
      resolve(request.result);
    };
  });
}

// Remove operation from queue
export async function removeOperation(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.delete(id);
  db.close();
}

// Update retry count
export async function updateRetryCount(id: string, count: number): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  const getRequest = store.get(id);
  getRequest.onsuccess = () => {
    const op = getRequest.result;
    if (op) {
      op.retryCount = count;
      store.put(op);
    }
  };
  db.close();
}

// Get pending count
export async function getPendingCount(): Promise<number> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.count();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db.close();
      resolve(request.result);
    };
  });
}

// Sync a single operation
async function syncOperation(op: PendingOperation): Promise<boolean> {
  try {
    let error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any;

    switch (op.operation) {
      case "insert":
        const insertResult = await client.from(op.table).insert(op.data);
        error = insertResult.error;
        break;
      case "update":
        const { id, ...updateData } = op.data;
        const updateResult = await client.from(op.table).update(updateData).eq("id", id);
        error = updateResult.error;
        break;
      case "delete":
        const deleteResult = await client.from(op.table).delete().eq("id", op.data.id);
        error = deleteResult.error;
        break;
    }

    if (error) {
      console.error("Sync error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Sync operation failed:", error);
    return false;
  }
}

// Sync all pending operations
export async function syncAllOperations(
  onProgress?: (synced: number, total: number) => void
): Promise<{ success: number; failed: number }> {
  const operations = await getPendingOperations();
  let success = 0;
  let failed = 0;

  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];

    if (op.retryCount >= 3) {
      // Skip operations that have failed too many times
      failed++;
      continue;
    }

    const synced = await syncOperation(op);

    if (synced) {
      await removeOperation(op.id);
      success++;
    } else {
      await updateRetryCount(op.id, op.retryCount + 1);
      failed++;
    }

    onProgress?.(i + 1, operations.length);
  }

  return { success, failed };
}

// Clear all failed operations (manual cleanup)
export async function clearFailedOperations(): Promise<void> {
  const operations = await getPendingOperations();
  for (const op of operations) {
    if (op.retryCount >= 3) {
      await removeOperation(op.id);
    }
  }
}
