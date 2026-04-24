import { describe, expect, it, vi } from 'vitest';
import {
  fetchJSON,
  formatErrorDetails,
  isRecoverableSyncError,
  loadRemoteJSON,
  parseFee,
  syncData,
  toEndDate,
  toStartDate,
  transformEvents,
  validateAgainstSchema,
  validateType
} from '../scripts/sync-data.mjs';

describe('sync data transformation helpers', () => {
  it('should parse fee strings into numbers', () => {
    expect(parseFee('$75 entry')).toBe(75);
    expect(parseFee('Buyback 30.50')).toBe(30.5);
    expect(parseFee('contact track')).toBeNull();
    expect(parseFee(null)).toBeNull();
  });

  it('should transform upstream events into site event records', () => {
    const [event] = transformEvents([
      {
        id: 'event-1',
        title: 'Bracket Bash',
        event_type: 'bracket',
        series: 'Local Series',
        track: { id: 'track-1', name: 'Track One', city: 'Dallas', state: 'TX' },
        dates: { start: '2026-05-01', end: '2026-05-02' },
        times: { race_start: '18:30' },
        notes: 'Race notes',
        fees: { entry: '$75 entry', spectator: '$20' },
        contact: { website: 'https://example.com' },
        classes: ['Super Pro'],
        confidence: 1,
        unclear_fields: ['payout'],
        flyers: ['flyer.jpg'],
        created_at: '2026-04-01T00:00:00Z',
        updated_at: '2026-04-02T00:00:00Z'
      }
    ]);

    expect(event).toMatchObject({
      id: 'event-1',
      track_id: 'track-1',
      track_name: 'Track One',
      start_date: '2026-05-01T18:30:00',
      end_date: '2026-05-02T23:59:59',
      event_driver_fee: 75,
      event_spectator_fee: 20,
      classes: [{ name: 'Super Pro', buyin_fee: null, rules: [] }]
    });
  });

  it('should produce date fallbacks for missing dates and race times', () => {
    expect(toStartDate({ dates: { start: '2026-05-01' }, times: {} })).toBe('2026-05-01T00:00:00');
    expect(toStartDate({ dates: {} })).toBeNull();
    expect(toEndDate({ dates: { start: '2026-05-01' } })).toBe('2026-05-01T23:59:59');
    expect(toEndDate({ dates: {} })).toBeNull();
  });
});

describe('sync data schema validation', () => {
  it('should validate supported primitive schema types', () => {
    expect(validateType([], 'array')).toBe(true);
    expect(validateType({}, 'object')).toBe(true);
    expect(validateType('x', 'string')).toBe(true);
    expect(validateType(1, 'number')).toBe(true);
    expect(validateType(null, 'null')).toBe(true);
    expect(() => validateType(true, 'boolean')).toThrow('Unsupported schema type');
  });

  it('should validate required fields, refs, formats, and additional properties', () => {
    const schema = {
      definitions: {
        item: {
          type: 'object',
          required: ['id', 'url'],
          additionalProperties: false,
          properties: {
            id: { type: 'string', format: 'uuid' },
            url: { type: 'string', format: 'uri' },
            count: { type: 'number', minimum: 1, maximum: 10 }
          }
        }
      },
      type: 'array',
      items: { $ref: '#/definitions/item' }
    };

    expect(() => validateAgainstSchema([
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        url: 'https://example.com',
        count: 5
      }
    ], schema, schema, 'events')).not.toThrow();

    expect(() => validateAgainstSchema([
      {
        id: 'not-a-uuid',
        url: 'https://example.com',
        extra: true
      }
    ], schema, schema, 'events')).toThrow();
  });
});

