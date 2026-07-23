'use client';

import React, { useState } from 'react';
import { X, Sparkles } from 'lucide-react';

interface AITableModalProps {
  onGenerate: (instruction: string) => Promise<void>;
  onClose: () => void;
  generating: boolean;
  error: string | null;
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

export default function AITableModal({
  onGenerate, onClose, generating, error, colors,
}: AITableModalProps) {
  const [instruction, setInstruction] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim() || generating) return;
    await onGenerate(instruction.trim());
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
          width: '100%', maxWidth: '560px', maxHeight: '90vh',
          overflow: 'auto', padding: '32px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ color: colors.text, fontSize: '20px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} style={{ color: colors.primary }} />
            Crea Tabella con AI
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textSecondary, padding: '4px' }}>
            <X size={20} />
          </button>
        </div>
        <p style={{ color: colors.textSecondary, fontSize: '13px', marginTop: 0, marginBottom: '20px' }}>
          Descrivi la tabella che vuoi aggiungere, l'AI genera nome, colonne e tipi di campo.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder='Es. "Aggiungi la tabella Storico Interventi con campi data, descrizione, costo"'
            rows={4}
            autoFocus
            style={{
              width: '100%', padding: '12px 14px', borderRadius: '10px',
              border: `1px solid ${colors.inputBorder}`, background: colors.inputBg,
              color: colors.text, fontSize: '14px', outline: 'none',
              resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit',
            }}
          />

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
              background: colors.danger + '15', color: colors.danger,
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
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
              disabled={generating || !instruction.trim()}
              style={{
                padding: '10px 24px', borderRadius: '10px', border: 'none',
                background: generating || !instruction.trim() ? colors.textSecondary : colors.primary,
                color: '#fff', fontSize: '14px', fontWeight: 600,
                cursor: generating || !instruction.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}
            >
              {generating ? 'Generazione...' : 'Genera Tabella'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
