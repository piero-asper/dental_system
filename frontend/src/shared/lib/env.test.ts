import { describe, expect, it } from 'vitest';
import { env } from './env';

describe('env', () => {
  it('exposes frontend configuration keys', () => {
    expect(env.apiUrl).toBeTruthy();
    expect(typeof env.supabaseUrl).toBe('string');
    expect(typeof env.supabaseAnonKey).toBe('string');
  });
});
