import { supabase } from "@/integrations/supabase/client";

const DB_NAME = "rugby-offline-data";
const DB_VERSION = 2;

// Store names for different data types
const STORES = {
  players: "players",
  wellness: "wellness",
  awcr: "awcr",
  tests: "tests",
  injuries: "injuries",
  matches: "matches",
  categories: "categories",
  clubs: "clubs",
  metadata: "metadata",
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

// Open IndexedDB for data storage
function openDataDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create stores for each data type
      Object.values(STORES).forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: "id" });
          if (storeName !== "metadata") {
            store.createIndex("category_id", "category_id", { unique: false });
          }
        }
      });
    };
  });
}

// Generic function to store data
async function storeData<T extends { id: string }>(
  storeName: StoreName,
  data: T[]
): Promise<void> {
  const db = await openDataDB();
  const tx = db.transaction(storeName, "readwrite");
  const store = tx.objectStore(storeName);

  // Clear existing data first
  store.clear();

  // Add new data
  data.forEach((item) => {
    store.put(item);
  });

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

// Generic function to retrieve data
async function getData<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDataDB();
  const tx = db.transaction(storeName, "readonly");
  const store = tx.objectStore(storeName);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
    request.onsuccess = () => {
      db.close();
      resolve(request.result);
    };
  });
}

// Get data by category ID
async function getDataByCategory<T>(
  storeName: StoreName,
  categoryId: string
): Promise<T[]> {
  const db = await openDataDB();
  const tx = db.transaction(storeName, "readonly");
  const store = tx.objectStore(storeName);
  const index = store.index("category_id");

  return new Promise((resolve, reject) => {
    const request = index.getAll(categoryId);
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
    request.onsuccess = () => {
      db.close();
      resolve(request.result);
    };
  });
}