describe('sync data remote loading', () => {
  it('should retry fetches and report the final failure', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('Network down'));
    const sleepImpl = vi.fn();
    const consoleImpl = { warn: vi.fn() };

    await expect(fetchJSON('https://example.com/data.json', {
      fetchImpl,
      retries: 2,
      retryDelayMs: 5,
      sleepImpl,
      consoleImpl
    })).rejects.toThrow('Failed to fetch https://example.com/data.json after 2 attempts');

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleepImpl).toHaveBeenCalledWith(5);
    expect(consoleImpl.warn).toHaveBeenCalledOnce();
  });

  it('should fall back from primary curl to fallback curl before fetch', async () => {
    const fetchJSONWithCurlImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error('primary failed'))
      .mockResolvedValueOnce({ ok: true });
    const fetchJSONImpl = vi.fn();
    const consoleImpl = { warn: vi.fn() };

    await expect(loadRemoteJSON({
      primaryCurlUrl: 'primary',
      fallbackCurlUrl: 'fallback',
      fallbackFetchUrl: 'fetch',
      label: 'events',
      fetchJSONWithCurlImpl,
      fetchJSONImpl,
      consoleImpl
    })).resolves.toEqual({ ok: true });

    expect(fetchJSONWithCurlImpl).toHaveBeenNthCalledWith(1, 'primary');
    expect(fetchJSONWithCurlImpl).toHaveBeenNthCalledWith(2, 'fallback');
    expect(fetchJSONImpl).not.toHaveBeenCalled();
  });

  it('should fall back to fetch after both curl attempts fail', async () => {
    const fetchJSONWithCurlImpl = vi.fn().mockRejectedValue(new Error('curl failed'));
    const fetchJSONImpl = vi.fn().mockResolvedValue({ fromFetch: true });

    await expect(loadRemoteJSON({
      primaryCurlUrl: 'primary',
      fallbackCurlUrl: 'fallback',
      fallbackFetchUrl: 'fetch',
      label: 'schema',
      fetchJSONWithCurlImpl,
      fetchJSONImpl,
      consoleImpl: { warn: vi.fn() }
    })).resolves.toEqual({ fromFetch: true });

    expect(fetchJSONImpl).toHaveBeenCalledWith('fetch');
  });
});

describe('sync data orchestration', () => {
  it('should use cached data when upstream sync has a recoverable failure', async () => {
    const consoleImpl = { warn: vi.fn(), log: vi.fn() };
    const writeFileImpl = vi.fn();

    await syncData({
      loadRemoteJSONImpl: vi.fn().mockRejectedValue(new Error('Failed to fetch upstream')),
      readCachedJSONImpl: vi
        .fn()
        .mockResolvedValueOnce([{ id: 'cached-event' }])
        .mockResolvedValueOnce({ type: 'array' }),
      writeFileImpl,
      consoleImpl
    });

    expect(writeFileImpl).not.toHaveBeenCalled();
    expect(consoleImpl.warn).toHaveBeenCalledWith(expect.stringContaining('continuing with cached site data'));
    expect(consoleImpl.log).toHaveBeenCalledWith(expect.stringContaining('1 events'));
  });

  it('should write transformed events and schema after successful remote sync', async () => {
    const mkdirImpl = vi.fn();
    const writeFileImpl = vi.fn();
    const validateAgainstSchemaImpl = vi.fn();
    const transformEventsImpl = vi.fn().mockReturnValue([{ id: 'event-1' }]);
    const loadRemoteJSONImpl = vi
      .fn()
      .mockResolvedValueOnce({ type: 'array' })
      .mockResolvedValueOnce([{ upstream: true }]);

    await syncData({
      loadRemoteJSONImpl,
      validateAgainstSchemaImpl,
      transformEventsImpl,
      mkdirImpl,
      writeFileImpl,
      consoleImpl: { warn: vi.fn(), log: vi.fn() }
    });

    expect(validateAgainstSchemaImpl).toHaveBeenCalledWith([{ upstream: true }], { type: 'array' }, { type: 'array' }, 'events');
    expect(transformEventsImpl).toHaveBeenCalledWith([{ upstream: true }]);
    expect(mkdirImpl).toHaveBeenCalledWith(expect.stringContaining('/site/data'), { recursive: true });
    expect(writeFileImpl).toHaveBeenCalledWith(expect.stringContaining('events.json'), expect.stringContaining('"event-1"'));
    expect(writeFileImpl).toHaveBeenCalledWith(expect.stringContaining('events.schema.json'), expect.stringContaining('"array"'));
  });

  it('should classify recoverable sync errors by message prefix', () => {
    expect(isRecoverableSyncError(new Error('Failed to fetch upstream'))).toBe(true);
    expect(isRecoverableSyncError(new Error('curl fallback failed for upstream'))).toBe(true);
    expect(isRecoverableSyncError(new Error('schema is invalid'))).toBe(false);
  });

  it('should include nested error details in diagnostics', () => {
    const error = new Error('outer');
    error.code = 'EFAIL';
    error.cause = new Error('inner');

    expect(formatErrorDetails(error)).toContain('outer');
    expect(formatErrorDetails(error)).toContain('code=EFAIL');
    expect(formatErrorDetails(error)).toContain('inner');
  });
});
