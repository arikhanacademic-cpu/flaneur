# Flâneur

A mobile-first scenic walking companion with an original pastel-pink bunny mascot.

## Working flows
- Real OpenStreetMap map, user-initiated area search and mapped-place discovery.
- FOSSGIS pedestrian directions through suggested or bookmarked stops; cached and rate limited.
- Time-budget loop suggestions, with explicit notice when nearby stops exceed the budget.
- Account-scoped D1 persistence for saved routes, preferences, activity and journal.
- R2 photo uploads with account-scoped read access and size/type validation.
- Shared invitation links, participant responses, opt-in active location, 45-second expiry and host stop.
- GPS distance and elapsed walking time with pause/resume/finish. No invented step count.
- Optional estimated active energy above rest, portion-scaled food illustrations and source links.
- Golden-hour departure suggestion from sunset time and route duration.
- Community reports, saved device-local directions, app-shell service worker and install manifest.

## Boundaries
- Site starts owner-private; invitations require recipients to have Site access. No audience change is automatic.
- HealthKit / Health Connect and background native pedometer integration are not implemented. Browser step counts show unavailable.
- GPS recording requires permissions and a foreground browser; mobile OS background suspension may interrupt fixes.
- Offline directions and dashboard snapshots are cached on the device. Offline map tiles are not downloaded.
- Scenic suitability is inferred from OSM tags or editorial suggested stops, not a verified ranking of every street. Illustrations depict atmosphere, not photographic evidence.
- Noise, elevation, stairs, surfaces, opening hours and lighting are unknown unless independently checked. No safety or accessibility certification.
- Public OSM services are suitable for this low-volume preview. Production traffic needs a provider with a supported quota/SLA.
- Cache of dashboard data may include optional weight. Clear dashboard data removes device caches and account dashboard state, but not past shared invitations or R2 uploads.

## Sources
- Map: https://www.openstreetmap.org/copyright
- Pedestrian routing: https://routing.openstreetmap.de/about.html
- Search: https://nominatim.org/release-docs/latest/api/Search/
- Places: https://github.com/komoot/photon
- Sunset: https://sunrise-sunset.org/api
- MET walking values: https://pacompendium.com/walking/
- Food energy: USDA SR Legacy / FoodData Central IDs 171688 (apple 52 kcal/100 g), 173944 (banana 89), 174987 (butter croissant 406).

## Validation
TypeScript, production Vinext build, database migration/constraint checks and domain calculations. Browser QA unavailable in this authoring environment; real-device GPS and live provider responses still require runtime testing.

## Nearby discovery reliability update
Named-area searches use Photon/OpenStreetMap without sending GPS coordinates to Photon. Distances and nearby filtering run within the app. A checked Croydon place catalog keeps real parks available when live lookup fails. It includes public OSM named-place snapshots and council directory links. Route options can be loops or one-way walks, with selectable/reorderable real stops. GPS-selected and searched areas persist in account preferences.
