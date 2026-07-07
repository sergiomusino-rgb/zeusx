'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, ChevronDown } from 'lucide-react';
import { TableDef, fieldName } from './table-definitions';

interface AppRecord {
  id: string;
  dati_personalizzati?: Record<string, unknown>;
  [key: string]: unknown;
}

interface DynamicRecordModalProps {
  table: TableDef;
  record: AppRecord | null; // null = new record
  onSave: (data: Record<string, unknown>) => void;
  onClose: () => void;
  saving: boolean;
  colors: ReturnType<typeof getThemeVars>;
  /** Lista di record clienti per popolare select relazionate */
  clientiRecords?: Array<{ id: string; ragione_sociale?: string; [key: string]: unknown }>;
  /** Lista di record prodotti per popolare select relazionate */
  prodottiRecords?: Array<{ id: string; nome_prodotto?: string; [key: string]: unknown }>;
  /** Lista di record ordini per popolare select relazionate */
  ordiniRecords?: Array<{ id: string; numero_ordine?: string; [key: string]: unknown }>;
}

/** Helper per tema */
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

export default function DynamicRecordModal({
  table, record, onSave, onClose, saving, colors,
  clientiRecords = [], prodottiRecords = [], ordiniRecords = [],
}: DynamicRecordModalProps) {
  const isEdit = record !== null;

  // Stato per campi FISSI
  const [formData, setFormData] = useState<Record<string, unknown>>(() => {
    if (record) {
      const data: Record<string, unknown> = {};
      table.fields.forEach((f) => {
        const fn = fieldName(f);
        data[fn] = record[fn] ?? '';
      });
      return data;
    }
    const data: Record<string, unknown> = {};
    table.fields.forEach((f) => {
      data[fieldName(f)] = f.type === 'checkbox' ? false : '';
    });
    return data;
  });

  // Stato per DATI_PERSONALIZZATI
  const [dynamicFields, setDynamicFields] = useState<Record<string, string>>(() => {
    if (record?.dati_personalizzati) {
      const dp: Record<string, string> = {};
      Object.entries(record.dati_personalizzati).forEach(([k, v]) => {
        dp[k] = String(v ?? '');
      });
      return dp;
    }
    return {};
  });

  // Nuova chiave/valore da aggiungere
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const handleChange = (fieldName: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleDynamicChange = (key: string, value: string) => {
    setDynamicFields((prev) => ({ ...prev, [key]: value }));
  };

  const removeDynamicField = (key: string) => {
    setDynamicFields((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const addDynamicField = () => {
    const trimmedKey = newKey.trim().toLowerCase().replace(/\s+/g, '_');
    if (!trimmedKey) return;
    if (dynamicFields[trimmedKey] !== undefined) {
      alert('Chiave già esistente');
      return;
    }
    setDynamicFields((prev) => ({ ...prev, [trimmedKey]: newValue }));
    setNewKey('');
    setNewValue('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Costruisce il payload: campi fissi + dati_personalizzati
    const payload: Record<string, unknown> = { ...formData };

    // Aggiunge dati_personalizzati solo se ci sono chiavi dinamiche
    if (Object.keys(dynamicFields).length > 0) {
      payload.dati_personalizzati = { ...dynamicFields };
    }

    onSave(payload);
  };

  // Helper per ottenere i record di una tabella target
  const getTargetRecords = (targetTable?: string): Array<{ id: string; label: string }> => {
    let records: Array<Record<string, unknown>> = [];
    if (targetTable === 'clienti') records = clientiRecords;
    else if (targetTable === 'prodotti') records = prodottiRecords;
    else if (targetTable === 'ordini') records = ordiniRecords;
    else return [];

    return records.map((r) => ({
      id: String(r.id),
      label: String(r[targetTable === 'clienti' ? 'ragione_sociale' : targetTable === 'prodotti' ? 'nome_prodotto' : 'numero_ordine'] ?? ''),
    }));
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: `1px solid ${colors.inputBorder}`, background: colors.inputBg,
    color: colors.text, fontSize: '14px', outline: 'none',
    transition: 'border-color 0.2s', boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: '6px', fontSize: '13px',
    fontWeight: 600, color: colors.textSecondary,
  };

  const sectionTitle: React.CSSProperties = {
    color: colors.text, fontSize: '15px', fontWeight: 700,
    marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-2xl"
        style={{
          background: colors.cardBg, border: `1px solid ${colors.border}`,
          width: '100%', maxWidth: '640px', maxHeight: '90vh',
          overflow: 'auto', padding: '32px',
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
              background: 'none', border: 'none', cursor: 'pointer',
              color: colors.textSecondary, padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* ─── CAMP FISSI ─── */}
          <div style={{
            background: colors.cardBgAlt, borderRadius: '12px',
            padding: '20px', border: `1px solid ${colors.border}`,
          }}>
            <div style={sectionTitle}>Campi Fissi</div>
            {table.fields.map((field) => {
              const fn = fieldName(field);
              return (
                <div key={fn} style={{ marginBottom: '14px' }}>
                  <label style={labelStyle}>
                    {field.label}
                    {field.required && <span style={{ color: colors.danger, marginLeft: '4px' }}>*</span>}
                  </label>

                  {/* Campo di relazione (select con dati da altra tabella) */}
                  {field.targetTable ? (
                    <div style={{ position: 'relative' }}>
                      <select
                        value={String(formData[fn] ?? '')}
                        onChange={(e) => handleChange(fn, e.target.value)}
                        style={{ ...inputStyle, appearance: 'none', paddingRight: '36px' }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = colors.primary; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = colors.inputBorder; }}
                      >
                        <option value="">Seleziona {field.targetLabel || field.label}...</option>
                        {getTargetRecords(field.targetTable).map((r) => (
                          <option key={r.id} value={r.id}>{r.label}</option>
                        ))}
                      </select>
                      <ChevronDown
                        size={16}
                        style={{
                          position: 'absolute', right: '12px', top: '50%',
                          transform: 'translateY(-50%)', color: colors.textSecondary,
                          pointerEvents: 'none',
                        }}
                      />
                    </div>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      value={String(formData[fn] ?? '')}
                      onChange={(e) => handleChange(fn, e.target.value)}
                      rows={3}
                      style={{ ...inputStyle, resize: 'vertical' }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = colors.primary; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = colors.inputBorder; }}
                    />
                  ) : field.type === 'select' ? (
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
                          position: 'absolute', right: '12px', top: '50%',
                          transform: 'translateY(-50%)', color: colors.textSecondary,
                          pointerEvents: 'none',
                        }}
                      />
                    </div>
                  ) : field.type === 'checkbox' ? (
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
                  ) : field.type === 'number' ? (
                    <input
                      type="number"
                      step="0.01"
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
                  ) : (
                    <input
                      type={field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : 'text'}
                      value={String(formData[fn] ?? '')}
                      onChange={(e) => handleChange(fn, e.target.value)}
                      style={inputStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = colors.primary; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = colors.inputBorder; }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* ─── CAMP PERSONALIZZATI (dinamici) ─── */}
          <div style={{
            background: colors.cardBgAlt, borderRadius: '12px',
            padding: '20px', border: `1px solid ${colors.border}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={sectionTitle}>Campi Personalizzati</div>
              <span style={{ color: colors.textSecondary, fontSize: '12px', fontStyle: 'italic' }}>
                {Object.keys(dynamicFields).length} campi
              </span>
            </div>

            {/* Lista campi dinamici esistenti */}
            {Object.entries(dynamicFields).length === 0 ? (
              <p style={{ color: colors.textSecondary, fontSize: '13px', textAlign: 'center', padding: '16px' }}>
                Nessun campo personalizzato. Aggiungine uno qui sotto.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {Object.entries(dynamicFields).map(([key, val]) => (
                  <div
                    key={key}
                    style={{
                      display: 'flex', gap: '8px', alignItems: 'center',
                      padding: '8px 12px', borderRadius: '8px',
                      background: colors.cardBg, border: `1px solid ${colors.border}`,
                    }}
                  >
                    <div style={{
                      flex: '0 0 auto', padding: '4px 8px', borderRadius: '4px',
                      background: colors.primary + '15', color: colors.primary,
                      fontSize: '12px', fontWeight: 600, fontFamily: 'monospace',
                    }}>
                      {key}
                    </div>
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => handleDynamicChange(key, e.target.value)}
                      style={{
                        flex: 1, border: 'none', outline: 'none', background: 'transparent',
                        color: colors.text, fontSize: '14px',
                      }}
                      placeholder="Valore..."
                    />
                    <button
                      type="button"
                      onClick={() => removeDynamicField(key)}
                      style={{
                        background: colors.danger + '15', border: 'none',
                        borderRadius: '6px', padding: '4px', cursor: 'pointer',
                        color: colors.danger, display: 'flex',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Aggiungi nuovo campo dinamico */}
            <div style={{
              display: 'flex', gap: '8px', alignItems: 'center',
              padding: '12px', borderRadius: '8px',
              border: `1px dashed ${colors.border}`,
              background: colors.cardBg + '50',
            }}>
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="Nome campo (es. sconto_fedelta)"
                style={{
                  flex: '0 0 auto', width: '160px', padding: '8px 12px', borderRadius: '6px',
                  border: `1px solid ${colors.inputBorder}`, background: colors.inputBg,
                  color: colors.text, fontSize: '13px', outline: 'none', fontFamily: 'monospace',
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDynamicField())}
              />
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Valore iniziale"
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: '6px',
                  border: `1px solid ${colors.inputBorder}`, background: colors.inputBg,
                  color: colors.text, fontSize: '13px', outline: 'none',
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDynamicField())}
              />
              <button
                type="button"
                onClick={addDynamicField}
                disabled={!newKey.trim()}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '8px 14px', borderRadius: '6px', border: 'none',
                  background: newKey.trim() ? colors.primary : colors.textSecondary,
                  color: '#fff', fontSize: '13px', fontWeight: 600,
                  cursor: newKey.trim() ? 'pointer' : 'not-allowed',
                  whiteSpace: 'nowrap',
                }}
              >
                <Plus size={14} /> Aggiungi
              </button>
            </div>
          </div>

          {/* ─── BUTTONS ─── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px', borderRadius: '10px',
                border: `1px solid ${colors.border}`, background: 'transparent',
                color: colors.textSecondary, fontSize: '14px', fontWeight: 600,
                cursor: 'pointer', transition: 'background 0.2s',
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
                padding: '10px 24px', borderRadius: '10px', border: 'none',
                background: saving ? colors.textSecondary : colors.primary,
                color: '#fff', fontSize: '14px', fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer', transition: 'opacity 0.2s',
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