// Store last sync timestamp
async function setLastSync(timestamp: number): Promise<void> {
  const db = await openDataDB();
  const tx = db.transaction(STORES.metadata, "readwrite");
  const store = tx.objectStore(STORES.metadata);
  store.put({ id: "lastSync", value: timestamp });
  
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

// Get last sync timestamp
async function getLastSync(): Promise<number | null> {
  const db = await openDataDB();
  const tx = db.transaction(STORES.metadata, "readonly");
  const store = tx.objectStore(STORES.metadata);

  return new Promise((resolve, reject) => {
    const request = store.get("lastSync");
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
    request.onsuccess = () => {
      db.close();
      resolve(request.result?.value || null);
    };
  });
}

// Pre-load all essential data for offline use
export async function preloadOfflineData(userId: string): Promise<{
  success: boolean;
  error?: string;
  stats?: {
    clubs: number;
    categories: number;
    players: number;
    wellness: number;
    awcr: number;
    injuries: number;
    matches: number;
  };
}> {
  try {
    console.log("Starting offline data preload for user:", userId);

    // Get user's clubs
    const { data: clubs, error: clubsError } = await supabase
      .from("clubs")
      .select("*")
      .eq("user_id", userId);

    if (clubsError) throw clubsError;

    // Also get clubs where user is a member
    const { data: memberClubs, error: memberError } = await supabase
      .from("club_members")
      .select("clubs(*)")
      .eq("user_id", userId);

    if (memberError) throw memberError;

    const allClubs = [
      ...(clubs || []),
      ...(memberClubs?.map((m) => m.clubs).filter(Boolean) || []),
    ];
    
    // Remove duplicates
    const uniqueClubs = Array.from(
      new Map(allClubs.map((c) => [c?.id, c])).values()
    ).filter(Boolean);

    await storeData(STORES.clubs, uniqueClubs as { id: string }[]);

    // Get all categories for these clubs
    const clubIds = uniqueClubs.map((c) => c?.id).filter(Boolean);
    
    if (clubIds.length === 0) {
      await setLastSync(Date.now());
      return { success: true, stats: { clubs: 0, categories: 0, players: 0, wellness: 0, awcr: 0, injuries: 0, matches: 0 } };
    }

    const { data: categories, error: categoriesError } = await supabase
      .from("categories")
      .select("*")
      .in("club_id", clubIds);

    if (categoriesError) throw categoriesError;

    await storeData(STORES.categories, categories || []);

    const categoryIds = categories?.map((c) => c.id) || [];

    if (categoryIds.length === 0) {
      await setLastSync(Date.now());
      return { 
        success: true, 
        stats: { 
          clubs: uniqueClubs.length, 
          categories: 0, 
          players: 0, 
          wellness: 0, 
          awcr: 0, 
          injuries: 0, 
          matches: 0 
        } 
      };
    }

    // Fetch all essential data in parallel
    const [
      playersResult,
      wellnessResult,
      awcrResult,
      injuriesResult,
      matchesResult,
      speedTestsResult,
      jumpTestsResult,
      mobilityTestsResult,
      strengthTestsResult,
    ] = await Promise.all([
      supabase.from("players").select("*").in("category_id", categoryIds),
      supabase.from("wellness_tracking").select("*").in("category_id", categoryIds),
      supabase.from("awcr_tracking").select("*").in("category_id", categoryIds),
      supabase.from("injuries").select("*").in("category_id", categoryIds),
      supabase.from("matches").select("*").in("category_id", categoryIds),
      supabase.from("speed_tests").select("*").in("category_id", categoryIds),
      supabase.from("jump_tests").select("*").in("category_id", categoryIds),
      supabase.from("mobility_tests").select("*").in("category_id", categoryIds),
      supabase.from("strength_tests").select("*").in("category_id", categoryIds),
    ]);

    // Store all data
    await Promise.all([
      storeData(STORES.players, playersResult.data || []),
      storeData(STORES.wellness, wellnessResult.data || []),
      storeData(STORES.awcr, awcrResult.data || []),
      storeData(STORES.injuries, injuriesResult.data || []),
      storeData(STORES.matches, matchesResult.data || []),
      storeData(STORES.tests, [
        ...(speedTestsResult.data || []).map((t) => ({ ...t, testType: "speed" })),
        ...(jumpTestsResult.data || []).map((t) => ({ ...t, testType: "jump" })),
        ...(mobilityTestsResult.data || []).map((t) => ({ ...t, testType: "mobility" })),
        ...(strengthTestsResult.data || []).map((t) => ({ ...t, testType: "strength" })),
      ]),
    ]);

    await setLastSync(Date.now());

    const stats = {
      clubs: uniqueClubs.length,
      categories: categories?.length || 0,
      players: playersResult.data?.length || 0,
      wellness: wellnessResult.data?.length || 0,
      awcr: awcrResult.data?.length || 0,
      injuries: injuriesResult.data?.length || 0,
      matches: matchesResult.data?.length || 0,
    };

    console.log("Offline data preload complete:", stats);
    return { success: true, stats };
  } catch (error) {
    console.error("Failed to preload offline data:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

// Export functions for retrieving offline data
export const offlineData = {
  getClubs: () => getData<{ id: string; name: string; user_id: string }>(STORES.clubs),
  getCategories: () => getData<{ id: string; name: string; club_id: string }>(STORES.categories),
  getPlayers: () => getData<{ id: string; name: string; category_id: string }>(STORES.players),
  getPlayersByCategory: (categoryId: string) => 
    getDataByCategory<{ id: string; name: string; category_id: string }>(STORES.players, categoryId),
  getWellness: () => getData(STORES.wellness),
  getWellnessByCategory: (categoryId: string) => getDataByCategory(STORES.wellness, categoryId),
  getAwcr: () => getData(STORES.awcr),
  getAwcrByCategory: (categoryId: string) => getDataByCategory(STORES.awcr, categoryId),
  getInjuries: () => getData(STORES.injuries),
  getInjuriesByCategory: (categoryId: string) => getDataByCategory(STORES.injuries, categoryId),
  getMatches: () => getData(STORES.matches),
  getMatchesByCategory: (categoryId: string) => getDataByCategory(STORES.matches, categoryId),
  getTests: () => getData(STORES.tests),
  getTestsByCategory: (categoryId: string) => getDataByCategory(STORES.tests, categoryId),
  getLastSync,
};

// Check if we have cached data available
export async function hasOfflineData(): Promise<boolean> {
  try {
    const lastSync = await getLastSync();
    return lastSync !== null;
  } catch {
    return false;
  }
}

// Clear all offline data
export async function clearOfflineData(): Promise<void> {
  const db = await openDataDB();
  const storeNames = Object.values(STORES);
  
  for (const storeName of storeNames) {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).clear();
  }
  
  db.close();
}
