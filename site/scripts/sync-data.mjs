import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFile as execFileCallback } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const siteDir = path.resolve(__dirname, '..');
const dataDir = path.join(siteDir, 'data');

const EVENTS_URL =
  process.env.DRAG_EVENTS_DATA_URL ||
  'https://raw.githubusercontent.com/bigsapper/drag-events-aggregator/main/dist/events.json';
const SCHEMA_URL =
  process.env.DRAG_EVENTS_SCHEMA_URL ||
  'https://raw.githubusercontent.com/bigsapper/drag-events-aggregator/main/dist/events.schema.json';
const EVENTS_CDN_URL =
  process.env.DRAG_EVENTS_DATA_CDN_URL ||
  'https://cdn.jsdelivr.net/gh/bigsapper/drag-events-aggregator@main/dist/events.json';
const SCHEMA_CDN_URL =
  process.env.DRAG_EVENTS_SCHEMA_CDN_URL ||
  'https://cdn.jsdelivr.net/gh/bigsapper/drag-events-aggregator@main/dist/events.schema.json';
const EVENTS_CURL_URL =
  process.env.DRAG_EVENTS_DATA_CURL_URL ||
  'https://github.com/bigsapper/drag-events-aggregator/raw/main/dist/events.json';
const SCHEMA_CURL_URL =
  process.env.DRAG_EVENTS_SCHEMA_CURL_URL ||
  'https://github.com/bigsapper/drag-events-aggregator/raw/main/dist/events.schema.json';
const FETCH_RETRIES = Number.parseInt(process.env.DRAG_EVENTS_FETCH_RETRIES || '3', 10);
const FETCH_RETRY_DELAY_MS = Number.parseInt(process.env.DRAG_EVENTS_FETCH_RETRY_DELAY_MS || '750', 10);
const EVENTS_FILE = path.join(dataDir, 'events.json');
const SCHEMA_FILE = path.join(dataDir, 'events.schema.json');
const execFile = promisify(execFileCallback);

