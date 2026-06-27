import { z } from 'zod';

// Accetta qualsiasi tipo di campo e lo normalizza
const FieldTypeSchema = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).toLowerCase().trim());

function normalizeFieldType(type: string): string {
  const mapping: Record<string, string> = {
    string: 'text',
    varchar: 'text',
    char: 'text',
    text: 'text',
    integer: 'number',
    int: 'number',
    bigint: 'number',
    decimal: 'number',
    float: 'number',
    double: 'number',
    numeric: 'number',
    timestamp: 'datetime',
    timestamptz: 'datetime',
    date: 'date',
    datetime: 'datetime',
    jsonb: 'text',
    json: 'text',
    boolean: 'boolean',
    bool: 'boolean',
    email: 'email',
    phone: 'phone',
    textarea: 'textarea',
    select: 'select',
    multiselect: 'multiselect',
    relation: 'relation',
    currency: 'currency',
    file: 'file',
    image: 'image',
  };
  return mapping[type] || 'text';
}

const FieldOptionsSchema = z
  .union([
    z.array(z.string()),
    z.array(z.any()).transform((arr) => arr.map((o: any) => (typeof o === 'string' ? o : o?.label || o?.value || String(o))).filter(Boolean)),
    z.record(z.string()).transform((rec) => Object.values(rec)),
    z.record(z.any()).transform((rec) => Object.values(rec).map((v: any) => String(v))),
    z.null(),
  ])
  .optional()
  .default([]);

export const FieldSchema = z.object({
  id: z
    .union([z.string(), z.number()])
    .transform((v) => String(v).replace(/[^a-z0-9_]/gi, '_').toLowerCase())
    .default('campo'),
  type: FieldTypeSchema.transform(normalizeFieldType),
  label: z.union([z.string(), z.number()]).transform((v) => String(v)).default('Campo'),
  required: z.union([z.boolean(), z.string(), z.number()]).transform((v) => v === true || v === 'true' || v === 1).default(false),
  options: FieldOptionsSchema,
  target: z
    .union([z.string(), z.null(), z.undefined()])
    .optional()
    .transform((v) => v || undefined),
  targetLabel: z
    .union([z.string(), z.null(), z.undefined()])
    .optional()
    .transform((v) => v || undefined),
});

export const TableSchema = z.object({
  name: z
    .union([z.string(), z.number()])
    .transform((v) => String(v).replace(/[^a-z0-9_]/gi, '_').toLowerCase())
    .default('tabella'),
  label: z.union([z.string(), z.number()]).transform((v) => String(v)).default('Tabella'),
  labelPlural: z.union([z.string(), z.number()]).transform((v) => String(v)).default('Tabelle'),
  fields: z.array(FieldSchema).min(1).max(50),
  icon: z.union([z.string(), z.number()]).transform((v) => String(v)).optional().default(''),
});

export const DashboardCardSchema = z.object({
  type: z
    .union([z.string(), z.number(), z.null()])
    .transform((v) => (v == null ? 'count' : String(v)))
    .default('count'),
  table: z
    .union([z.string(), z.number(), z.null()])
    .transform((v) => (v == null ? '' : String(v)))
    .default(''),
  label: z
    .union([z.string(), z.number(), z.null()])
    .transform((v) => (v == null ? '' : String(v)))
    .default(''),
  field: z
    .union([z.string(), z.number(), z.null()])
    .transform((v) => (v == null ? '' : String(v)))
    .optional()
    .default(''),
  filter: z.record(z.string(), z.any()).optional(),
});

const SidebarItemSchema = z.union([
  z.string(),
  z.object({ name: z.string() }).transform((o) => o.name),
  z.object({ id: z.string() }).transform((o) => o.id),
  z.any().transform((v) => String(v)),
]);

export const UIConfigSchema = z.object({
  primaryColor: z
    .union([
      z.string().regex(/^#([0-9A-Fa-f]{6})$/),
      z.string().transform((v) => (v?.startsWith('#') ? v : `#${v}`)),
      z.string().default('#6366f1'),
    ])
    .default('#6366f1'),
  sidebar: z.union([
    z.array(SidebarItemSchema),
    z.boolean().transform(() => []),
    z.record(z.any()).transform((obj) => Object.keys(obj)),
    z.any().transform(() => []),
  ]).default([]),
  dashboardCards: z.union([
    z.array(DashboardCardSchema),
    z.record(z.unknown()).transform((obj) => Object.values(obj).map((v: unknown) => {
      if (typeof v === 'object' && v !== null) {
        const entry = v as Record<string, unknown>;
        return {
          type: String(entry.type || 'count'),
          table: String(entry.table || ''),
          label: String(entry.label || ''),
          field: String(entry.field || ''),
        };
      }
      return { type: 'count', table: '', label: '', field: '' };
    })),
    z.object({}).transform(() => []),
  ]).default([]),
});

export const BlueprintJSONSchema = z.object({
  appName: z.union([z.string(), z.number()]).transform((v) => String(v)).default('Nuova App'),
  sector: z.union([z.string(), z.number()]).transform((v) => String(v)).default('custom'),
  description: z.union([z.string(), z.number()]).transform((v) => String(v)).optional().default(''),
  logo: z.union([z.string(), z.number()]).transform((v) => String(v)).optional().default(''),
  schema: z.object({
    tables: z.array(TableSchema).min(0).max(50).default([]),
  }).default({ tables: [] }),
  ui: UIConfigSchema,
});

export type Field = z.infer<typeof FieldSchema>;
export type Table = z.infer<typeof TableSchema>;
export type DashboardCard = z.infer<typeof DashboardCardSchema>;
export type UIConfig = z.infer<typeof UIConfigSchema>;
export type BlueprintJSON = z.infer<typeof BlueprintJSONSchema>;

export function sanitizeBlueprint(raw: unknown): BlueprintJSON | null {
  try {
    return BlueprintJSONSchema.parse(raw);
  } catch (e) {
    console.warn('[sanitizeBlueprint] Zod parse failed, using fallback:', e);
    // Fallback: struttura minima con 0 tabelle
    return {
      appName: 'App',
      sector: 'custom',
      description: '',
      logo: '',
      schema: { tables: [] },
      ui: { primaryColor: '#6366f1', sidebar: [], dashboardCards: [] },
    };
  }
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
