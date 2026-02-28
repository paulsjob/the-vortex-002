import type { VortexPackage } from './loadVortexPackage';

export const CURRENT_SCHEMA_VERSION = '1.0.0';
const LEGACY_SCHEMA_VERSION = '0.9.0';

export type TemplateMigration = {
  from: string;
  to: string;
  migrate: (template: VortexPackage, context: MigrationContext) => VortexPackage;
};

type Logger = Pick<Console, 'info' | 'warn'>;

export type MigrationContext = {
  developerMode: boolean;
  warnDeprecation: (message: string) => void;
};

export type MigrationSummary = {
  originalVersion: string;
  finalVersion: string;
  appliedMigrations: string[];
};

export class TemplateMigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TemplateMigrationError';
  }
}

const SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

const parseSemver = (version: string): [number, number, number] => {
  const match = version.match(SEMVER_PATTERN);
  if (!match) {
    throw new TemplateMigrationError(`Invalid schema version format \"${version}\". Expected MAJOR.MINOR.PATCH.`);
  }

  return [Number(match[1]), Number(match[2]), Number(match[3])];
};

export const compareSchemaVersions = (left: string, right: string): number => {
  const leftParts = parseSemver(left);
  const rightParts = parseSemver(right);

  for (let index = 0; index < leftParts.length; index += 1) {
    if (leftParts[index] > rightParts[index]) {
      return 1;
    }

    if (leftParts[index] < rightParts[index]) {
      return -1;
    }
  }

  return 0;
};

const clonePackage = (pkg: VortexPackage): VortexPackage => ({
  manifest: { ...pkg.manifest },
  scene: structuredClone(pkg.scene),
  bindings: structuredClone(pkg.bindings),
  files: {
    assets: { ...pkg.files.assets },
    fonts: { ...pkg.files.fonts },
    previews: { ...pkg.files.previews },
    source: { ...pkg.files.source },
    ...(pkg.files.checksums !== undefined ? { checksums: structuredClone(pkg.files.checksums) } : {}),
  },
});

const migrate_0_9_0_to_1_0_0 = (template: VortexPackage, context: MigrationContext): VortexPackage => {
  const migrated = clonePackage(template);
  const manifest = migrated.manifest as Record<string, unknown>;

  if (manifest.formatDetail && typeof manifest.formatDetail === 'object' && !manifest.format) {
    context.warnDeprecation('manifest.formatDetail is deprecated. Mapping formatDetail -> format.');
    manifest.format = structuredClone(manifest.formatDetail);
  }

  manifest.schemaVersion = '1.0.0';

  return migrated;
};

export const MIGRATIONS: TemplateMigration[] = [
  { from: '0.9.0', to: '1.0.0', migrate: migrate_0_9_0_to_1_0_0 },
];

export const resolveTemplateSchemaVersion = (
  pkg: Pick<VortexPackage, 'manifest'>,
  options: { developerMode?: boolean; logger?: Logger } = {},
): string => {
  const developerMode = options.developerMode ?? false;
  const logger = options.logger ?? console;

  if (typeof pkg.manifest.schemaVersion === 'string' && pkg.manifest.schemaVersion.trim().length > 0) {
    return pkg.manifest.schemaVersion;
  }

  if (developerMode) {
    logger.warn(
      `[vortex-schema] schemaVersion is missing in template ${pkg.manifest.templateId}. Assuming legacy ${LEGACY_SCHEMA_VERSION}.`,
    );
  }

  return LEGACY_SCHEMA_VERSION;
};

export const migrateTemplatePackage = (
  pkg: VortexPackage,
  options: { developerMode?: boolean; logger?: Logger } = {},
): { pkg: VortexPackage; summary: MigrationSummary } => {
  const developerMode = options.developerMode ?? false;
  const logger = options.logger ?? console;

  const originalVersion = resolveTemplateSchemaVersion(pkg, { developerMode, logger });
  const versionComparison = compareSchemaVersions(originalVersion, CURRENT_SCHEMA_VERSION);

  if (versionComparison > 0) {
    throw new TemplateMigrationError(
      `Template requires schema ${originalVersion}, but this engine supports up to ${CURRENT_SCHEMA_VERSION}.`,
    );
  }

  if (versionComparison === 0) {
    return {
      pkg,
      summary: {
        originalVersion,
        finalVersion: originalVersion,
        appliedMigrations: [],
      },
    };
  }

  let currentVersion = originalVersion;
  let currentPackage = clonePackage(pkg);
  const appliedMigrations: string[] = [];

  while (compareSchemaVersions(currentVersion, CURRENT_SCHEMA_VERSION) < 0) {
    const migration = MIGRATIONS.find((candidate) => candidate.from === currentVersion);

    if (!migration) {
      throw new TemplateMigrationError(
        `No migration path found from schema ${currentVersion} to ${CURRENT_SCHEMA_VERSION}.`,
      );
    }

    const context: MigrationContext = {
      developerMode,
      warnDeprecation: (message) => {
        if (developerMode) {
          logger.warn(`[vortex-schema][deprecation] ${message}`);
        }
      },
    };

    currentPackage = migration.migrate(currentPackage, context);
    currentVersion = migration.to;
    appliedMigrations.push(`${migration.from}->${migration.to}`);
  }

  const summary: MigrationSummary = {
    originalVersion,
    finalVersion: currentVersion,
    appliedMigrations,
  };

  if (developerMode) {
    logger.info(
      `[vortex-schema] Migrated template ${pkg.manifest.templateId} from ${summary.originalVersion} to ${summary.finalVersion}. Applied: ${summary.appliedMigrations.join(', ') || 'none'}`,
    );
  }

  return {
    pkg: currentPackage,
    summary,
  };
};