function fail(message) {
  throw new Error(message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatErrorDetails(error) {
  if (!error) {
    return 'Unknown error';
  }

  const parts = [];
  const queue = [error];
  const seen = new Set();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || seen.has(current)) {
      continue;
    }

    seen.add(current);

    if (current.message) {
      parts.push(current.message);
    }

    for (const key of ['code', 'syscall', 'hostname']) {
      if (current[key]) {
        parts.push(`${key}=${current[key]}`);
      }
    }

    if (current.cause) {
      queue.push(current.cause);
    }
  }

  return parts.join(' | ');
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const TYPE_VALIDATORS = {
  array: Array.isArray,
  object: isPlainObject,
  string: (value) => typeof value === 'string',
  number: (value) => typeof value === 'number' && Number.isFinite(value),
  null: (value) => value === null
};

function readDefinition(schema, ref) {
  const prefix = '#/definitions/';
  if (!ref.startsWith(prefix)) {
    fail(`Unsupported schema reference: ${ref}`);
  }

  const key = ref.slice(prefix.length);
  const definition = schema.definitions?.[key];
  if (!definition) {
    fail(`Missing schema definition: ${key}`);
  }

  return definition;
}

function validateType(value, type) {
  const validator = TYPE_VALIDATORS[type];
  if (!validator) {
    fail(`Unsupported schema type: ${type}`);
  }
  return validator(value);
}

function validateFormat(value, format, pathLabel) {
  if (typeof value !== 'string') {
    return;
  }

  const formatPatterns = {
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    date: /^\d{4}-\d{2}-\d{2}$/,
    'date-time': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    uri: /^https?:\/\/\S+$/i
  };

  const pattern = formatPatterns[format];
  if (pattern && !pattern.test(value)) {
    fail(`${pathLabel} does not match schema format "${format}"`);
  }
}

function validateAgainstSchema(value, schemaNode, rootSchema, pathLabel) {
  if (schemaNode.$ref) {
    validateAgainstSchema(value, readDefinition(rootSchema, schemaNode.$ref), rootSchema, pathLabel);
    return;
  }

  if (schemaNode.type) {
    const allowedTypes = Array.isArray(schemaNode.type) ? schemaNode.type : [schemaNode.type];
    const validType = allowedTypes.some((type) => validateType(value, type));
    if (!validType) {
      fail(`${pathLabel} does not match schema type ${allowedTypes.join(' | ')}`);
    }
  }

  if (value === null) {
    return;
  }

  if (schemaNode.enum && !schemaNode.enum.includes(value)) {
    fail(`${pathLabel} is not one of the allowed schema values`);
  }

  if (typeof value === 'number') {
    if (schemaNode.minimum !== undefined && value < schemaNode.minimum) {
      fail(`${pathLabel} is below schema minimum`);
    }
    if (schemaNode.maximum !== undefined && value > schemaNode.maximum) {
      fail(`${pathLabel} is above schema maximum`);
    }
  }

  if (typeof value === 'string') {
    if (schemaNode.pattern) {
      const regex = new RegExp(schemaNode.pattern);
      if (!regex.test(value)) {
        fail(`${pathLabel} does not match schema pattern`);
      }
    }
    if (schemaNode.format) {
      validateFormat(value, schemaNode.format, pathLabel);
    }
  }

  if (Array.isArray(value)) {
    if (schemaNode.items) {
      value.forEach((item, index) => {
        validateAgainstSchema(item, schemaNode.items, rootSchema, `${pathLabel}[${index}]`);
      });
    }
    return;
  }

  if (!isPlainObject(value)) {
    return;
  }

  const properties = schemaNode.properties || {};
  const required = schemaNode.required || [];

  for (const field of required) {
    if (!(field in value)) {
      fail(`${pathLabel}.${field} is required by schema`);
    }
  }

  if (schemaNode.additionalProperties === false) {
    for (const key of Object.keys(value)) {
      if (!(key in properties)) {
        fail(`${pathLabel}.${key} is not allowed by schema`);
      }
    }
  }

  for (const [key, propSchema] of Object.entries(properties)) {
    if (key in value) {
      validateAgainstSchema(value[key], propSchema, rootSchema, `${pathLabel}.${key}`);
    }
  }
}

function parseFee(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const match = value.match(/\$?\s*(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function toStartDate(event) {
  const date = event?.dates?.start;
  if (!date) {
    return null;
  }

  const time = event?.times?.race_start || '00:00';
  return `${date}T${time}:00`;
}

function toEndDate(event) {
  const endDate = event?.dates?.end || event?.dates?.start;
  if (!endDate) {
    return null;
  }

  return `${endDate}T23:59:59`;
}

function transformEvents(events) {
  return events.map((event) => ({
    id: event.id,
    title: event.title,
    event_type: event.event_type,
    series: event.series,
    track_id: event.track?.id || event.track?.name || 'unknown-track',
    track_name: event.track?.name || 'Unknown Track',
    track_city: event.track?.city || null,
    track_state: event.track?.state || null,
    start_date: toStartDate(event),
    end_date: toEndDate(event),
    description: event.notes,
    event_driver_fee: parseFee(event.fees?.entry),
    event_spectator_fee: parseFee(event.fees?.spectator),
    raw_driver_fee: event.fees?.entry || null,
    raw_spectator_fee: event.fees?.spectator || null,
    url: event.contact?.website || null,
    classes: (event.classes || []).map((name) => ({
      name,
      buyin_fee: null,
      rules: []
    })),
    confidence: event.confidence,
    unclear_fields: event.unclear_fields || [],
    flyers: event.flyers || [],
    created_at: event.created_at,
    updated_at: event.updated_at
  }));
}

async function fetchJSON(url) {
  let lastError;

  for (let attempt = 1; attempt <= FETCH_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) {
        fail(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      lastError = error;

      if (attempt === FETCH_RETRIES) {
        break;
      }

      const delayMs = FETCH_RETRY_DELAY_MS * attempt;
      console.warn(
        `Fetch attempt ${attempt}/${FETCH_RETRIES} failed for ${url}: ${formatErrorDetails(error)}. Retrying in ${delayMs}ms...`
      );
      await sleep(delayMs);
    }
  }

  fail(`Failed to fetch ${url} after ${FETCH_RETRIES} attempts: ${formatErrorDetails(lastError)}`);
}

async function readCachedJSON(filePath) {
  let raw;

  try {
    raw = await readFile(filePath, 'utf8');
  } catch (error) {
    fail(`Failed to read cached data file ${filePath}: ${formatErrorDetails(error)}`);
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    fail(`Cached data file ${filePath} is not valid JSON: ${formatErrorDetails(error)}`);
  }
}

async function fetchJSONWithCurl(url) {
  let stdout;

  try {
    ({ stdout } = await execFile('curl', ['-L', '--fail', '--silent', '--show-error', url], {
      maxBuffer: 10 * 1024 * 1024
    }));
  } catch (error) {
    fail(`curl fallback failed for ${url}: ${formatErrorDetails(error)}`);
  }

  try {
    return JSON.parse(stdout);
  } catch (error) {
    fail(`curl fallback returned invalid JSON for ${url}: ${formatErrorDetails(error)}`);
  }
}

async function loadRemoteJSON({ primaryCurlUrl, fallbackCurlUrl, fallbackFetchUrl, label }) {
  try {
    return await fetchJSONWithCurl(primaryCurlUrl);
  } catch (primaryCurlError) {
    console.warn(`Primary curl download failed for ${label}: ${formatErrorDetails(primaryCurlError)}`);
  }

  try {
    return await fetchJSONWithCurl(fallbackCurlUrl);
  } catch (fallbackCurlError) {
    console.warn(`Fallback curl download failed for ${label}: ${formatErrorDetails(fallbackCurlError)}`);
  }

  return fetchJSON(fallbackFetchUrl);
}

async function main() {
  let schema;
  let upstreamEvents;

  try {
    [schema, upstreamEvents] = await Promise.all([
      loadRemoteJSON({
        primaryCurlUrl: SCHEMA_CURL_URL,
        fallbackCurlUrl: SCHEMA_CDN_URL,
        fallbackFetchUrl: SCHEMA_URL,
        label: 'schema'
      }),
      loadRemoteJSON({
        primaryCurlUrl: EVENTS_CURL_URL,
        fallbackCurlUrl: EVENTS_CDN_URL,
        fallbackFetchUrl: EVENTS_URL,
        label: 'events'
      })
    ]);
  } catch (error) {
    if (
      !String(error?.message || '').startsWith('Failed to fetch ') &&
      !String(error?.message || '').startsWith('curl fallback failed ')
    ) {
      throw error;
    }

    const [cachedEvents] = await Promise.all([
      readCachedJSON(EVENTS_FILE),
      readCachedJSON(SCHEMA_FILE)
    ]);

    console.warn(
      `Warning: upstream sync unavailable after alternate source attempts, continuing with cached site data. Details: ${formatErrorDetails(error)}`
    );
    console.log(
      `Build is using the cached dataset with ${
        Array.isArray(cachedEvents) ? cachedEvents.length : 'an unknown number of'
      } events and the cached schema snapshot.`
    );
    return;
  }

  validateAgainstSchema(upstreamEvents, schema, schema, 'events');

  const events = transformEvents(upstreamEvents);

  await mkdir(dataDir, { recursive: true });
  await writeFile(EVENTS_FILE, `${JSON.stringify(events, null, 2)}\n`);
  await writeFile(SCHEMA_FILE, `${JSON.stringify(schema, null, 2)}\n`);

  console.log(`Synced ${events.length} events from upstream dataset.`);
}

main().catch((error) => {
  console.error(formatErrorDetails(error));
  process.exitCode = 1;
});
