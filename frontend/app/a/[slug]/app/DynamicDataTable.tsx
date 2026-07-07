'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  Search, Plus, Pencil, Trash2, X, ChevronDown, Download, Upload
} from 'lucide-react';
import { TableDef, fieldName, extractDynamicKeys, getDisplayFields, getRecordValue } from './table-definitions';

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
  appId?: string;
  password?: string;
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
  appId, password,
}: DynamicDataTableProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [exporting, setExporting] = useState(false);
  const [showDynamicCols, setShowDynamicCols] = useState(false);

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

  const handleExport = async () => {
    if (!appId || !password) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/client/apps/${appId}/export?table=${table.name}`, {
        headers: { Authorization: `Bearer ${password}` },
      });
      if (!res.ok) throw new Error('Errore esportazione');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${table.name}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Errore esportazione');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !appId || !password) return;
    setImporting(true);
    setImportMsg('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('table', table.name);
      const res = await fetch(`/api/client/apps/${appId}/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${password}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore importazione');
      setImportMsg(`${data.imported} record importati`);
      e.target.value = '';
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : 'Errore importazione');
    } finally {
      setImporting(false);
    }
  };

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
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 16px', borderRadius: '10px',
              border: `1px solid ${colors.border}`, background: colors.cardBg,
              color: colors.textSecondary, fontSize: '13px', fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <Upload size={15} /> {importing ? 'Importando...' : 'Importa CSV'}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 16px', borderRadius: '10px',
              border: `1px solid ${colors.border}`, background: colors.cardBg,
              color: colors.textSecondary, fontSize: '13px', fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <Download size={15} /> {exporting ? 'Esportando...' : 'Esporta CSV'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
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

      {/* Messaggio import */}
      {importMsg && (
        <div style={{
          padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
          background: colors.primary + '15', color: colors.primary,
        }}>
          {importMsg}
        </div>
      )}

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
    </div>
  );
}

/**
 * Renderizza una cella in base al tipo di campo
 */
function renderCellValue(record: Record<string, unknown>, fieldName: string, type: string): React.ReactNode {
  const val = record[fieldName];
  if (type === 'checkbox') {
    return val ? 'Si' : 'No';
  }
  if (type === 'number') {
    const n = Number(val);
    if (!isNaN(n) && fieldName.toLowerCase().includes('prezzo') || fieldName.toLowerCase().includes('totale')) {
      return `€ ${n.toFixed(2)}`;
    }
    return String(val ?? '');
  }
  if (type === 'date' && val) {
    try {
      return new Date(val as string).toLocaleDateString('it-IT');
    } catch {
      return String(val);
    }
  }
  return String(val ?? '');
}