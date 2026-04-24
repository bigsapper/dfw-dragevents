import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchJSON } from '../assets/js/http.js';

describe('fetchJSON', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch JSON with no-store caching', async () => {
    const data = { events: [{ id: 1 }] };
    global.fetch.mockResolvedValue({ ok: true, json: async () => data });

    await expect(fetchJSON('data/events.json')).resolves.toEqual(data);
    expect(global.fetch).toHaveBeenCalledWith('data/events.json', { cache: 'no-store' });
  });

  it('should throw for HTTP and network failures', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false });
    await expect(fetchJSON('data/missing.json')).rejects.toThrow('Failed to fetch data/missing.json');

    global.fetch.mockRejectedValueOnce(new Error('Network error'));
    await expect(fetchJSON('data/events.json')).rejects.toThrow('Network error');
  });
});
