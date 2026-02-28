# Template Schema Migration System v1

## 1. Migration registry structure

The migration system is implemented in `src/features/packages/templateSchemaMigration.ts` and is centered around:

- `CURRENT_SCHEMA_VERSION = '1.0.0'`
- `TemplateMigration` type:
  - `from: string`
  - `to: string`
  - `migrate(template, context): VortexPackage`
- `MIGRATIONS` ordered list that defines deterministic step-by-step upgrades.

Current registry:

- `0.9.0 -> 1.0.0` via `migrate_0_9_0_to_1_0_0`

## 2. Version comparison logic

`compareSchemaVersions(left, right)` performs strict semver comparison using `MAJOR.MINOR.PATCH`.

- Versions are parsed by `parseSemver`.
- Invalid formats throw `TemplateMigrationError`.
- Comparison returns:
  - `1` if left is newer
  - `-1` if left is older
  - `0` if equal

## 3. Migration execution flow

On `.vortex` package load (`loadVortexPackage`):

1. ZIP content is parsed.
2. `manifest.json`, `scene.json`, and `bindings.json` are validated.
3. A `VortexPackage` object is assembled.
4. `migrateTemplatePackage(loadedPackage)` is executed.
5. Migration behavior:
   - If package version equals `CURRENT_SCHEMA_VERSION`, no migration is applied.
   - If package is older, sequential migrations are applied in registry order.
   - If package is newer, loading hard-stops.
   - If an intermediate path is missing, loading hard-stops.
6. Migration errors are converted to `VortexPackageError` so callers receive a single package-loading error type.

## 4. Failure modes

The loader now fails fast with explicit errors for:

- Template schema newer than engine version.
- Missing migration path between versions.
- Invalid semver schema string.
- Existing package structural issues (missing required files, invalid JSON, invalid manifest shape).

## 5. Example migration implementation

`migrate_0_9_0_to_1_0_0` demonstrates:

- Pure migration that clones input package (`clonePackage`) and returns a new package.
- Legacy field mapping from `manifest.formatDetail` to `manifest.format`.
- Developer-mode deprecation warning:
  - `manifest.formatDetail is deprecated. Mapping formatDetail -> format.`
- Final schema bump to `schemaVersion: '1.0.0'`.

## 6. Testing strategy

Recommended checks:

1. **Current schema pass-through**
   - Package with `schemaVersion: 1.0.0` loads unchanged.
2. **Older schema migration**
   - Package with `schemaVersion: 0.9.0` migrates to `1.0.0`.
   - Verify `templateId` remains unchanged.
3. **Missing schemaVersion fallback**
   - Legacy package missing `schemaVersion` resolves as `0.9.0`, then migrates.
4. **Newer-than-engine rejection**
   - Package with `schemaVersion > 1.0.0` hard-stops.
5. **Missing path rejection**
   - Package version with no chain in `MIGRATIONS` hard-stops.
6. **Determinism**
   - Run migration twice on same input and deep-compare outputs.
7. **Developer logging**
   - In developer mode, assert migration summary and deprecation warnings are emitted.
