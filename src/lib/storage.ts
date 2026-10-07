import type { Board } from "../types";
export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("shiye-workbench", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("draft");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(Error("请关闭其他正在升级的页面后重试"));
  });
}
export async function saveBoard(board: Board) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("draft", "readwrite");
    const store = tx.objectStore("draft");
    const old = store.get("current");
    old.onsuccess = () => {
      try {
        const keys: string[] = [];
        if (board.version >= 2 && old.result?.version === 1)
          keys.push("pre-version-two");
        if (board.version === 3 && old.result && old.result.version < 3)
          keys.push("pre-version-three");
        for (const key of keys) {
          const snapshot = store.get(key);
          snapshot.onsuccess = () => {
            try {
              if (!snapshot.result) store.put(old.result, key);
            } catch {
              tx.abort();
            }
          };
        }
        store.put(JSON.parse(JSON.stringify(board)), "current");
      } catch {
        tx.abort();
      }
    };
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = tx.onabort = () => {
      db.close();
      reject(tx.error || Error("本机空间不足"));
    };
  });
}
export async function loadOriginal(): Promise<Board | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("draft", "readonly"),
      r = tx.objectStore("draft").get("pre-version-three");
    r.onsuccess = () => {
      if (r.result) resolve(r.result);
      else {
        const old = tx.objectStore("draft").get("pre-version-two");
        old.onsuccess = () => resolve(old.result || null);
        old.onerror = () => reject(old.error);
      }
    };
    r.onerror = () => reject(r.error);
    tx.oncomplete = () => db.close();
  });
}
export async function loadBoard(): Promise<Board | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("draft", "readonly");
    const r = tx.objectStore("draft").get("current");
    r.onsuccess = () => resolve(r.result || null);
    r.onerror = () => reject(r.error);
    tx.oncomplete = () => db.close();
  });
}
