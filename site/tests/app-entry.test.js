import { describe, expect, it, vi } from 'vitest';

describe('app entry point', () => {
  it('should initialize page controllers on DOMContentLoaded', async () => {
    document.body.innerHTML = '';
    global.fetch = vi.fn();

    await import('../assets/js/app.js?entry-startup');
    window.dispatchEvent(new Event('DOMContentLoaded'));

    expect(global.fetch).not.toHaveBeenCalled();
  });
});
