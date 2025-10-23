// Smart caching utility for API data with localStorage fallback
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class DataCache {
  private static getKey(type: string, identifier: string): string {
    return `cache_${type}_${identifier}`;
  }

  private static getStorage(): Storage {
    // Try sessionStorage first, fallback to localStorage
    try {
      sessionStorage.setItem('test', 'test');
      sessionStorage.removeItem('test');
      return sessionStorage;
    } catch {
      return localStorage;
    }
  }

  static set<T>(type: string, identifier: string, data: T): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now()
      };
      const storage = this.getStorage();
      storage.setItem(this.getKey(type, identifier), JSON.stringify(entry));
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }
  }

  static get<T>(type: string, identifier: string): T | null {
    try {
      const storage = this.getStorage();
      const cached = storage.getItem(this.getKey(type, identifier));
      if (!cached) return null;

      const entry: CacheEntry<T> = JSON.parse(cached);
      const age = Date.now() - entry.timestamp;

      // Check if cache is still valid
      if (age > CACHE_DURATION) {
        this.remove(type, identifier);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.warn('Failed to retrieve cached data:', error);
      return null;
    }
  }

  static remove(type: string, identifier: string): void {
    try {
      const storage = this.getStorage();
      storage.removeItem(this.getKey(type, identifier));
    } catch (error) {
      console.warn('Failed to remove cached data:', error);
    }
  }

  static clear(type?: string): void {
    try {
      const storage = this.getStorage();
      if (type) {
        // Clear all entries of a specific type
        const keysToRemove: string[] = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key?.startsWith(`cache_${type}_`)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => storage.removeItem(key));
      } else {
        // Clear all cache entries
        const keysToRemove: string[] = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key?.startsWith('cache_')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => storage.removeItem(key));
      }
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  static getAge(type: string, identifier: string): number | null {
    try {
      const storage = this.getStorage();
      const cached = storage.getItem(this.getKey(type, identifier));
      if (!cached) return null;

      const entry: CacheEntry<any> = JSON.parse(cached);
      return Date.now() - entry.timestamp;
    } catch (error) {
      return null;
    }
  }
}
