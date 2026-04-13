import type {
  DatabaseInspector,
  DatabaseTableColumn,
  DatabaseTableData,
  DatabaseTableSummary
} from "../database.inspector.types.js";
import type { SqliteClient } from "./sqlite.client.js";

interface SqliteTableRow {
  name: string;
}

interface SqliteColumnRow {
  name: string;
  type: string;
  notnull: 0 | 1;
  pk: 0 | 1;
}

export class SqliteInspector implements DatabaseInspector {
  constructor(private readonly sqlite: SqliteClient) {}

  listTables(): DatabaseTableSummary[] {
    const tables = this.sqlite
      .prepare<[], SqliteTableRow>(
        `
          SELECT name
          FROM sqlite_master
          WHERE type = 'table'
            AND name NOT LIKE 'sqlite_%'
          ORDER BY name ASC
        `
      )
      .all();

    return tables.map((table) => ({
      name: table.name,
      rowCount: this.getTableRowCount(table.name)
    }));
  }

  getTableData(table: string, limit: number): DatabaseTableData | null {
    if (!this.tableExists(table)) {
      return null;
    }

    const safeLimit = Math.max(1, Math.min(limit, 200));
    const columns = this.sqlite
      .prepare<[], SqliteColumnRow>(`PRAGMA table_info("${table.replace(/"/g, "\"\"")}")`)
      .all()
      .map<DatabaseTableColumn>((column) => ({
        name: column.name,
        type: column.type || "TEXT",
        notNull: column.notnull === 1,
        isPrimaryKey: column.pk === 1
      }));

    const rows = this.sqlite
      .prepare<[number], Record<string, unknown>>(
        `SELECT * FROM "${table.replace(/"/g, "\"\"")}" ORDER BY rowid DESC LIMIT ?`
      )
      .all(safeLimit);

    return {
      table,
      columns,
      rows
    };
  }

  private tableExists(table: string): boolean {
    const match = this.sqlite
      .prepare<[string], SqliteTableRow | undefined>(
        `
          SELECT name
          FROM sqlite_master
          WHERE type = 'table'
            AND name = ?
        `
      )
      .get(table);

    return Boolean(match);
  }

  private getTableRowCount(table: string): number {
    const result = this.sqlite
      .prepare<[], { total: number }>(
        `SELECT COUNT(*) AS total FROM "${table.replace(/"/g, "\"\"")}"`
      )
      .get();

    return result?.total ?? 0;
  }
}
