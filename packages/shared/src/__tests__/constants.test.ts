import { describe, it, expect } from 'vitest';
import { API_VERSION, DEFAULT_API_URL, CKPT_DIR_NAME, DB_FILE_NAME } from '../constants';

describe('constants', () => {
  it('exports the correct API version', () => {
    expect(API_VERSION).toBe('v1');
  });

  it('exports a valid default API URL', () => {
    expect(DEFAULT_API_URL).toMatch(/^https:\/\//);
    expect(DEFAULT_API_URL).toContain('ckpt');
  });

  it('exports ckpt directory name', () => {
    expect(CKPT_DIR_NAME).toBe('.ckpt');
    expect(CKPT_DIR_NAME.startsWith('.')).toBe(true);
  });

  it('exports database file name with .db extension', () => {
    expect(DB_FILE_NAME).toBe('reasoning.db');
    expect(DB_FILE_NAME.endsWith('.db')).toBe(true);
  });
});
