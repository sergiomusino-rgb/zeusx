'use client';

import React, { useMemo, useState } from 'react';
import {
  Search, Plus, Pencil, Trash2, X, ChevronDown, LayoutGrid, List
} from 'lucide-react';
import { TableDef, fieldName, extractDynamicKeys, getDisplayFields, getRecordValue } from './table-definitions';
import { getPlaceholderCategoryForTable } from '@/lib/recordPlaceholderImages';
import RecordCardGrid from './RecordCardGrid';
import { renderCellValue } from './cellRenderers';

interface AppRecord {
  id: string;
  dati_personalizzati?: Record<string, unknown>;
  [key: string]: unknown;
}

interface DynamicDataTableProps {
  table: TableDef;
  records: AppRecord[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onEdit: (record: AppRecord) => void;
  onDelete: (recordId: string) => void;
  onAddNew: () => void;
  colors: ReturnType<typeof getThemeVars>;
  radius: string;
  shadow: string;
}

/** Helper per tema — copia inline dal page.tsx per non creare dipendenza */
function getThemeVars(theme: 'dark' | 'light', primaryColor: string) {
  const isDark = theme === 'dark';
  return {
    bg: isDark ? '#0a0e1a' : '#f8fafc',
    text: isDark ? '#ffffff' : '#0f172a',
    textSecondary: isDark ? '#94a3b8' : '#64748b',
    cardBg: isDark ? '#1e293b' : '#ffffff',
    cardBgAlt: isDark ? '#162032' : '#f1f5f9',
    border: isDark ? '#334155' : '#e2e8f0',
    sidebarBg: isDark ? '#0f172a' : '#1e293b',
    sidebarText: '#e2e8f0',
    sidebarHover: isDark ? '#1e293b' : '#334155',
    inputBg: isDark ? '#0f172a' : '#f1f5f9',
    inputBorder: isDark ? '#334155' : '#cbd5e1',
    primary: primaryColor,
    primaryHover: primaryColor + 'dd',
    danger: '#ef4444',
    success: '#22c55e',
    warning: '#f59e0b',
  };
}

export default function DynamicDataTable({
  table, records, loading, searchQuery, onSearchChange,
  onEdit, onDelete, onAddNew, colors, radius, shadow,
}: DynamicDataTableProps) {
  const [showDynamicCols, setShowDynamicCols] = useState(false);

  // Tabelle "vetrina" (veicoli, immobili, prodotti, piatti) partono in vista
  // a griglia fotografica invece della tabella piatta — coerente con la
  // richiesta di rendere le liste più invitanti, con immagini di esempio.
  const placeholderCategory = useMemo(() => getPlaceholderCategoryForTable(table.name), [table.name]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(placeholderCategory ? 'grid' : 'table');
  // DynamicDataTable non viene rimontato al cambio tabella (nessuna `key`
  // sul chiamante): senza questo effetto la vista resterebbe quella della
  // tabella precedentemente selezionata.
  React.useEffect(() => {
    setViewMode(placeholderCategory ? 'grid' : 'table');
  }, [table.name, placeholderCategory]);

  // Estrae tutte le chiavi dinamiche dai record correnti
  const dynamicKeys = useMemo(() => extractDynamicKeys(records), [records]);

  // Costruisce la lista delle colonne da visualizzare: fissi + dinamic
  const displayFields = useMemo(
    () => getDisplayFields(table, showDynamicCols ? dynamicKeys : []),
    [table, dynamicKeys, showDynamicCols]
  );

  // Filtra per ricerca su TUTTI i campi (sia fissi che dati_personalizzati)
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const q = searchQuery.toLowerCase();
    return records.filter((r) => {
      // Cerca nei campi fissi
      for (const f of table.fields) {
        const fn = fieldName(f);
        const val = r[fn];
        if (val != null && String(val).toLowerCase().includes(q)) return true;
      }
      // Cerca in dati_personalizzati
      const dp = r.dati_personalizzati as Record<string, unknown> | undefined;
      if (dp) {
        for (const v of Object.values(dp)) {
          if (v != null && String(v).toLowerCase().includes(q)) return true;
        }
      }
      return false;
    });
  }, [records, searchQuery, table.fields]);

