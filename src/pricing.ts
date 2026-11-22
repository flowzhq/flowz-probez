import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { resolveModel } from './models.js'
import type { Round } from './types.js'

/**
 * What a model charges, in dollars per million tokens.
 *
 * Five rates rather than four, because a cache write has two prices: the 5-minute entry costs 1.25×
 * the input rate and the 1-hour entry 2×. That is not a rounding difference — on a store where
 * almost every write is the 1-hour kind, pricing them all at 1.25× understates the cache-write bill
 * by more than a third.
 */
export interface Rates {
  in: number
  cache_write_5m: number
  cache_write_1h: number
  cache_read: number
  out: number
}

export interface Pricing {
  schema_version: number
  /**
   * Keyed by the model id exactly as the agent recorded it. A `null` is a *tombstone*: a model
   * somebody deliberately left unpriced, which is a different thing from a model this file has
   * never heard of.
   */
  models: Record<string, Rates | null>
}

export const PRICING_VERSION = 2

/** The file rates live in, beside the projects rather than inside any one of them. */
export function pricingFile(dataDir: string): string {
  return join(dataDir, 'pricing.json')
}

/** How a model prices its cache, as multiples of its input rate. */
interface CacheMultipliers {
  cacheRead?: number
  cacheWrite5m?: number
  cacheWrite1h?: number
}

/**
 * List prices as published, in dollars per million tokens.
 *
 * The cache rates are derived from the input rate at the published multipliers rather than written
 * out, so a corrected input price stays consistent with the cache prices beside it. The defaults —
 * a 5-minute write at 1.25×, a 1-hour write at 2×, a read at a tenth — hold for most models on
 * both providers. The ones that break them say so at the call site:
 *
 * - Claude Fable and Mythos 5.1 and 5.2 read the cache at 0.025×, and Opus and Sonnet 5.5 at 0.05×.
 * - OpenAI's GPT-6 and GPT-5.6 models publish a 30-minute write at 1.25× and a 12-hour write at
 *   2.5×. Those go in the 5-minute and 1-hour columns. GPT-6.1 Terra, GPT-6.2 and GPT-6.1 Sol also
 *   read the cache at 0.05×.
 * - The GPT-5 generation and older publish no cache-write premium at all, because OpenAI bills a
 *   write at the plain input rate. Those pass 1× for both write tiers. GPT-4.1 and o3 read the
 *   cache at 0.25×, and GPT-4o at 0.5×.
 */
function rates(input: number, output: number, cache: CacheMultipliers = {}): Rates {
  // Rounded because these are prices, and a price is a decimal figure: `3 * 0.1` is
  // 0.30000000000000004 in binary floating point, which is not a rate anyone published and reads
  // as a bug the moment it is shown in a text box.
  const at = (multiplier: number): number => Math.round(input * multiplier * 1e6) / 1e6
  return {
    in: input,
    cache_write_5m: at(cache.cacheWrite5m ?? 1.25),
    cache_write_1h: at(cache.cacheWrite1h ?? 2),
    cache_read: at(cache.cacheRead ?? 0.1),
    out: output,
  }
}

/** OpenAI bills a cache write at the plain input rate, so both write tiers sit at 1×. */
const NO_WRITE_PREMIUM: CacheMultipliers = { cacheWrite5m: 1, cacheWrite1h: 1 }

/** OpenAI's 12-hour cache write, at 2.5× input, for the models that publish write prices. */
const OPENAI_LONG_WRITE: CacheMultipliers = { cacheWrite1h: 2.5 }

/**
 * Every model the v1 default table priced, frozen.
 *
 * A v1 file was the whole truth, but only ever *relative to the table that shipped beside it*. A
 * model missing from one of them is a deliberate blank when it was on offer at the time, and simply
 * a model that did not exist yet when it was not. Migration needs to tell those apart, and the file
 * does not record which probez wrote it — so the list it could have been blanking is written here.
 *
 * Without this the migration reads every model added since as blanked on purpose, which is the very
 * failure the tombstones exist to end: on the store this was built against, all nineteen models
 * added in this version would have arrived already dead.
 *
 * Never extend this. It describes what v1 shipped, which is a fact about the past.
 */
