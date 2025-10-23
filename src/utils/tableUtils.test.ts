import { describe, it, expect } from 'vitest';
import { sortData, filterData } from './tableUtils';

describe('tableUtils', () => {
  describe('sortData', () => {
    it('should sort strings alphabetically ascending', () => {
      const data = [
        { name: 'Charlie' },
        { name: 'Alice' },
        { name: 'Bob' }
      ];
      const sorted = sortData(data, [{ key: 'name', direction: 'asc' }]);
      
      expect(sorted[0].name).toBe('Alice');
      expect(sorted[1].name).toBe('Bob');
      expect(sorted[2].name).toBe('Charlie');
    });

    it('should sort strings alphabetically descending', () => {
      const data = [
        { name: 'Alice' },
        { name: 'Bob' },
        { name: 'Charlie' }
      ];
      const sorted = sortData(data, [{ key: 'name', direction: 'desc' }]);
      
      expect(sorted[0].name).toBe('Charlie');
      expect(sorted[1].name).toBe('Bob');
      expect(sorted[2].name).toBe('Alice');
    });

    it('should sort numbers correctly ascending', () => {
      const data = [
        { value: 30 },
        { value: 10 },
        { value: 20 }
      ];
      const sorted = sortData(data, [{ key: 'value', direction: 'asc' }]);
      
      expect(sorted[0].value).toBe(10);
      expect(sorted[1].value).toBe(20);
      expect(sorted[2].value).toBe(30);
    });

    it('should sort numbers correctly descending', () => {
      const data = [
        { value: 10 },
        { value: 30 },
        { value: 20 }
      ];
      const sorted = sortData(data, [{ key: 'value', direction: 'desc' }]);
      
      expect(sorted[0].value).toBe(30);
      expect(sorted[1].value).toBe(20);
      expect(sorted[2].value).toBe(10);
    });

    it('should handle null values', () => {
      const data = [
        { value: 10 },
        { value: null },
        { value: 5 }
      ];
      const sorted = sortData(data, [{ key: 'value', direction: 'asc' }]);
      
      expect(sorted[0].value).toBe(5);
      expect(sorted[1].value).toBe(10);
      expect(sorted[2].value).toBeNull();
    });

    it('should handle undefined values', () => {
      const data = [
        { value: 10 },
        { value: undefined },
        { value: 5 }
      ];
      const sorted = sortData(data, [{ key: 'value', direction: 'asc' }]);
      
      expect(sorted[0].value).toBe(5);
      expect(sorted[1].value).toBe(10);
      expect(sorted[2].value).toBeUndefined();
    });

    it('should sort dates correctly', () => {
      const data = [
        { date: '2025-03-01' },
        { date: '2025-01-01' },
        { date: '2025-02-01' }
      ];
      const sorted = sortData(data, [{ key: 'date', direction: 'asc' }]);
      
      expect(sorted[0].date).toBe('2025-01-01');
      expect(sorted[1].date).toBe('2025-02-01');
      expect(sorted[2].date).toBe('2025-03-01');
    });

    it('should be case-insensitive for strings', () => {
      const data = [
        { name: 'charlie' },
        { name: 'ALICE' },
        { name: 'Bob' }
      ];
      const sorted = sortData(data, [{ key: 'name', direction: 'asc' }]);
      
      expect(sorted[0].name).toBe('ALICE');
      expect(sorted[1].name).toBe('Bob');
      expect(sorted[2].name).toBe('charlie');
    });

    it('should return original data if no sort config', () => {
      const data = [
        { name: 'Charlie' },
        { name: 'Alice' }
      ];
      const sorted = sortData(data, []);
      
      expect(sorted).toEqual(data);
    });
  });

  describe('filterData', () => {
    it('should filter by text field', () => {
      const data = [
        { name: 'Alice' },
        { name: 'Bob' },
        { name: 'Charlie' }
      ];
      const filtered = filterData(data, { name: 'ali' });
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Alice');
    });

    it('should be case-insensitive', () => {
      const data = [
        { name: 'Alice' },
        { name: 'Bob' }
      ];
      const filtered = filterData(data, { name: 'ALICE' });
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Alice');
    });

    it('should filter by multiple fields', () => {
      const data = [
        { name: 'Alice', status: 'active' },
        { name: 'Bob', status: 'inactive' },
        { name: 'Charlie', status: 'active' }
      ];
      const filtered = filterData(data, { status: 'active' });
      
      expect(filtered).toHaveLength(2);
    });

    it('should return all data if no filters', () => {
      const data = [
        { name: 'Alice' },
        { name: 'Bob' }
      ];
      const filtered = filterData(data, {});
      
      expect(filtered).toHaveLength(2);
    });

    it('should handle partial matches', () => {
      const data = [
        { email: 'alice@example.com' },
        { email: 'bob@test.com' },
        { email: 'charlie@example.com' }
      ];
      const filtered = filterData(data, { email: 'example' });
      
      expect(filtered).toHaveLength(2);
    });

    it('should handle null and undefined values', () => {
      const data = [
        { value: 'test' },
        { value: null },
        { value: undefined }
      ];
      const filtered = filterData(data, { value: 'test' });
      
      expect(filtered).toHaveLength(1);
    });

    it('should filter boolean values', () => {
      const data = [
        { active: true },
        { active: false },
        { active: true }
      ];
      const filtered = filterData(data, { active: true });
      
      expect(filtered).toHaveLength(2);
    });
  });
});
