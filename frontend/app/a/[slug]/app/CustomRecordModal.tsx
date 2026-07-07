'use client';

import React, { useState } from 'react';
import { X, ChevronDown } from 'lucide-react';

interface ColumnDef {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options: string[];
}

interface CustomRecord {
  id: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

interface CustomRecordModalProps {
  columns: ColumnDef[];
  record: CustomRecord | null;
  onSave: (data: Record<string, unknown>) => void;
  onClose: () => void;
  saving: boolean;
  colors: ReturnType<typeof getThemeVars>;
  tableLabel: string;
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

export default function CustomRecordModal({
  columns, record, onSave, onClose, saving, colors, tableLabel,
}: CustomRecordModalProps) {
  const isEdit = record !== null;

  const [formData, setFormData] = useState<Record<string, unknown>>(() => {
    if (record) {
      const data = (record.data || record) as Record<string, unknown>;
      const result: Record<string, unknown> = {};
      columns.forEach((col) => {
        result[col.name] = data[col.name] ?? '';
      });
      return result;
    }
    const result: Record<string, unknown> = {};
    columns.forEach((col) => {
      result[col.name] = col.type === 'checkbox' ? false : '';
    });
    return result;
  });

  const handleChange = (name: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
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
          width: '100%', maxWidth: '560px', maxHeight: '85vh',
          overflow: 'auto', padding: '32px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ color: colors.text, fontSize: '20px', fontWeight: 700, margin: 0 }}>
            {isEdit ? `Modifica ${tableLabel}` : `Nuovo ${tableLabel}`}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textSecondary, padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {columns.map((col) => (
            <div key={col.name}>
              <label style={labelStyle}>
                {col.label}
                {col.required && <span style={{ color: colors.danger, marginLeft: '4px' }}>*</span>}
              </label>

              {col.type === 'textarea' ? (
                <textarea
                  value={String(formData[col.name] ?? '')}
                  onChange={(e) => handleChange(col.name, e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = colors.primary; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = colors.inputBorder; }}
                />
              ) : col.type === 'select' ? (
                <div style={{ position: 'relative' }}>
                  <select
                    value={String(formData[col.name] ?? '')}
                    onChange={(e) => handleChange(col.name, e.target.value)}
                    style={{ ...inputStyle, appearance: 'none', paddingRight: '36px' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = colors.primary; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = colors.inputBorder; }}
                  >
                    <option value="">Seleziona...</option>
                    {(col.options || []).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: colors.textSecondary, pointerEvents: 'none' }} />
                </div>
              ) : col.type === 'checkbox' ? (
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(formData[col.name])}
                    onChange={(e) => handleChange(col.name, e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: colors.primary }}
                  />
                  <span style={{ color: colors.text, fontSize: '14px' }}>
                    {formData[col.name] ? 'Attivo' : 'Non attivo'}
                  </span>
                </label>
              ) : col.type === 'number' ? (
                <input
                  type="number"
                  step="0.01"
                  value={String(formData[col.name] ?? '')}
                  onChange={(e) => handleChange(col.name, e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = colors.primary; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = colors.inputBorder; }}
                />
              ) : col.type === 'date' ? (
                <input
                  type="date"
                  value={String(formData[col.name] ?? '')}
                  onChange={(e) => handleChange(col.name, e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = colors.primary; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = colors.inputBorder; }}
                />
              ) : (
                <input
                  type={col.type === 'email' ? 'email' : col.type === 'tel' ? 'tel' : 'text'}
                  value={String(formData[col.name] ?? '')}
                  onChange={(e) => handleChange(col.name, e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = colors.primary; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = colors.inputBorder; }}
                />
              )}
            </div>
          ))}

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
              disabled={saving}
              style={{
                padding: '10px 24px', borderRadius: '10px', border: 'none',
                background: saving ? colors.textSecondary : colors.primary,
                color: '#fff', fontSize: '14px', fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}