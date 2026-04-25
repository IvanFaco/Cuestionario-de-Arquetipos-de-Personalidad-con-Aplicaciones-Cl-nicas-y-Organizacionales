export interface DatabaseTableSummary {
  name: string;
  rowCount: number;
}

export interface DatabaseTableColumn {
  name: string;
  type: string;
  notNull: boolean;
  isPrimaryKey: boolean;
}

export interface DatabaseTableData {
  table: string;
  columns: DatabaseTableColumn[];
  rows: Record<string, unknown>[];
}

export interface DatabaseInspector {
  listTables(): DatabaseTableSummary[];
  getTableData(table: string, limit: number): DatabaseTableData | null;
}
