# Curation Engine: Exact Runtime Behavior

This document explains exactly how curation is generated today in this codebase.

## 1) Entry Point and Lifecycle

Main runtime file:
- `src/lib/curation-engine.ts`

High-level sequence:
1. `runCuration(input)` is called.
2. Credit is validated and 1 credit is deducted in a DB transaction.
3. A `curation` row is created with status `pending`.
4. Processing is queued through QStash (`/api/internal/curations/process`) if configured, otherwise processed locally.
5. `processCuration(...)` runs and updates status to `processing`.
6. Candidate pools are fetched from DB.
7. AI keyword/category expansion runs.
8. AI scoring + deterministic scoring are combined.
9. Section A-F results are built.
10. Results are saved into `curation_results`.
11. Curation status is set to `completed`.

## 2) Caching Behavior

Current behavior:
- Curation detail endpoint (`GET /api/curations/[id]`) reads directly from DB.
- No curation detail cache is used in that route now.

Still present (not result caching):
- Redis progress key `curation:<id>:progress` is used for transient progress events (`started`, `fetching_sites`, `calling_ai`, etc.) with 10-minute TTL.
- This does not cache curation results; it only supports live progress signaling.

Important product behavior:
- Completed curations are snapshots because results are saved in `curation_results` at generation time.
- Changing code later does not mutate old curation rows; new logic applies to new curations.

## 3) Category Resolution

Inside `processCuration(...)`:
- AI intent expansion returns `expandedKeywords` and `inferredCategoryId`.
- Effective category is:
  - user-selected `categoryId`, or
  - inferred category if user did not select one.
- If neither exists, processing throws `CATEGORY_REQUIRED_FOR_CURATION`.

So category is mandatory for a successful curation run.

## 4) Website Candidate Query Logic (Sections A, B, C)

Website types are mapped as:
- Section A -> `distribution`
- Section B -> `guest_post`
- Section C -> `press_release`

### 4.1 Base website conditions

`websiteBaseConditions`:
- `isActive = true`
- `isExcluded = false`
- country constraint if selected: `(countryId = selected OR countryId IS NULL)`
- strict category membership via join table: `websiteCategories.some(categoryId = effectiveCategoryId)`

Note:
- Curation does not treat `website.categoryId` as the source of truth for category membership.
- If a website is linked to a category in `website_categories`, it is eligible for that category's curation.

### 4.2 Primary website query (`rawWebsites`)

Query applies base conditions plus keyword matching on:
- `tagSlugs`
- `description`
- `name`

Ordered by:
- `starRating DESC`
- `da DESC`

Limit:
- `take: 150`

### 4.3 Website fallbacks

If too few websites are found:
1. If `< 10`, drop keyword filters but keep base conditions (country + category remain).
2. If still `0`, last resort keeps strict category, relaxes country.

### 4.4 Guaranteed starred website injection

A separate query fetches all websites in selected category with:
- `starRating >= 3`
- `isActive = true`
- `isExcluded = false`

These are appended if missing, so 3-star and above always enter candidate pool.

### 4.5 Per-section type backfill

Engine then independently backfills each website type:
- `distribution`
- `guest_post`
- `press_release`

For each type, if count `< 20`, it queries more rows of that type in same category (country-aware), ordered by `starRating DESC, da DESC`, and appends until type count reaches 20 or inventory is exhausted.

This means each section can only reach 20 if the DB actually has 20+ rows for that type in the selected category (after filters).

## 5) Ranking Logic for A/B/C (5-star -> 4-star -> 3-star -> rest)

Function: `buildTieredWebsiteResults(...)`

Per section:
1. Build pool for required website type.
2. Compute effective score per item:
   - AI score if available, else deterministic fallback.
3. Convert star to tier:
   - 5, 4, 3, or 0.
4. Order by hard tier sequence:
   - all 5-star first
   - then 4-star
   - then 3-star
   - then unstarred
5. Within each tier, sort by effective score (then tie-breakers).
6. Slice top 20.

So star ordering is a hard precedence rule, not a soft hint.

## 6) Influencers / Reddit / Funds (Sections D/E/F)

Similar pattern exists:
- hard/soft filters for each entity type
- fallback behavior if candidate counts are low
- guaranteed inclusion for starred entities (4-star and above)
- AI + deterministic score merge
- top 20 per section

## 7) Why You Can See 11 Distribution Results

If Distribution shows fewer than 20 for a category, the most common reason is inventory:
- there are fewer than 20 eligible `distribution` websites in that selected category (and country/global constraints),
- so backfill cannot create additional rows.

Current verified counts for category `al-tools-agents` (after relation-based category fix):
- `distribution: 25`
- `guest_post: 19`
- `press_release: 73`

So section A now has enough inventory to fill 20 rows for this category.

## 8) What Gets Persisted

Results are persisted in `curation_results` with:
- section (`a` to `f`)
- rank (1..20, or fewer if inventory limited)
- entity foreign key (`websiteId`, `influencerId`, `redditChannelId`, `fundId`)
- `matchScore`
- `matchReason`

These persisted rows are what the API returns later.

## 9) Observability Logs

During processing, engine logs:
- `[Curation] Website candidate counts` with per-type candidate totals.
- `[Curation] Final section counts` with pre-filter and post-filter totals.

These logs are the best way to verify what inventory existed at runtime and what each section actually produced.

## 10) Practical Rule of Thumb

Expected section size is:
- `min(20, eligible inventory for that section type under active filters)`

So to force Section A (Distribution) to always return 20 for a category, that category must contain at least 20 eligible `distribution` websites.
