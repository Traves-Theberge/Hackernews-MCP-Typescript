import { SimpleCache } from "./cache";

describe("SimpleCache", () => {
  let cache: SimpleCache<string>;

  beforeEach(() => {
    cache = new SimpleCache<string>(1, 3); // 1 second TTL, max 3 items
  });

  describe("basic operations", () => {
    it("should store and retrieve values", () => {
      cache.set("key1", "value1");
      expect(cache.get("key1")).toBe("value1");
    });

    it("should return undefined for non-existent keys", () => {
      expect(cache.get("nonexistent")).toBeUndefined();
    });

    it("should check if key exists", () => {
      cache.set("key1", "value1");
      expect(cache.has("key1")).toBe(true);
      expect(cache.has("nonexistent")).toBe(false);
    });

    it("should delete keys", () => {
      cache.set("key1", "value1");
      expect(cache.has("key1")).toBe(true);
      
      cache.delete("key1");
      expect(cache.has("key1")).toBe(false);
      expect(cache.get("key1")).toBeUndefined();
    });

    it("should clear all entries", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      expect(cache.size()).toBe(2);
      
      cache.clear();
      expect(cache.size()).toBe(0);
      expect(cache.get("key1")).toBeUndefined();
      expect(cache.get("key2")).toBeUndefined();
    });

    it("should return correct size", () => {
      expect(cache.size()).toBe(0);
      
      cache.set("key1", "value1");
      expect(cache.size()).toBe(1);
      
      cache.set("key2", "value2");
      expect(cache.size()).toBe(2);
      
      cache.delete("key1");
      expect(cache.size()).toBe(1);
    });
  });

  describe("TTL expiration", () => {
    it("should expire entries after TTL", async () => {
      cache.set("key1", "value1");
      expect(cache.get("key1")).toBe("value1");
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      expect(cache.get("key1")).toBeUndefined();
      expect(cache.has("key1")).toBe(false);
    });

    it("should not return expired entries", async () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Add new entry after expiration
      cache.set("key3", "value3");
      
      expect(cache.get("key1")).toBeUndefined();
      expect(cache.get("key2")).toBeUndefined();
      expect(cache.get("key3")).toBe("value3");
    });

    it("should clean up expired entries automatically", async () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      expect(cache.size()).toBe(2);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Trigger cleanup by accessing an entry
      cache.get("key1");
      
      // Size should reflect cleanup
      expect(cache.size()).toBe(0);
    });
  });

  describe("size limits", () => {
    it("should enforce maximum size", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");
      expect(cache.size()).toBe(3);
      
      // Adding 4th item should remove oldest
      cache.set("key4", "value4");
      expect(cache.size()).toBe(3);
      expect(cache.get("key1")).toBeUndefined(); // Oldest should be removed
      expect(cache.get("key4")).toBe("value4");
    });

    it("should remove oldest entry when at capacity", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");
      
      // All should be present
      expect(cache.get("key1")).toBe("value1");
      expect(cache.get("key2")).toBe("value2");
      expect(cache.get("key3")).toBe("value3");
      
      // Add 4th item
      cache.set("key4", "value4");
      
      // First item should be evicted
      expect(cache.get("key1")).toBeUndefined();
      expect(cache.get("key2")).toBe("value2");
      expect(cache.get("key3")).toBe("value3");
      expect(cache.get("key4")).toBe("value4");
    });

    it("should prioritize cleanup over eviction", () => {
      const shortCache = new SimpleCache<string>(0.1, 3); // 100ms TTL
      
      shortCache.set("key1", "value1");
      shortCache.set("key2", "value2");
      
      // Wait for expiration
      setTimeout(() => {
        shortCache.set("key3", "value3");
        shortCache.set("key4", "value4");
        
        // Should have cleaned up expired entries instead of evicting
        expect(shortCache.size()).toBe(2);
        expect(shortCache.get("key3")).toBe("value3");
        expect(shortCache.get("key4")).toBe("value4");
      }, 150);
    });
  });

  describe("different data types", () => {
    it("should work with objects", () => {
      const objectCache = new SimpleCache<{ name: string; age: number }>(60, 10);
      const testObj = { name: "John", age: 30 };
      
      objectCache.set("user1", testObj);
      expect(objectCache.get("user1")).toEqual(testObj);
    });

    it("should work with arrays", () => {
      const arrayCache = new SimpleCache<number[]>(60, 10);
      const testArray = [1, 2, 3, 4, 5];
      
      arrayCache.set("numbers", testArray);
      expect(arrayCache.get("numbers")).toEqual(testArray);
    });

    it("should work with null values", () => {
      const nullCache = new SimpleCache<string | null>(60, 10);
      
      nullCache.set("null-key", null);
      expect(nullCache.get("null-key")).toBeNull();
      expect(nullCache.has("null-key")).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle zero TTL", () => {
      const zeroTtlCache = new SimpleCache<string>(0, 10);
      zeroTtlCache.set("key1", "value1");
      
      // Should expire immediately
      expect(zeroTtlCache.get("key1")).toBeUndefined();
    });

    it("should handle zero max size", () => {
      const zeroSizeCache = new SimpleCache<string>(60, 0);
      zeroSizeCache.set("key1", "value1");
      
      // Should not store anything
      expect(zeroSizeCache.get("key1")).toBeUndefined();
      expect(zeroSizeCache.size()).toBe(0);
    });

    it("should handle updating existing keys", () => {
      cache.set("key1", "value1");
      expect(cache.get("key1")).toBe("value1");
      
      cache.set("key1", "updated-value");
      expect(cache.get("key1")).toBe("updated-value");
      expect(cache.size()).toBe(1); // Should not increase size
    });

    it("should handle empty string keys", () => {
      cache.set("", "empty-key-value");
      expect(cache.get("")).toBe("empty-key-value");
      expect(cache.has("")).toBe(true);
    });

    it("should handle very long keys", () => {
      const longKey = "a".repeat(1000);
      cache.set(longKey, "long-key-value");
      expect(cache.get(longKey)).toBe("long-key-value");
    });
  });

  describe("performance characteristics", () => {
    it("should handle large number of operations efficiently", () => {
      const largeCache = new SimpleCache<string>(300, 1000);
      const startTime = Date.now();
      
      // Add 1000 items
      for (let i = 0; i < 1000; i++) {
        largeCache.set(`key${i}`, `value${i}`);
      }
      
      // Access all items
      for (let i = 0; i < 1000; i++) {
        expect(largeCache.get(`key${i}`)).toBe(`value${i}`);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete in reasonable time (less than 100ms)
      expect(duration).toBeLessThan(100);
    });

    it("should maintain O(1) access time", () => {
      const perfCache = new SimpleCache<string>(300, 10000);
      
      // Fill cache
      for (let i = 0; i < 10000; i++) {
        perfCache.set(`key${i}`, `value${i}`);
      }
      
      // Time access to first and last items
      const start1 = Date.now();
      perfCache.get("key0");
      const time1 = Date.now() - start1;
      
      const start2 = Date.now();
      perfCache.get("key9999");
      const time2 = Date.now() - start2;
      
      // Access times should be similar (within 5ms)
      expect(Math.abs(time1 - time2)).toBeLessThan(5);
    });
  });
}); 