const V1_DEFAULTS = [
  'claude-fable-5',
  'claude-mythos-5',
  'claude-opus-5',
  'claude-opus-4-8',
  'claude-opus-4-7',
  'claude-opus-4-6',
  'claude-sonnet-5',
  'claude-sonnet-4-6',
  'claude-haiku-4-5',
]

/**
 * Every model whose price is published. Anything else is unpriced until someone says otherwise.
 *
 * Retired models are here on purpose. probez reads archives, not live traffic: a store with a year
 * of history holds rounds from models nobody can call any more, and those rounds still cost what
 * they cost. A rate is only dropped from this table when it was never published.
 *
 * Two figures are approximations, recorded rather than smoothed over:
 *
 * - The GPT models tier their rates by context length — `gpt-5.6-terra` is $2/$12 below a boundary
 *   and $4/$18 above it — and the boundary is not published. `Rates` holds one rate per model, so
 *   what ships is the short-context price, which is the common case for a CLI session.
 * - `cache_write_1h` is never charged for a Codex round whatever it holds: `extract-codex.ts` puts
 *   every cache write into the 5-minute bucket and writes a zero into the 1-hour one.
 *
 * Settings exists so a rate that is wrong for you can be made right.
 */
export function defaultPricing(): Pricing {
  return {
    schema_version: PRICING_VERSION,
    models: {
      // Claude. The 0.1× cache read is the usual multiplier, not a universal one: the 5.1 pair read
      // at 0.025× input and Opus 5.5 at 0.05×, so both say so rather than inheriting the default.
      // The 5.2 pair costs less than the 5.1 pair it follows: $8/$40 against $10/$50.
      'claude-fable-5-2': rates(8, 40, { cacheRead: 0.025 }),
      'claude-mythos-5-2': rates(8, 40, { cacheRead: 0.025 }),
      'claude-fable-5-1': rates(10, 50, { cacheRead: 0.025 }),
      'claude-mythos-5-1': rates(10, 50, { cacheRead: 0.025 }),
      'claude-fable-5': rates(10, 50),
      'claude-mythos-5': rates(10, 50),
      // Cheaper than the Opus 5 it follows — $4/$20 against $5/$25 — which is the first time that
      // has happened in this table, and the reason a store spanning the two cannot read a fall in
      // cost per round as a fall in how much was asked for.
      'claude-opus-5-5': rates(4, 20, { cacheRead: 0.05 }),
      'claude-opus-5': rates(5, 25),
      'claude-opus-4-8': rates(5, 25),
      'claude-opus-4-7': rates(5, 25),
      'claude-opus-4-6': rates(5, 25),
      'claude-opus-4-5': rates(5, 25),
      'claude-opus-4-1': rates(15, 75),
      // Two spellings of one model — see the same pair in `CONTEXT_WINDOWS`.
      'claude-opus-4-0': rates(15, 75),
      'claude-opus-4': rates(15, 75),
      // $2/$10 was announced as an introductory rate through 2026-08-31, and probez shipped $3/$15
      // on the reasoning that the durable price was the right one to hold. Anthropic then cancelled
      // that increase: $2/$10 is the standard price, and the scheduled rise will not happen.
      'claude-sonnet-5-5': rates(2, 10, { cacheRead: 0.05 }),
      'claude-sonnet-5': rates(2, 10),
      'claude-sonnet-4-6': rates(3, 15),
      'claude-sonnet-4-5': rates(3, 15),
      'claude-sonnet-4-0': rates(3, 15),
      'claude-sonnet-4': rates(3, 15),
      // Haiku 5.5 is the one Claude model whose price depends on prompt length: $0.10/$0.50 up to
      // 100,000 input tokens and $0.50/$2.50 above. `Rates` holds one rate per model, so this is
      // the short-prompt price, and a round over 100K is undercharged by 5×.
      'claude-haiku-5-5': rates(0.1, 0.5),
      'claude-haiku-4-5': rates(1, 5),
      'claude-3-5-haiku': rates(0.8, 4),

      // Codex. GPT-6 and GPT-5.6 publish a 30-minute write at 1.25× and a 12-hour write at 2.5×.
      // GPT-6.2 Astra and Sol, GPT-6.1 Sol and GPT-6.1 Terra read the cache at 0.05×. The others
      // read it at the usual tenth.
      'gpt-6.2-astra': rates(8, 40, { ...OPENAI_LONG_WRITE, cacheRead: 0.05 }),
      'gpt-6.2-sol': rates(2, 10, { ...OPENAI_LONG_WRITE, cacheRead: 0.05 }),
      'gpt-6.1-sol': rates(2, 10, { ...OPENAI_LONG_WRITE, cacheRead: 0.05 }),
      'gpt-6.1-terra': rates(1, 5, { ...OPENAI_LONG_WRITE, cacheRead: 0.05 }),
      'gpt-6-astra': rates(10, 50, OPENAI_LONG_WRITE),
      'gpt-6-sol': rates(2, 10, OPENAI_LONG_WRITE),
      'gpt-6-luna': rates(0.1, 0.5, OPENAI_LONG_WRITE),
      'gpt-5.6-sol': rates(4, 20, OPENAI_LONG_WRITE),
      'gpt-5.6-terra': rates(2, 12, OPENAI_LONG_WRITE),
      'gpt-5.6-luna': rates(0.2, 1.2, OPENAI_LONG_WRITE),
      // The GPT-5 generation publishes no cache-write price at all.
      'gpt-5.5': rates(5, 30, NO_WRITE_PREMIUM),
      'gpt-5.4': rates(2.5, 15, NO_WRITE_PREMIUM),
      'gpt-5.4-mini': rates(0.75, 4.5, NO_WRITE_PREMIUM),
      'gpt-5.4-nano': rates(0.2, 1.25, NO_WRITE_PREMIUM),
      // Visual Studio's Copilot Chat default. GitHub's own model list quotes the same $0.25/$2.
      'gpt-5-mini': rates(0.25, 2, NO_WRITE_PREMIUM),
      'gpt-5.3-codex': rates(1.75, 14, NO_WRITE_PREMIUM),
      'gpt-5.2': rates(1.75, 14, NO_WRITE_PREMIUM),
      'gpt-5.1': rates(1.25, 10, NO_WRITE_PREMIUM),
      'gpt-5': rates(1.25, 10, NO_WRITE_PREMIUM),
      'gpt-5-nano': rates(0.05, 0.4, NO_WRITE_PREMIUM),
      // Older and deprecated, but still what Copilot and the bring-your-own-model sources (Goose,
      // OpenCode, Cline) record when one is configured.
      'gpt-4.1': rates(2, 8, { ...NO_WRITE_PREMIUM, cacheRead: 0.25 }),
      'gpt-4.1-mini': rates(0.4, 1.6, { ...NO_WRITE_PREMIUM, cacheRead: 0.25 }),
      'gpt-4o': rates(2.5, 10, { ...NO_WRITE_PREMIUM, cacheRead: 0.5 }),
      'gpt-4o-mini': rates(0.15, 0.6, { ...NO_WRITE_PREMIUM, cacheRead: 0.5 }),
      o3: rates(2, 8, { ...NO_WRITE_PREMIUM, cacheRead: 0.25 }),
    },
  }
}

function isFinitePositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

/** Accept a rate table only if every field of it is a usable number. */
function asRates(value: unknown): Rates | null {
  if (!value || typeof value !== 'object') return null
  const r = value as Record<string, unknown>
  const fields = ['in', 'cache_write_5m', 'cache_write_1h', 'cache_read', 'out'] as const
  for (const field of fields) if (!isFinitePositive(r[field])) return null
  return {
    in: r.in as number,
    cache_write_5m: r.cache_write_5m as number,
    cache_write_1h: r.cache_write_1h as number,
    cache_read: r.cache_read as number,
    out: r.out as number,
  }
}

/**
 * Read the rates: the published ones, overlaid with whatever this machine saved.
 *
 * The file used to be authoritative in full, so that a model could be left *unpriced* on purpose —
 * blanking a row wrote a file that omitted the model, and merging the defaults back would have made
 * the row reappear. The cost of that was steep and invisible: absence meant two things at once, so
 * a model added to the defaults by a later probez could never reach anyone who had saved even once.
 *
 * A blank now has its own spelling. A tombstone — the model present with a `null` beside it — says
 * "deliberately unpriced", and absence goes back to meaning "never heard of it", which is the thing
 * a default is for. Reading a v1 file tombstones the models it omits *that v1 also offered*, so a
 * row somebody blanked stays blank while every model added since flows in. See `V1_DEFAULTS`.
 */