  // Stile input
  const inputStyle: React.CSSProperties = {
    flex: 1, border: 'none', outline: 'none', background: 'transparent',
    color: colors.text, fontSize: '14px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ color: colors.text, fontSize: '24px', fontWeight: 700, margin: 0 }}>
            {table.labelPlural}
          </h2>
          {table.color && (
            <div style={{
              width: '12px', height: '12px', borderRadius: '50%',
              background: table.color,
            }} />
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {placeholderCategory && (
            <div style={{ display: 'flex', border: `1px solid ${colors.border}`, borderRadius: '10px', overflow: 'hidden' }}>
              <button
                onClick={() => setViewMode('grid')}
                title="Vista griglia"
                style={{
                  display: 'flex', alignItems: 'center', padding: '10px 12px', border: 'none',
                  background: viewMode === 'grid' ? colors.primary + '20' : colors.cardBg,
                  color: viewMode === 'grid' ? colors.primary : colors.textSecondary, cursor: 'pointer',
                }}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                title="Vista tabella"
                style={{
                  display: 'flex', alignItems: 'center', padding: '10px 12px', border: 'none',
                  background: viewMode === 'table' ? colors.primary + '20' : colors.cardBg,
                  color: viewMode === 'table' ? colors.primary : colors.textSecondary, cursor: 'pointer',
                  borderLeft: `1px solid ${colors.border}`,
                }}
              >
                <List size={16} />
              </button>
            </div>
          )}
          <button
            onClick={onAddNew}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 18px', borderRadius: '10px', border: 'none',
              background: colors.primary, color: '#fff', fontSize: '14px',
              fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            <Plus size={16} /> Nuovo
          </button>
        </div>
      </div>

      {/* Search Bar + toggle colonne dinamiche */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <div
          className={`${radius}`}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: '8px',
            background: colors.cardBg, border: `1px solid ${colors.border}`,
            padding: '10px 16px',
          }}
        >
          <Search size={18} style={{ color: colors.textSecondary }} />
          <input
            type="text"
            placeholder={`Cerca in ${table.labelPlural}...`}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={inputStyle}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textSecondary, padding: '2px' }}
            >
              <X size={16} />
            </button>
          )}
        </div>
        {dynamicKeys.length > 0 && (
          <button
            onClick={() => setShowDynamicCols(!showDynamicCols)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 16px', borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              background: showDynamicCols ? colors.primary + '15' : colors.cardBg,
              color: showDynamicCols ? colors.primary : colors.textSecondary,
              fontSize: '13px', fontWeight: 500,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            <ChevronDown size={15} style={{
              transform: showDynamicCols ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }} />
            Col. Dinamiche ({dynamicKeys.length})
          </button>
        )}
      </div>

      {/* Griglia fotografica per tabelle vetrina (veicoli/immobili/prodotti/piatti) */}
      {viewMode === 'grid' && placeholderCategory ? (
        <RecordCardGrid
          table={table}
          records={filteredRecords}
          category={placeholderCategory}
          colors={colors}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ) : (
      <div
        className={`${radius} ${shadow}`}
        style={{
          background: colors.cardBg, border: `1px solid ${colors.border}`,
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr style={{ background: colors.cardBgAlt }}>
                {/* Colonne fisse */}
                {table.fields.map((field) => (
                  <th
                    key={fieldName(field)}
                    style={{
                      textAlign: 'left', padding: '12px 16px',
                      borderBottom: `2px solid ${colors.border}`,
                      color: colors.textSecondary, fontSize: '12px',
                      fontWeight: 600, textTransform: 'uppercase',
                      letterSpacing: '0.05em', whiteSpace: 'nowrap',
                    }}
                  >
                    {field.label}
                    {field.required && (
                      <span style={{ color: colors.danger, marginLeft: '2px' }}>*</span>
                    )}
                  </th>
                ))}
                {/* Colonne dinamiche (se attive) */}
                {showDynamicCols && dynamicKeys.map((key) => (
                  <th
                    key={`dp_${key}`}
                    style={{
                      textAlign: 'left', padding: '12px 16px',
                      borderBottom: `2px solid ${colors.border}`,
                      color: colors.primary, fontSize: '12px',
                      fontWeight: 600, textTransform: 'uppercase',
                      letterSpacing: '0.05em', whiteSpace: 'nowrap',
                      fontStyle: 'italic',
                      background: colors.primary + '08',
                    }}
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')} ⚡
                  </th>
                ))}
                {/* Azioni */}
                <th
                  style={{
                    textAlign: 'center', padding: '12px 16px',
                    borderBottom: `2px solid ${colors.border}`,
                    color: colors.textSecondary, fontSize: '12px',
                    fontWeight: 600, textTransform: 'uppercase',
                    letterSpacing: '0.05em', width: '100px',
                  }}
                >
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={table.fields.length + (showDynamicCols ? dynamicKeys.length : 0) + 1}
                    style={{ padding: '40px', textAlign: 'center', color: colors.textSecondary }}
                  >
                    Caricamento records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={table.fields.length + (showDynamicCols ? dynamicKeys.length : 0) + 1}
                    style={{ padding: '40px', textAlign: 'center', color: colors.textSecondary }}
                  >
                    {searchQuery ? 'Nessun risultato per la ricerca' : 'Nessun record presente'}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record, idx) => (
                  <tr
                    key={record.id || idx}
                    style={{
                      borderBottom: `1px solid ${colors.border}`,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = colors.cardBgAlt; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* Valori campi fissi */}
                    {table.fields.map((field) => (
                      <td
                        key={fieldName(field)}
                        style={{
                          padding: '12px 16px', color: colors.text,
                          fontSize: '14px', whiteSpace: 'nowrap',
                          maxWidth: '200px', overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {renderCellValue(record, fieldName(field), field.type)}
                      </td>
                    ))}
                    {/* Valori colonne dinamiche */}
                    {showDynamicCols && dynamicKeys.map((key) => {
                      const dp = (record.dati_personalizzati as Record<string, unknown>) || {};
                      return (
                        <td
                          key={`dpv_${key}`}
                          style={{
                            padding: '12px 16px', color: colors.text,
                            fontSize: '14px', whiteSpace: 'nowrap',
                            maxWidth: '200px', overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            background: colors.primary + '04',
                          }}
                        >
                          {String(dp[key] ?? '')}
                        </td>
                      );
                    })}
                    {/* Pulsanti azioni */}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button
                          onClick={() => onEdit(record)}
                          title="Modifica"
                          style={{
                            background: colors.primary + '20', border: 'none',
                            borderRadius: '8px', padding: '6px', cursor: 'pointer',
                            color: colors.primary, display: 'flex', alignItems: 'center',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = colors.primary + '40'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = colors.primary + '20'; }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => onDelete(record.id)}
                          title="Elimina"
                          style={{
                            background: colors.danger + '20', border: 'none',
                            borderRadius: '8px', padding: '6px', cursor: 'pointer',
                            color: colors.danger, display: 'flex', alignItems: 'center',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = colors.danger + '40'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = colors.danger + '20'; }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer counter */}
        <div
          style={{
            padding: '12px 16px', borderTop: `1px solid ${colors.border}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <span style={{ color: colors.textSecondary, fontSize: '13px' }}>
            {filteredRecords.length} di {records.length} record
            {dynamicKeys.length > 0 && (
              <span style={{ marginLeft: '12px', fontStyle: 'italic', fontSize: '12px' }}>
                · {dynamicKeys.length} colonne dinamiche
              </span>
            )}
          </span>
        </div>
      </div>
      )}
    </div>
  );
}

// renderCellValue ora in ./cellRenderers.tsx, condivisa con
// CustomTableRenderer e DynamicLayoutRenderer.