import { describe, expect, it } from 'vitest';
import * as app from '../assets/js/app.js';

describe('public app module', () => {
  it('should expose the public frontend API from focused modules', () => {
    expect(app).toEqual(expect.objectContaining({
      downloadCalendar: expect.any(Function),
      fetchJSON: expect.any(Function),
      formatDateRange: expect.any(Function),
      formatDateTime: expect.any(Function),
      generateICS: expect.any(Function),
      initializeEventDetail: expect.any(Function),
      initializeEventsList: expect.any(Function),
      isSafeUrl: expect.any(Function),
      loadEventDetail: expect.any(Function),
      loadEventsList: expect.any(Function),
      renderTrackFilters: expect.any(Function),
      resetCache: expect.any(Function)
    }));
  });
});
