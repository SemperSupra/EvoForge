import { openDB, type IDBPDatabase } from "idb";

export type FavoriteRecord = {
  id: string;
  createdAt: string;
  label: string;
  tags: string[];
  recipeJson: any;
};

type DBSchema = {
  favorites: { key: string; value: FavoriteRecord; indexes: { "by-createdAt": string } };
  settings: { key: string; value: any };
};

let dbp: Promise<IDBPDatabase<DBSchema>> | null = null;

export function getDB() {
  if (!dbp) {
    dbp = openDB<DBSchema>("evoforge-db", 1, {
      upgrade(db) {
        const fav = db.createObjectStore("favorites", { keyPath: "id" });
        fav.createIndex("by-createdAt", "createdAt");
        db.createObjectStore("settings");
      }
    });
  }
  return dbp;
}

export async function listFavorites(): Promise<FavoriteRecord[]> {
  const db = await getDB();
  return await db.getAllFromIndex("favorites", "by-createdAt");
}
export async function putFavorite(rec: FavoriteRecord) {
  const db = await getDB();
  await db.put("favorites", rec);
}
export async function deleteFavorite(id: string) {
  const db = await getDB();
  await db.delete("favorites", id);
}

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const db = await getDB();
  return (await db.get("settings", key)) as any;
}

export async function putSetting<T>(key: string, value: T): Promise<void> {
  const db = await getDB();
  await db.put("settings", value as any, key);
}

// One transaction: invalid imports cannot leave a partially written library.
export async function importFavoritesBatch(records:FavoriteRecord[],seedKey:string,seed:string[]|null|undefined){
 const db=await getDB();const tx=db.transaction(["favorites","settings"],"readwrite");
 try{for(const rec of records)await tx.objectStore("favorites").add(rec);if(seed!==undefined)await tx.objectStore("settings").put(seed,seedKey);await tx.done;}
 catch(error){try{tx.abort();}catch{/* already aborted */}await tx.done.catch(()=>{});throw error;}
}