export async function readPricing(dataDir: string): Promise<Pricing> {
  let raw: unknown
  try {
    raw = JSON.parse(await readFile(pricingFile(dataDir), 'utf8'))
  } catch {
    return defaultPricing()
  }
  const body = raw as { schema_version?: unknown; models?: unknown } | null
  const saved = body?.models
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return defaultPricing()
  const rows = saved as Record<string, unknown>

  const models: Record<string, Rates | null> = { ...defaultPricing().models }
  const version = typeof body?.schema_version === 'number' ? body.schema_version : 1
  if (version < 2) {
    for (const model of V1_DEFAULTS) {
      if (!Object.hasOwn(rows, model)) models[model] = null
    }
  }
  for (const [model, value] of Object.entries(rows)) {
    if (value === null) {
      models[model] = null
      continue
    }
    const parsed = asRates(value)
    if (parsed !== null) models[model] = parsed
  }
  return { schema_version: PRICING_VERSION, models }
}

/** Write the rates owner-only, the same way everything else under the data directory is written. */
export async function writePricing(dataDir: string, pricing: Pricing): Promise<void> {
  await mkdir(dataDir, { recursive: true, mode: 0o700 })
  const body = { schema_version: PRICING_VERSION, models: pricing.models }
  await writeFile(pricingFile(dataDir), JSON.stringify(body, null, 2) + '\n', {
    encoding: 'utf8',
    mode: 0o600,
  })
}

/**
 * What one round cost, in dollars.
 *
 * Null when the model has no rate, which is not the same as free: a round that cost something
 * unknown must not be counted as a round that cost nothing, or every share around it is wrong by
 * however much it actually was.
 */
export function costOf(round: Round, pricing: Pricing): number | null {
  return priceOf(pricing, round.model, {
    uncached: round.in_uncached,
    write_5m: round.in_cache_write_5m,
    write_1h: round.in_cache_write_1h,
    cache_read: round.in_cache_read,
    out: round.out_tokens,
  })
}

/** The five counts a price is worked out from. Nulls are zero here; an absent *rate* is not. */
export interface Charged {
  uncached: number | null
  write_5m: number | null
  write_1h: number | null
  cache_read: number | null
  out: number | null
}

/**
 * The same arithmetic as `costOf`, over the counts rather than over a round.
 *
 * The search index holds those counts in columns and never builds a round, so without this it
 * would have to either carry a copy of this formula or store a price — and a stored price goes
 * silently wrong the moment somebody corrects a rate. One formula, two callers.
 *
 * The lookup goes through `resolveModel`, so a rate set against `claude-haiku-4-5` also prices the
 * `claude-haiku-4-5-20251001` rounds Claude Code actually recorded — including a rate typed into
 * Settings, since what is asked is this table rather than the shipped one.
 */
export function priceOf(pricing: Pricing, model: string | null, charged: Charged): number | null {
  const id = resolveModel(model, (one) => pricing.models[one] != null)
  if (id === null) return null
  const rate = pricing.models[id]
  if (rate === undefined || rate === null) return null
  // A full price needs every component measured, not just some of them. Copilot CLI's rounds carry
  // a real per-round output-token count, but input tokens are known only when a session's usage
  // checkpoint could be matched back to the round (see extract-copilot.ts) — so a round can have a
  // real `out` and every input field null. Pricing the output alone there would print a real dollar
  // figure that silently omits the larger, unmeasured half of the bill, which is worse than the
  // blank it would otherwise show: a count that was never measured must not be charged as zero,
  // whether that is every count or only some of them.
  if (
    charged.uncached === null ||
    charged.write_5m === null ||
    charged.write_1h === null ||
    charged.cache_read === null ||
    charged.out === null
  ) {
    return null
  }
  return (
    ((charged.uncached || 0) * rate.in +
      (charged.write_5m || 0) * rate.cache_write_5m +
      (charged.write_1h || 0) * rate.cache_write_1h +
      (charged.cache_read || 0) * rate.cache_read +
      (charged.out || 0) * rate.out) /
    1_000_000
  )
}
