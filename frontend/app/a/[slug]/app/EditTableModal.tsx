'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, ChevronDown, GripVertical } from 'lucide-react';

interface FieldDef {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
  fixed?: boolean;
}

interface TableDef {
  name: string;
  label: string;
  labelPlural: string;
  icon: string;
  fields: FieldDef[];
  color?: string;
}

interface EditTableModalProps {
  table: TableDef;
  onSave: (data: { name?: string; label?: string; labelPlural?: string; fields: FieldDef[] }) => Promise<void>;
  onClose: () => void;
  saving: boolean;
  colors: ReturnType<typeof getThemeVars>;
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

const FIELD_TYPES = [
  { value: 'text', label: 'Testo' },
  { value: 'number', label: 'Numero' },
  { value: 'date', label: 'Data' },
  { value: 'select', label: 'Selezione' },
  { value: 'textarea', label: 'Testo Lungo' },
  { value: 'email', label: 'Email' },
  { value: 'tel', label: 'Telefono' },
  { value: 'checkbox', label: 'Checkbox' },
];

export default function EditTableModal({
  table, onSave, onClose, saving, colors,
}: EditTableModalProps) {
  const [tableName, setTableName] = useState(table.name || '');
  const [tableLabel, setTableLabel] = useState(table.label || '');
  const [tableLabelPlural, setTableLabelPlural] = useState(table.labelPlural || '');
  const [fields, setFields] = useState<FieldDef[]>(() =>
    table.fields.map(f => ({ ...f }))
  );

  const addField = () => {
    setFields((prev) => [
      ...prev,
      { name: '', label: '', type: 'text', required: false, options: [], fixed: false },
    ]);
  };

  const removeField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const updateField = (index: number, key: keyof FieldDef, value: unknown) => {
    setFields((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };

      // Auto-genera name dal label
      if (key === 'label') {
        next[index].name = String(value).toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
      }

      return next;
    });
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    setFields((prev) => {
      const next = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validFields = fields.filter((f) => f.name.trim() && f.label.trim());
    if (validFields.length === 0) return;
    await onSave({
      name: tableName,
      label: tableLabel,
      labelPlural: tableLabelPlural,
      fields: validFields,
    });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: `1px solid ${colors.inputBorder}`, background: colors.inputBg,
    color: colors.text, fontSize: '14px', outline: 'none',
    boxSizing: 'border-box',
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
          width: '100%', maxWidth: '720px', maxHeight: '90vh',
          overflow: 'auto', padding: '32px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ color: colors.text, fontSize: '20px', fontWeight: 700, margin: 0 }}>
              Modifica Tabella
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '13px', marginTop: '4px' }}>
              {table.labelPlural} · {table.name}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textSecondary, padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* METADATI TABELLA */}
          <div style={{
            background: colors.cardBgAlt, borderRadius: '12px',
            padding: '20px', border: `1px solid ${colors.border}`,
          }}>
            <div style={sectionTitle}>Nome Tabella</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Nome (identificativo)</label>
                <input
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_'))}
                  placeholder="nome_tabella"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Label (singolare)</label>
                <input
                  type="text"
                  value={tableLabel}
                  onChange={(e) => setTableLabel(e.target.value)}
                  placeholder="Nome"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Label (plurale)</label>
                <input
                  type="text"
                  value={tableLabelPlural}
                  onChange={(e) => setTableLabelPlural(e.target.value)}
                  placeholder="Nomi"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* CAMPI */}
          <div style={{
            background: colors.cardBgAlt, borderRadius: '12px',
            padding: '20px', border: `1px solid ${colors.border}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={sectionTitle}>Campi della Tabella</div>
              <span style={{ color: colors.textSecondary, fontSize: '12px' }}>
                {fields.length} campi
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
              {fields.map((field, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', gap: '8px', alignItems: 'center',
                    padding: '12px', borderRadius: '8px',
                    background: colors.cardBg, border: `1px solid ${colors.border}`,
                    opacity: field.fixed ? 0.7 : 1,
                  }}
                >
                  {/* Move buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => moveField(i, 'up')}
                      disabled={i === 0}
                      style={{
                        background: 'none', border: 'none', cursor: i === 0 ? 'not-allowed' : 'pointer',
                        color: i === 0 ? colors.border : colors.textSecondary, padding: '1px',
                        lineHeight: 1,
                      }}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => moveField(i, 'down')}
                      disabled={i === fields.length - 1}
                      style={{
                        background: 'none', border: 'none', cursor: i === fields.length - 1 ? 'not-allowed' : 'pointer',
                        color: i === fields.length - 1 ? colors.border : colors.textSecondary, padding: '1px',
                        lineHeight: 1,
                      }}
                    >
                      ▼
                    </button>
                  </div>

                  <div style={{ flex: '1 1 25%', minWidth: 0 }}>
                    <label style={{ ...labelStyle, fontSize: '11px' }}>Label</label>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateField(i, 'label', e.target.value)}
                      placeholder="Nome campo"
                      disabled={field.fixed}
                      style={{
                        width: '100%', padding: '6px 10px', borderRadius: '6px',
                        border: `1px solid ${colors.inputBorder}`, background: field.fixed ? colors.cardBgAlt : colors.inputBg,
                        color: colors.text, fontSize: '13px', outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div style={{ flex: '0 0 auto', width: '110px' }}>
                    <label style={{ ...labelStyle, fontSize: '11px' }}>Tipo</label>
                    <div style={{ position: 'relative' }}>
                      <select
                        value={field.type}
                        onChange={(e) => updateField(i, 'type', e.target.value)}
                        disabled={field.fixed}
                        style={{
                          width: '100%', padding: '6px 28px 6px 10px', borderRadius: '6px',
                          border: `1px solid ${colors.inputBorder}`, background: field.fixed ? colors.cardBgAlt : colors.inputBg,
                          color: colors.text, fontSize: '13px', outline: 'none',
                          appearance: 'none', boxSizing: 'border-box',
                        }}
                      >
                        {FIELD_TYPES.map((ft) => (
                          <option key={ft.value} value={ft.value}>{ft.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: colors.textSecondary, pointerEvents: 'none' }} />
                    </div>
                  </div>
                  <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '4px', paddingTop: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '12px', color: colors.textSecondary }}>
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => updateField(i, 'required', e.target.checked)}
                        disabled={field.fixed}
                        style={{ accentColor: colors.primary }}
                      />
                      Richiesto
                    </label>
                  </div>
                  <div style={{ paddingTop: '16px' }}>
                    <button
                      type="button"
                      onClick={() => removeField(i)}
                      disabled={field.fixed || fields.length <= 1}
                      title={field.fixed ? 'Campo fisso non eliminabile' : 'Elimina campo'}
                      style={{
                        background: field.fixed ? 'transparent' : colors.danger + '15', border: 'none',
                        borderRadius: '6px', padding: '4px', cursor: field.fixed ? 'not-allowed' : 'pointer',
                        color: field.fixed ? colors.border : colors.danger, display: 'flex',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {field.fixed && (
                    <span style={{
                      fontSize: '10px', color: colors.textSecondary, paddingTop: '16px',
                      whiteSpace: 'nowrap', fontWeight: 500,
                    }}>
                      FISSO
                    </span>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addField}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '8px',
                border: `1px dashed ${colors.border}`, background: 'transparent',
                color: colors.primary, fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', width: '100%', justifyContent: 'center',
              }}
            >
              <Plus size={14} /> Aggiungi Campo
            </button>
          </div>

          {/* BUTTONS */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px', borderRadius: '10px',
                border: `1px solid ${colors.border}`, background: 'transparent',
                color: colors.textSecondary, fontSize: '14px', fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Annulla
            </button>
            <button
              type="submit"
               disabled={saving || fields.filter(f => f.name && f.name.trim()).length === 0}
              style={{
                padding: '10px 24px', borderRadius: '10px', border: 'none',
                background: saving ? colors.textSecondary : colors.primary,
                color: '#fff', fontSize: '14px', fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Salvataggio...' : 'Salva Tabella'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}