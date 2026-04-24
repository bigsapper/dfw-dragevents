import { describe, expect, it } from 'vitest';
import {
  formatEventFees,
  getEventFeeLabels,
  getPricedOffers
} from '../assets/js/domain/fees.js';
import {
  formatTrackLocation,
  getAvailableTracks,
  getTrackName,
  normalizeTrackName,
  resolveTrackFilters,
  toTrackKey
} from '../assets/js/domain/tracks.js';

describe('fee domain helpers', () => {
  it('should prefer raw fee labels over parsed numeric values', () => {
    const labels = getEventFeeLabels({
      raw_driver_fee: '$75 at gate',
      event_driver_fee: 75,
      raw_spectator_fee: null,
      event_spectator_fee: 20
    });

    expect(labels).toEqual(['Driver: $75 at gate', 'Spectator: $20']);
  });

  it('should format the no-fee fallback message', () => {
    expect(formatEventFees({})).toBe('Contact track for pricing');
  });

  it('should build priced Schema.org offers from numeric fee fields', () => {
    expect(getPricedOffers({
      event_driver_fee: 75,
      event_spectator_fee: 20
    })).toEqual([
      {
        '@type': 'Offer',
        name: 'Driver Entry',
        price: 75,
        priceCurrency: 'USD'
      },
      {
        '@type': 'Offer',
        name: 'Spectator Entry',
        price: 20,
        priceCurrency: 'USD'
      }
    ]);
  });
});

describe('track domain helpers', () => {
  it('should normalize track keys and names consistently', () => {
    expect(toTrackKey(null)).toBe('');
    expect(toTrackKey(123)).toBe('123');
    expect(normalizeTrackName('Xtreme Raceway Park!')).toBe('xtremeracewaypark');
  });

  it('should resolve display names and locations with fallbacks', () => {
    const trackMap = new Map([['known-track', 'Known Track']]);

    expect(getTrackName(trackMap, { track_id: 'known-track', track_name: 'Fallback' })).toBe('Known Track');
    expect(getTrackName(trackMap, { track_id: 'missing-track', track_name: 'Fallback' })).toBe('Fallback');
    expect(getTrackName(trackMap, { track_id: 'missing-track' })).toBe('Unknown Track');
    expect(formatTrackLocation({ track_city: 'Ferris', track_state: 'TX' })).toBe('Ferris, TX');
    expect(formatTrackLocation({})).toBe('Location TBA');
  });

  it('should resolve configured track filters through aliases', () => {
    const filters = resolveTrackFilters(
      [{ canonical: 'Xtreme Raceway Park', aliases: ['XRP'] }],
      [{ id: 'xtreme-tx', name: 'XRP' }]
    );

    expect(filters).toEqual([{ id: 'xtreme-tx', label: 'Xtreme Raceway Park' }]);
  });

  it('should preserve unmatched canonical filters', () => {
    const filters = resolveTrackFilters(
      [{ canonical: 'New Track', aliases: [] }],
      [{ id: 'known-track', name: 'Known Track' }]
    );

    expect(filters).toEqual([{ id: 'New Track', label: 'New Track' }]);
  });

  it('should deduplicate tracks and sort them by name', () => {
    const tracks = getAvailableTracks([
      { track_id: 'b', track_name: 'Beta Raceway', track_city: 'Dallas', track_state: 'TX' },
      { track_id: 'a', track_name: 'Alpha Dragway', track_city: 'Fort Worth', track_state: 'TX' },
      { track_id: 'b', track_name: 'Beta Raceway Updated', track_city: 'Ennis', track_state: 'TX' },
      { track_id: null, track_name: 'Missing Id' }
    ]);

    expect(tracks).toEqual([
      { id: 'a', name: 'Alpha Dragway', city: 'Fort Worth', state: 'TX' },
      { id: 'b', name: 'Beta Raceway', city: 'Dallas', state: 'TX' }
    ]);
  });
});
