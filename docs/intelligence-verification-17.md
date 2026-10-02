# Verification and rollout for issues #14 and #17

## Evidence and limits

Both issues concern the same seven AWS/Google sources. Every previous hash in #17
matches the current hash in #14. The old scanner hashed the whole page and kept
no article text. Exact historical article differences cannot be reconstructed
from those hashes. Do not classify all seven as proven false positives or create
material project events merely because their hashes changed.

Current official articles support the existing investment/location claims:
Northern Indiana $15B and 2,400 MW; Madison County $10B; Pennsylvania at least
$20B; Butts/Douglas counties estimated $11B; Richmond County $10B; Fort Wayne
$2B; Fayette County estimated $5B. Northern Indiana's up-to-3,000-MW generation
plan is a separate measure. Ohio's broader $10B expansion is not Fayette's
local investment. None of these old announcement pages alone verifies current
construction or operational status.

Google's source explicitly dates its article April 26, 2024. The static record
now contains that date. Migration 009 only fills a missing date on the matching
production record and source URL; it does not advance last_verified_at.

## Scanner behavior

AWS and Google use strict, publisher-specific article containers and exclude
embedded recommendations. Missing, ambiguous or short article bodies report a
fetch/extraction failure without replacing their snapshot. Other publishers keep
their legacy whole-page extraction behavior pending separate verification.

The first scan after the extraction-version change establishes article baselines,
retains the legacy hash and leaves historical queue entries unchanged. It does
not claim old alerts are resolved. Subsequent article changes preserve previous
and current text in the verification queue. last_observed_at records successful
fetches; it is not human verification. No scan updates intel_projects or
last_verified_at. --dry-run writes neither snapshots, queue nor GITHUB_OUTPUT.

## Smallest safe production sequence

1. Read the seven production intel_projects records by slug and compare their
   source URLs, dates, stage, capacity and investment with data/projects.json.
   The page prefers Supabase while the CSV exporter reads the static JSON.
2. Apply seed/009_google_source_date.sql after checking the matching Google row.
   Confirm exactly the expected missing publication date is filled. If a
   conflicting date already exists, investigate it rather than overwriting it.
3. Review and merge the code only after extraction tests and npm run build pass.
   Run the scanner in dry-run mode before the first write-enabled scheduled run.
   Inspect failures and the seven new article baselines; do not infer materiality
   from the baseline migration.
4. Compare two fresh fetches of each affected article. Retain the first comparable
   article baseline for future evidence. Resolve historical queue entries/issues
   only with a human verification note explaining the absence of historical text.
5. Verify the production detail pages, database/company/market views and sample
   CSV. Confirm Google displays the correct publication date in its source trail.
   A successful deployment status alone is not a production data check.

## Mapping gate

data/project-location-evidence.json records only officially supported geographic
precision: region, county, township or city. The detail page displays it only
when its source URL matches the reviewed evidence. Exact site verification is
false for every included record. No coordinates or exact pins are invented.

Before publishing an interactive map, obtain geographic boundaries or centroids
with their own provenance and label them approximate. Pennsylvania and Georgia
each have multiple areas sharing one program-level investment; do not count the
total twice. Add exact pins only after official address/parcel evidence. Current
construction status needs a separately dated source before changing stage.
