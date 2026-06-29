'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Search, Plus, Pencil, Trash2, X, ChevronDown,
  Download, Upload, AlertTriangle,
} from 'lucide-react';

// ─── Type Definitions ─────────────────────────────────────────────────────

export interface FieldDef {
  name?: string;
  id?: string;
  label: string;
  type: string;
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

export interface TableDef {
  name: string;
  label: string;
  labelPlural: string;
  icon: string;
  fields: FieldDef[];
}

export interface AppRecord {
  id: string;
  app_id?: string;
  tenant_id?: string;
  table_name?: string;
  data?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface ThemeColors {
  bg: string;
  text: string;
  textSecondary: string;
  cardBg: string;
  cardBgAlt: string;
  border: string;
  sidebarBg: string;
  sidebarText: string;
  sidebarHover: string;
  inputBg: string;
  inputBorder: string;
  primary: string;
  primaryHover: string;
  danger: string;
  success: string;
  warning: string;
}

export interface DynamicTableProps {
  /** Definizione della tabella (schema) */
  table: TableDef;

  /** URL base del backend */
  backendUrl?: string;

  /** ID app per autenticazione */
  appId?: string;

  /** Password del client per Bearer auth */
  password?: string;

  /** Tema colori */
  colors: ThemeColors;

  /** Classi CSS per bordi/ombre */
  radius?: string;
  shadow?: string;

  /** Callback quando un record viene modificato/creato/cancellato */
  onRecordsChanged?: () => void;

