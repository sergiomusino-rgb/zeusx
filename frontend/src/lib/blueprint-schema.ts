import { z } from 'zod';

// Tipi che possono arrivare da vari LLM
const FieldTypeSchema = z.union([
  z.enum([
    'text', 'number', 'date', 'datetime', 'boolean', 'email', 'phone',
    'textarea', 'select', 'multiselect', 'relation', 'currency', 'file', 'image'
  ]),
  z.enum(['string', 'integer', 'decimal', 'float', 'timestamp', 'json']),
]);

function normalizeFieldType(type: string): string {
  const mapping: Record<string, string> = {
    string: 'text',
    varchar: 'text',
    integer: 'number',
    int: 'number',
    decimal: 'number',
    float: 'number',
    numeric: 'number',
    timestamp: 'datetime',
    jsonb: 'text',
    json: 'text',
  };
  return mapping[type?.toLowerCase()] || type;
}

const FieldOptionsSchema = z.union([
  z.array(z.string()),
  z.array(z.object({ value: z.string(), label: z.string() }).transform(o => o.label || o.value)),
  z.record(z.string()).transform(rec => Object.values(rec)),
  z.null(),
]).optional().default([]);

export const FieldSchema = z.object({
  id: z.string().min(1).transform(s => s.replace(/[^a-z0-9_]/gi, '_').toLowerCase()),
  type: FieldTypeSchema.transform(normalizeFieldType),
  label: z.string().min(1).max(100).default('Campo'),
  required: z.boolean().default(false),
  options: FieldOptionsSchema,
  target: z.union([z.string(), z.null()]).optional().transform(v => v || undefined),
  targetLabel: z.union([z.string(), z.null()]).optional().transform(v => v || undefined),
});

export const TableSchema = z.object({
  name: z.string().min(1).transform(s => s.replace(/[^a-z0-9_]/gi, '_').toLowerCase()),
  label: z.string().min(1).max(100).default('Tabella'),
  labelPlural: z.string().min(1).max(100).default('Tabelle'),
  fields: z.array(FieldSchema).min(1).max(50),
  icon: z.string().optional().default(''),
});

export const DashboardCardSchema = z.object({
  type: z.enum(['count', 'sum', 'latest', 'chart']).default('count'),
  table: z.string().default(''),
  label: z.string().default(''),
  field: z.string().optional().default(''),
  filter: z.record(z.string(), z.any()).optional(),
});

export const UIConfigSchema = z.object({
  primaryColor: z.union([
    z.string().regex(/^#([0-9A-Fa-f]{6})$/),
    z.string().transform(v => v.startsWith('#') ? v : `#${v}`),
  ]).default('#6366f1'),
  sidebar: z.union([
    z.array(z.string()),
    z.array(z.object({ name: z.string() }).transform(o => o.name)),
  ]).default([]),
  dashboardCards: z.array(DashboardCardSchema).default([]),
});

export const BlueprintJSONSchema = z.object({
  appName: z.string().min(1).max(100).default('Nuova App'),
  sector: z.string().min(1).max(50).default('custom'),
  description: z.string().max(500).optional().default(''),
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
