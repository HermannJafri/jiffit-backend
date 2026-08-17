import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REQUIRED_REHEARSAL_TABLES } from './legacy-map';
import { inventoryLegacySqlDump } from './sql-inventory';

const DEFAULT_DUMP = 'C:\\Users\\herma\\Downloads\\Backup\\old-jiffit-latest.sql';

async function main() {
  const dryRun = process.argv.includes('--dry-run') || !process.argv.includes('--apply');
  const dump = process.env.LEGACY_SQL_DUMP ?? DEFAULT_DUMP;
  const suppressSideEffects = true;

  if (!dryRun) {
    throw new Error('Apply mode is disabled until a dedicated staging MySQL is confirmed. Use --dry-run.');
  }

  const rows = await inventoryLegacySqlDump(dump);
  const missing = REQUIRED_REHEARSAL_TABLES.filter((table) => !rows.some((row) => row.table === table));
  const report = {
    generatedAt: new Date().toISOString(),
    dump,
    dryRun: true,
    suppressSideEffects,
    sideEffects: { fcm: false, otp: false, zoho: false, sms: false, autoDispatch: false },
    missingRequiredTables: missing,
    tables: rows,
    totals: {
      tables: rows.length,
      insertStatements: rows.reduce((sum, row) => sum + row.insertStatements, 0),
      estimatedRows: rows.reduce((sum, row) => sum + row.estimatedRows, 0),
    },
    nextApplyRequires: [
      'Isolated staging MySQL (never unknown production)',
      'Default hub per legacy city',
      'Invoice FY prefix continuation decision',
      'Fresh production dump for cutover (this dump is rehearsal)',
    ],
  };

  const outDir = join(process.cwd(), 'docs', 'migration-reports');
  mkdirSync(outDir, { recursive: true });
  const jsonPath = join(outDir, 'legacy-dry-run.json');
  const mdPath = join(outDir, 'legacy-dry-run.md');
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  writeFileSync(
    mdPath,
    [
      '# Legacy dump dry-run',
      '',
      `- Dump: \`${dump}\``,
      `- Generated: ${report.generatedAt}`,
      `- Side effects suppressed: FCM/OTP/Zoho/SMS/dispatch`,
      `- Missing required tables: ${missing.length ? missing.join(', ') : 'none'}`,
      '',
      '| Table | Inserts | Est. rows | Target | Notes |',
      '|-------|---------|-----------|--------|-------|',
      ...rows.map((row) => `| ${row.table} | ${row.insertStatements} | ${row.estimatedRows} | ${row.target} | ${row.notes} |`),
      '',
      'Apply to a live database is intentionally blocked until staging MySQL is confirmed.',
      '',
    ].join('\n'),
  );
  console.log(`Wrote ${jsonPath} and ${mdPath}`);
  if (missing.length) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
