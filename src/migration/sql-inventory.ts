import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { mapLegacyTable } from './legacy-map';

export type InventoryRow = {
  table: string;
  insertStatements: number;
  estimatedRows: number;
  target: string;
  notes: string;
};

export async function inventoryLegacySqlDump(filePath: string): Promise<InventoryRow[]> {
  const counts = new Map<string, { insertStatements: number; estimatedRows: number }>();
  let current: string | null = null;
  const stream = createReadStream(filePath, { encoding: 'utf8' });
  const lines = createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of lines) {
    const start = line.match(/^INSERT INTO `([^`]+)`/i);
    if (start) {
      current = start[1];
      const entry = counts.get(current) ?? { insertStatements: 0, estimatedRows: 0 };
      entry.insertStatements += 1;
      entry.estimatedRows += 1;
      counts.set(current, entry);
      continue;
    }
    if (current && /^\(/ .test(line.trim())) {
      const entry = counts.get(current);
      if (entry) entry.estimatedRows += 1;
    }
    if (current && /;\s*$/.test(line)) current = null;
  }

  return [...counts.entries()]
    .map(([table, stats]) => {
      const mapped = mapLegacyTable(table);
      return { table, ...stats, target: mapped.target, notes: mapped.notes };
    })
    .sort((a, b) => a.table.localeCompare(b.table));
}