  /** Record esterni (se forniti, non viene eseguito il fetch interno) */
  records?: AppRecord[];
  /** Loading state esterno */
  loading?: boolean;
  /** Errore esterno */
  error?: string | null;
}

// ─── Helper ───────────────────────────────────────────────────────────────

function fieldName(f: FieldDef): string {
  return f.name || f.id || '';
}

// ─── RecordModal Component ────────────────────────────────────────────────

interface RecordModalProps {
  table: TableDef;
  record: AppRecord | null; // null = new
  onSave: (data: Record<string, unknown>) => void;
  onClose: () => void;
  saving: boolean;
  colors: ThemeColors;
}

function RecordModal({ table, record, onSave, onClose, saving, colors }: RecordModalProps) {
  const isEdit = record !== null;

  const [formData, setFormData] = useState<Record<string, unknown>>(() => {
    const data: Record<string, unknown> = {};
    table.fields.forEach((f) => {
      const fn = fieldName(f);
      if (isEdit && record?.data?.[fn] !== undefined) {
        data[fn] = record.data[fn];
      } else {
        data[fn] = f.type === 'checkbox' ? false : '';
      }
    });
    return data;
  });

  const handleChange = (fn: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fn]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: `1px solid ${colors.inputBorder}`,
    background: colors.inputBg,
    color: colors.text,
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '13px',
    fontWeight: 600,
    color: colors.textSecondary,
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-2xl"
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.border}`,
          width: '100%',
          maxWidth: '560px',
          maxHeight: '85vh',
          overflow: 'auto',
          padding: '32px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ color: colors.text, fontSize: '20px', fontWeight: 700, margin: 0 }}>
            {isEdit ? `Modifica ${table.label}` : `Nuovo ${table.label}`}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: colors.textSecondary,
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {table.fields.map((field) => {
            const fn = fieldName(field);
            return (
              <div key={fn}>
                <label style={labelStyle}>
                  {field.label}
                  {field.required && <span style={{ color: colors.danger, marginLeft: '4px' }}>*</span>}
                </label>

                {field.type === 'textarea' ? (
                  <textarea
                    value={String(formData[fn] ?? '')}
                    onChange={(e) => handleChange(fn, e.target.value)}
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = colors.primary; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = colors.inputBorder; }}
                  />
                ) : field.type === 'select' || field.type === 'dropdown' ? (
                  <div style={{ position: 'relative' }}>
                    <select
                      value={String(formData[fn] ?? '')}
                      onChange={(e) => handleChange(fn, e.target.value)}
                      style={{ ...inputStyle, appearance: 'none', paddingRight: '36px' }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = colors.primary; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = colors.inputBorder; }}
                    >
                      <option value="">Seleziona...</option>
                      {(field.options || []).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: colors.textSecondary,
                        pointerEvents: 'none',
                      }}
                    />
                  </div>
                ) : field.type === 'checkbox' || field.type === 'boolean' ? (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(formData[fn])}
                      onChange={(e) => handleChange(fn, e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: colors.primary }}
                    />
                    <span style={{ color: colors.text, fontSize: '14px' }}>
                      {formData[fn] ? 'Attivo' : 'Non attivo'}
                    </span>
                  </label>
                ) : field.type === 'number' || field.type === 'currency' ? (
                  <input
                    type="number"
                    step={field.type === 'currency' ? '0.01' : '1'}
                    value={String(formData[fn] ?? '')}
                    onChange={(e) => handleChange(fn, e.target.value)}
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = colors.primary; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = colors.inputBorder; }}
                  />
                ) : field.type === 'date' ? (
                  <input
                    type="date"
                    value={String(formData[fn] ?? '')}
                    onChange={(e) => handleChange(fn, e.target.value)}
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = colors.primary; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = colors.inputBorder; }}
                  />
                ) : field.type === 'datetime' || field.type === 'datetime-local' ? (
                  <input
                    type="datetime-local"
                    value={String(formData[fn] ?? '')}
                    onChange={(e) => handleChange(fn, e.target.value)}
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = colors.primary; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = colors.inputBorder; }}
                  />
                ) : field.type === 'email' ? (
                  <input
                    type="email"
                    value={String(formData[fn] ?? '')}
                    onChange={(e) => handleChange(fn, e.target.value)}
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = colors.primary; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = colors.inputBorder; }}
                  />
                ) : field.type === 'phone' || field.type === 'tel' ? (
                  <input
                    type="tel"
                    value={String(formData[fn] ?? '')}
                    onChange={(e) => handleChange(fn, e.target.value)}
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = colors.primary; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = colors.inputBorder; }}
                  />
                ) : (
                  <input
                    type="text"
                    value={String(formData[fn] ?? '')}
                    onChange={(e) => handleChange(fn, e.target.value)}
                    style={inputStyle}
                    placeholder={field.placeholder || ''}
                    onFocus={(e) => { e.currentTarget.style.borderColor = colors.primary; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = colors.inputBorder; }}
                  />
                )}
              </div>
            );
          })}

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: `1px solid ${colors.border}`,
                background: 'transparent',
                color: colors.textSecondary,
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = colors.cardBgAlt; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '10px 24px',
                borderRadius: '10px',
                border: 'none',
                background: saving ? colors.textSecondary : colors.primary,
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => { if (!saving) e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              {saving ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── DynamicTable Component ───────────────────────────────────────────────

export default function DynamicTable({
  table,
  backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001',
  appId,
  password,
  colors,
  radius = 'rounded-xl',
  shadow = 'shadow-xl',
  onRecordsChanged,
  records: externalRecords,
  loading: externalLoading,
  error: externalError,
}: DynamicTableProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [internalRecords, setInternalRecords] = useState<AppRecord[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalRecord, setModalRecord] = useState<AppRecord | null | 'new'>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [exporting, setExporting] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  // Usa record esterni se forniti, altrimenti quelli interni
  const records = externalRecords ?? internalRecords;
  const loading = externalLoading ?? internalLoading;
  const error = externalError ?? internalError;

  // ─── Fetch Records ──────────────────────────────────────────────────────

  const isAuthenticated = Boolean(appId && password);
  const hasExternalRecords = externalRecords !== undefined;

  const loadRecords = useCallback(async () => {
    // Se ci sono record esterni, non caricare nulla internamente
    if (hasExternalRecords) return;
    if (!appId || !password || !table.name) return;

    setInternalLoading(true);
    setInternalError(null);

    try {
      const res = await fetch(`${backendUrl}/api/client/apps/${appId}/records?table=${table.name}`, {
        headers: { Authorization: `Bearer ${password}` },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Errore ${res.status}`);
      }

      const data = await res.json();
      setInternalRecords(Array.isArray(data) ? data : data.records || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore nel caricamento';
      setInternalError(msg);
      console.error('[DynamicTable] load error:', msg);
      setInternalRecords([]);
    } finally {
      setInternalLoading(false);
    }
  }, [appId, password, table.name, backendUrl, hasExternalRecords]);

  // Carica records al mount e quando cambia tabella (solo se non ci sono record esterni)
  useEffect(() => {
    if (!hasExternalRecords && isAuthenticated) {
      loadRecords();
    } else if (!hasExternalRecords) {
      setInternalRecords([]);
      setInternalLoading(false);
    }
  }, [isAuthenticated, loadRecords, hasExternalRecords]);

  // ─── Filtered Records ───────────────────────────────────────────────────

  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const q = searchQuery.toLowerCase();
    return records.filter((r) =>
      table.fields.some((f) => {
        const fn = fieldName(f);
        const val = r.data?.[fn];
        return val != null && String(val).toLowerCase().includes(q);
      })
    );
  }, [records, searchQuery, table.fields]);

  // ─── CRUD Handlers ──────────────────────────────────────────────────────

  const handleCreate = useCallback(async (formData: Record<string, unknown>) => {
    if (!appId || !password) return;
    setSaving(true);
    try {
      const res = await fetch(`${backendUrl}/api/client/apps/${appId}/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${password}`,
        },
        body: JSON.stringify({ table: table.name, data: formData }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Errore creazione record');
      }

      setModalRecord(null);
      await loadRecords();
      onRecordsChanged?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Errore');
    } finally {
      setSaving(false);
    }
  }, [appId, password, table.name, backendUrl, loadRecords, onRecordsChanged]);

  const handleUpdate = useCallback(async (formData: Record<string, unknown>) => {
    if (!appId || !password || !modalRecord || modalRecord === 'new') return;
    setSaving(true);
    try {
      const res = await fetch(`${backendUrl}/api/client/apps/${appId}/records/${modalRecord.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${password}`,
        },
        body: JSON.stringify({ data: formData }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Errore modifica record');
      }

      setModalRecord(null);
      await loadRecords();
      onRecordsChanged?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Errore');
    } finally {
      setSaving(false);
    }
  }, [appId, password, modalRecord, backendUrl, loadRecords, onRecordsChanged]);

  const handleDelete = useCallback(async (recordId: string) => {
    if (!appId || !password) return;
    if (!confirm('Sei sicuro di voler eliminare questo record?')) return;

    try {
      const res = await fetch(`${backendUrl}/api/client/apps/${appId}/records/${recordId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${password}` },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Errore eliminazione record');
      }

      await loadRecords();
      onRecordsChanged?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Errore');
    }
  }, [appId, password, backendUrl, loadRecords, onRecordsChanged]);

  // ─── Modal Save Dispatcher ──────────────────────────────────────────────

  const handleModalSave = useCallback((data: Record<string, unknown>) => {
    if (modalRecord === 'new') {
      handleCreate(data);
    } else {
      handleUpdate(data);
    }
  }, [modalRecord, handleCreate, handleUpdate]);

  // ─── Export CSV ─────────────────────────────────────────────────────────

  const handleExport = useCallback(async () => {
    if (!appId || !password) return;
    setExporting(true);
    try {
      const res = await fetch(`${backendUrl}/api/client/apps/${appId}/export?table=${table.name}`, {
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
  }, [appId, password, table.name, backendUrl]);

  // ─── Import CSV ─────────────────────────────────────────────────────────

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !appId || !password) return;

    setImporting(true);
    setImportMsg('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('table', table.name);

      const res = await fetch(`${backendUrl}/api/client/apps/${appId}/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${password}` },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Errore importazione');
      }

      setImportMsg(`${data.imported} record importati`);
      await loadRecords();
      onRecordsChanged?.();
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : 'Errore importazione');
    } finally {
      setImporting(false);
      if (e.target) e.target.value = '';
    }
  }, [appId, password, table.name, backendUrl, loadRecords, onRecordsChanged]);

  // ─── Format Cell Value ──────────────────────────────────────────────────

  const formatCellValue = (field: FieldDef, value: unknown): string => {
    if (value === null || value === undefined) return '';

    if (field.type === 'checkbox' || field.type === 'boolean') {
      return value ? 'Si' : 'No';
    }

    if (field.type === 'currency') {
      const num = Number(value);
      if (isNaN(num)) return String(value);
      return `EUR ${num.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    if (field.type === 'date' && typeof value === 'string') {
      try {
        return new Date(value).toLocaleDateString('it-IT');
      } catch {
        return value;
      }
    }

    return String(value);
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header: Title + Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ color: colors.text, fontSize: '24px', fontWeight: 700, margin: 0 }}>
          {table.labelPlural}
        </h2>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* Import CSV */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            title="Importa CSV"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 16px', borderRadius: '10px', border: `1px solid ${colors.border}`,
              background: colors.cardBg, color: colors.textSecondary,
              fontSize: '13px', fontWeight: 500, cursor: importing ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => { if (!importing) e.currentTarget.style.background = colors.cardBgAlt; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = colors.cardBg; }}
          >
            <Upload size={15} />
            {importing ? 'Import...' : 'Importa'}
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExport}
            disabled={exporting || records.length === 0}
            title="Esporta CSV"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 16px', borderRadius: '10px', border: `1px solid ${colors.border}`,
              background: colors.cardBg, color: colors.textSecondary,
              fontSize: '13px', fontWeight: 500,
              cursor: (exporting || records.length === 0) ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => { if (!exporting && records.length > 0) e.currentTarget.style.background = colors.cardBgAlt; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = colors.cardBg; }}
          >
            <Download size={15} />
            {exporting ? 'Export...' : 'Esporta'}
          </button>

          {/* Add New */}
          <button
            onClick={() => setModalRecord('new')}
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

      {/* Import message */}
      {importMsg && (
        <div style={{
          padding: '10px 16px', borderRadius: '8px', fontSize: '13px',
          background: colors.success + '20', color: colors.success,
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <AlertTriangle size={15} />
          {importMsg}
          <button
            onClick={() => setImportMsg('')}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: colors.success, cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div
        className={radius}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: colors.cardBg, border: `1px solid ${colors.border}`,
          padding: '10px 16px',
        }}
      >
        <Search size={18} style={{ color: colors.textSecondary }} />
        <input
          type="text"
          placeholder={`Cerca in ${table.labelPlural}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            color: colors.text, fontSize: '14px',
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: colors.textSecondary, padding: '2px',
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: '8px', fontSize: '13px',
          background: colors.danger + '20', color: colors.danger,
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <AlertTriangle size={15} />
          {error}
          <button
            onClick={() => setInternalError(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: colors.danger, cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Table */}
      <div
        className={`${radius} ${shadow}`}
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.border}`,
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr style={{ background: colors.cardBgAlt }}>
                {table.fields.map((field) => (
                  <th
                    key={fieldName(field)}
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px',
                      borderBottom: `2px solid ${colors.border}`,
                      color: colors.textSecondary,
                      fontSize: '12px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {field.label}
                  </th>
                ))}
                <th
                  style={{
                    textAlign: 'center',
                    padding: '12px 16px',
                    borderBottom: `2px solid ${colors.border}`,
                    color: colors.textSecondary,
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    width: '100px',
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
                    colSpan={table.fields.length + 1}
                    style={{ padding: '40px', textAlign: 'center', color: colors.textSecondary }}
                  >
                    Caricamento records...
                  </td>
                </tr>
              ) : !isAuthenticated ? (
                <tr>
                  <td
                    colSpan={table.fields.length + 1}
                    style={{ padding: '40px', textAlign: 'center', color: colors.textSecondary }}
                  >
                    Autenticazione richiesta per visualizzare i dati
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={table.fields.length + 1}
                    style={{ padding: '40px', textAlign: 'center', color: colors.textSecondary }}
                  >
                    {searchQuery
                      ? 'Nessun risultato per la ricerca'
                      : 'Nessun record presente. Clicca "Nuovo" per aggiungere.'}
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
                    {table.fields.map((field) => (
                      <td
                        key={fieldName(field)}
                        style={{
                          padding: '12px 16px',
                          color: colors.text,
                          fontSize: '14px',
                          whiteSpace: 'nowrap',
                          maxWidth: '200px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {formatCellValue(field, record.data?.[fieldName(field)])}
                      </td>
                    ))}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button
                          onClick={() => setModalRecord(record)}
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
                          onClick={() => handleDelete(record.id)}
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

        {/* Footer: Record count */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: `1px solid ${colors.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ color: colors.textSecondary, fontSize: '13px' }}>
            {filteredRecords.length} di {records.length} record
          </span>
          {!isAuthenticated && (
            <span style={{ color: colors.warning, fontSize: '12px', fontWeight: 500 }}>
              Autenticazione necessaria
            </span>
          )}
        </div>
      </div>

      {/* Record Modal */}
      {modalRecord !== null && (
        <RecordModal
          table={table}
          record={modalRecord === 'new' ? null : modalRecord}
          onSave={handleModalSave}
          onClose={() => setModalRecord(null)}
          saving={saving}
          colors={colors}
        />
      )}
    </div>
  );
}