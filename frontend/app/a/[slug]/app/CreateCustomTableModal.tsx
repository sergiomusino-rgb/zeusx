'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, ChevronDown } from 'lucide-react';

interface ColumnDef {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options: string[];
}

interface CreateCustomTableModalProps {
  onSave: (tableData: {
    name: string;
    label: string;
    labelPlural: string;
    columns: ColumnDef[];
  }) => Promise<void>;
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

export default function CreateCustomTableModal({
  onSave, onClose, saving, colors,
}: CreateCustomTableModalProps) {
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [labelPlural, setLabelPlural] = useState('');
  const [columns, setColumns] = useState<ColumnDef[]>([
    { name: 'nome', label: 'Nome', type: 'text', required: true, options: [] },
  ]);

  const addColumn = () => {
    setColumns((prev) => [
      ...prev,
      { name: '', label: '', type: 'text', required: false, options: [] },
    ]);
  };

  const removeColumn = (index: number) => {
    setColumns((prev) => prev.filter((_, i) => i !== index));
  };

  const updateColumn = (index: number, field: keyof ColumnDef, value: unknown) => {
    setColumns((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };

      // Auto-genera name dal label
      if (field === 'label') {
        next[index].name = String(value).toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
      }

      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !label.trim()) return;

    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
    const validColumns = columns.filter((c) => c.name.trim() && c.label.trim());

    if (validColumns.length === 0) return;

    await onSave({
      name: sanitizedName,
      label: label.trim(),
      labelPlural: labelPlural.trim() || label.trim() + 'i',
      columns: validColumns,
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
          width: '100%', maxWidth: '640px', maxHeight: '90vh',
          overflow: 'auto', padding: '32px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ color: colors.text, fontSize: '20px', fontWeight: 700, margin: 0 }}>
            Nuova Tabella Personalizzata
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textSecondary, padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* INFO TABELLA */}
          <div style={{
            background: colors.cardBgAlt, borderRadius: '12px',
            padding: '20px', border: `1px solid ${colors.border}`,
          }}>
            <div style={sectionTitle}>Info Tabella</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Nome Tabella (per il sistema)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    const v = e.target.value.toLowerCase().replace(/[^a-z0-9_ ]/g, '').replace(/\s+/g, '_');
                    setName(v);
                  }}
                  placeholder="es. fornitori"
                  style={{ ...inputStyle, fontFamily: 'monospace' }}
                />
              </div>
              <div>
                <label style={labelStyle}>Nome Visualizzato (singolare)</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="es. Fornitore"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Nome Visualizzato (plurale)</label>
                <input
                  type="text"
                  value={labelPlural}
                  onChange={(e) => setLabelPlural(e.target.value)}
                  placeholder="es. Fornitori"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* COLONNE */}
          <div style={{
            background: colors.cardBgAlt, borderRadius: '12px',
            padding: '20px', border: `1px solid ${colors.border}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={sectionTitle}>Colonne</div>
              <span style={{ color: colors.textSecondary, fontSize: '12px' }}>
                {columns.length} colonne
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
              {columns.map((col, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', gap: '8px', alignItems: 'center',
                    padding: '12px', borderRadius: '8px',
                    background: colors.cardBg, border: `1px solid ${colors.border}`,
                  }}
                >
                  <div style={{ flex: '1 1 30%', minWidth: 0 }}>
                    <label style={{ ...labelStyle, fontSize: '11px' }}>Label</label>
                    <input
                      type="text"
                      value={col.label}
                      onChange={(e) => updateColumn(i, 'label', e.target.value)}
                      placeholder="Nome campo"
                      style={{
                        width: '100%', padding: '6px 10px', borderRadius: '6px',
                        border: `1px solid ${colors.inputBorder}`, background: colors.inputBg,
                        color: colors.text, fontSize: '13px', outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div style={{ flex: '0 0 auto', width: '110px' }}>
                    <label style={{ ...labelStyle, fontSize: '11px' }}>Tipo</label>
                    <div style={{ position: 'relative' }}>
                      <select
                        value={col.type}
                        onChange={(e) => updateColumn(i, 'type', e.target.value)}
                        style={{
                          width: '100%', padding: '6px 28px 6px 10px', borderRadius: '6px',
                          border: `1px solid ${colors.inputBorder}`, background: colors.inputBg,
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
                        checked={col.required}
                        onChange={(e) => updateColumn(i, 'required', e.target.checked)}
                        style={{ accentColor: colors.primary }}
                      />
                      Richiesto
                    </label>
                  </div>
                  <div style={{ paddingTop: '16px' }}>
                    <button
                      type="button"
                      onClick={() => removeColumn(i)}
                      disabled={columns.length <= 1}
                      style={{
                        background: colors.danger + '15', border: 'none',
                        borderRadius: '6px', padding: '4px', cursor: columns.length <= 1 ? 'not-allowed' : 'pointer',
                        color: columns.length <= 1 ? colors.textSecondary : colors.danger, display: 'flex',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addColumn}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '8px',
                border: `1px dashed ${colors.border}`, background: 'transparent',
                color: colors.primary, fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', width: '100%', justifyContent: 'center',
              }}
            >
              <Plus size={14} /> Aggiungi Colonna
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
              disabled={saving || !name.trim() || !label.trim() || columns.filter(c => c.name.trim()).length === 0}
              style={{
                padding: '10px 24px', borderRadius: '10px', border: 'none',
                background: saving || !name.trim() || !label.trim() ? colors.textSecondary : colors.primary,
                color: '#fff', fontSize: '14px', fontWeight: 600,
                cursor: saving || !name.trim() || !label.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Creazione...' : 'Crea Tabella'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}