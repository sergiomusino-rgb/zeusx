'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  Search, Plus, Pencil, Trash2, X, ChevronDown, Download, Upload
} from 'lucide-react';
import { renderCellValue } from './cellRenderers';

interface ColumnDef {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options: string[];
}

interface CustomTableDef {
  id: string;
  name: string;
  label: string;
  labelPlural: string;
  icon?: string;
  color?: string;
  columns: ColumnDef[];
  _record_id: string;
}

interface CustomRecord {
  id: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

interface CustomTableRendererProps {
  tableDef: CustomTableDef;
  records: CustomRecord[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onEdit: (record: CustomRecord) => void;
  onDelete: (recordId: string) => void;
  onAddNew: () => void;
  colors: ReturnType<typeof getThemeVars>;
  radius: string;
  shadow: string;
}

function getThemeVars(theme: 'dark' | 'light', primaryColor: string) {
  const isDark = theme === 'dark';
  return {
    bg: isDark ? '#0a0e1a' : '#f8fafc',
    text: isDark ? '#ffffff' : '#0f172a',
    textSecondary: isDark ? '#94a3b8' : '#64748b',
    cardBg: isDark ? '#1e293b' : '#ffffff',
    cardBgAlt: isDark ? '#162032' : '#f1f5f9',
    border: isDark ? '#334155' : '#e2e8f0',
    inputBg: isDark ? '#0f172a' : '#f1f5f9',
    inputBorder: isDark ? '#334155' : '#cbd5e1',
    primary: primaryColor,
    primaryHover: primaryColor + 'dd',
    danger: '#ef4444',
    success: '#22c55e',
    warning: '#f59e0b',
  };
}

export default function CustomTableRenderer({
  tableDef, records, loading, searchQuery, onSearchChange,
  onEdit, onDelete, onAddNew, colors, radius, shadow,
}: CustomTableRendererProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const q = searchQuery.toLowerCase();
    return records.filter((r) => {
      const data = r.data || r;
      for (const col of tableDef.columns) {
        const val = data[col.name];
        if (val != null && String(val).toLowerCase().includes(q)) return true;
      }
      return false;
    });
  }, [records, searchQuery, tableDef.columns]);

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
            {tableDef.labelPlural || tableDef.label + 'i'}
          </h2>
          {tableDef.color && (
            <div style={{
              width: '12px', height: '12px', borderRadius: '50%',
              background: tableDef.color,
            }} />
          )}
          <span style={{
            padding: '2px 8px', borderRadius: '4px',
            background: colors.primary + '15', color: colors.primary,
            fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
          }}>
            Personalizzata
          </span>
        </div>
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

      {/* Search Bar */}
      <div
        className={`${radius}`}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: colors.cardBg, border: `1px solid ${colors.border}`,
          padding: '10px 16px',
        }}
      >
        <Search size={18} style={{ color: colors.textSecondary }} />
        <input
          type="text"
          placeholder={`Cerca in ${tableDef.labelPlural || tableDef.label + 'i'}...`}
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

      {/* Tabella */}
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
                {tableDef.columns.map((col) => (
                  <th
                    key={col.name}
                    style={{
                      textAlign: 'left', padding: '12px 16px',
                      borderBottom: `2px solid ${colors.border}`,
                      color: colors.textSecondary, fontSize: '12px',
                      fontWeight: 600, textTransform: 'uppercase',
                      letterSpacing: '0.05em', whiteSpace: 'nowrap',
                    }}
                  >
                    {col.label}
                    {col.required && (
                      <span style={{ color: colors.danger, marginLeft: '2px' }}>*</span>
                    )}
                  </th>
                ))}
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
                    colSpan={tableDef.columns.length + 1}
                    style={{ padding: '40px', textAlign: 'center', color: colors.textSecondary }}
                  >
                    Caricamento records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={tableDef.columns.length + 1}
                    style={{ padding: '40px', textAlign: 'center', color: colors.textSecondary }}
                  >
                    {searchQuery ? 'Nessun risultato per la ricerca' : 'Nessun record presente'}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record, idx) => {
                  const data = (record.data || record) as Record<string, unknown>;
                  return (
                    <tr
                      key={record.id || idx}
                      style={{
                        borderBottom: `1px solid ${colors.border}`,
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = colors.cardBgAlt; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      {tableDef.columns.map((col) => (
                        <td
                          key={col.name}
                          style={{
                            padding: '12px 16px', color: colors.text,
                            fontSize: '14px', whiteSpace: 'nowrap',
                            maxWidth: '200px', overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {renderCellValue(data, col.name, col.type)}
                        </td>
                      ))}
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 16px', borderTop: `1px solid ${colors.border}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <span style={{ color: colors.textSecondary, fontSize: '13px' }}>
            {filteredRecords.length} di {records.length} record
          </span>
        </div>
      </div>
    </div>
  );
}

// renderCellValue ora in ./cellRenderers.tsx, condivisa con DynamicDataTable
// e DynamicLayoutRenderer (badge di stato, valuta, date, immagini).