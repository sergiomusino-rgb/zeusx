import { z } from 'zod';

export const FieldSchema = z.object({
  id: z.string().regex(/^[a-z_][a-z0-9_]*$/, "Field id must be snake_case"),
  type: z.enum([
    'text', 'number', 'date', 'datetime', 'boolean', 'email', 'phone',
    'textarea', 'select', 'multiselect', 'relation', 'currency', 'file', 'image'
  ]),
  label: z.string().min(1).max(100),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  target: z.string().optional(),
  targetLabel: z.string().optional(),
});

export const TableSchema = z.object({
  name: z.string().regex(/^[a-z_][a-z0-9_]*$/, "Table name must be snake_case"),
  label: z.string().min(1).max(100),
  labelPlural: z.string().min(1).max(100),
  fields: z.array(FieldSchema).min(1).max(50),
  icon: z.string().optional(),
});

export const DashboardCardSchema = z.object({
  type: z.enum(['count', 'sum', 'latest', 'chart']),
  table: z.string(),
  label: z.string(),
  field: z.string().optional(),
  filter: z.record(z.string(), z.any()).optional(),
});

export const UIConfigSchema = z.object({
  primaryColor: z.string().regex(/^#([0-9A-Fa-f]{6})$/, "Must be hex color").default('#6366f1'),
  sidebar: z.array(z.string()).default([]),
  dashboardCards: z.array(DashboardCardSchema).default([]),
});

export const BlueprintJSONSchema = z.object({
  appName: z.string().min(1).max(100),
  sector: z.string().regex(/^[a-z0-9_-]+$/, "Sector must be url-safe"),
  description: z.string().max(500).optional(),
  schema: z.object({
    tables: z.array(TableSchema).min(1).max(20),
  }),
  ui: UIConfigSchema,
});

export type Field = z.infer<typeof FieldSchema>;
export type Table = z.infer<typeof TableSchema>;
export type DashboardCard = z.infer<typeof DashboardCardSchema>;
export type UIConfig = z.infer<typeof UIConfigSchema>;
export type BlueprintJSON = z.infer<typeof BlueprintJSONSchema>;

export function sanitizeBlueprint(raw: unknown): BlueprintJSON {
  return BlueprintJSONSchema.parse(raw);
}

export function normalizeSector(sector: string): string {
  return sector
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/-+/g, '-')
    .substring(0, 50);
}

export function generateSQLTableName(appId: string, tableName: string): string {
  const safeAppId = appId.replace(/[^a-z0-9]/gi, '');
  const safeTable = tableName.replace(/[^a-z0-9_]/g, '');
  return `app_${safeAppId}_${safeTable}`;
}

export function fieldToSQLType(field: Field): string {
  switch (field.type) {
    case 'number':
    case 'currency':
      return 'NUMERIC';
    case 'boolean':
      return 'BOOLEAN';
    case 'date':
      return 'DATE';
    case 'datetime':
      return 'TIMESTAMPTZ';
    default:
      return 'TEXT';
  }
}
