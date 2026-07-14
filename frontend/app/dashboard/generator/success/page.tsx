'use client';

import { useSearchParams } from 'next/navigation';
import { Sparkles, Copy, Check, QrCode } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/src/lib/LanguageContext';

// Funzione per generare QR code
function generateQRCodeSVG(text: string, size: number = 200): string {
  const encodedText = encodeURIComponent(text);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedText}`;
}

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const appUrl = searchParams.get('appUrl');
  const activityName = searchParams.get('activityName');
  const activityType = searchParams.get('activityType');
  const { t } = useLanguage();

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (appUrl) {
      setCopied(true);
      navigator.clipboard.writeText(appUrl);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [appUrl]);

  // Demo placeholder quando non ci sono app generate
  if (!appUrl) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-8 flex items-center justify-center">
        <div className="max-w-2xl mx-auto text-center">
          {/* Header */}
          <div className="flex items-center justify-center gap-3 mb-12">
            <Sparkles className="w-10 h-10 text-indigo-400" />
            <h1 className="text-4xl font-bold">{t('success_congrats')}</h1>
            <Sparkles className="w-10 h-10 text-indigo-400" />
          </div>
          <p className="text-xl text-gray-300 mb-12">
            {t('success_start_using')}
          </p>

          {/* Demo Placeholder Card */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">{t('success_demo_app')}</h2>
                <p className="text-gray-400">{t('success_demo_type')} demo</p>
              </div>
              <div className="px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
                <span className="text-green-400 font-medium">{t('success_demo_active')}</span>
              </div>
            </div>

            {/* App URL Placeholder */}
            <div className="mb-6 p-4 bg-gray-800 rounded-xl">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {t('success_url_app')}
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1 text-lg text-gray-500 truncate">
                  https://demo.zeusx.app
                </div>
                <button
                  disabled
                  className="p-3 bg-gray-700 rounded-lg opacity-50 cursor-not-allowed"
                >
                  <Copy className="w-5 h-5 text-gray-300" />
                </button>
              </div>
            </div>

            {/* QR Code Placeholder */}
            <div className="mb-6 p-6 bg-gray-800 rounded-xl text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-indigo-500/20 mb-4">
                <QrCode className="w-8 h-8 text-indigo-400" />
              </div>
              <h3 className="text-lg font-bold mb-3">{t('success_qr_access')}</h3>
              <p className="text-gray-400 text-sm mb-4">
                {t('success_qr_placeholder')}
              </p>
              <div className="inline-block p-4 bg-gray-700 rounded-xl">
                <div className="w-48 h-48 flex items-center justify-center text-gray-500">
                  <QrCode className="w-16 h-16" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const qrCodeUrl = generateQRCodeSVG(appUrl);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-12">
            <Sparkles className="w-10 h-10 text-indigo-400" />
            <h1 className="text-4xl font-bold">{t('success_congrats')}</h1>
            <Sparkles className="w-10 h-10 text-indigo-400" />
          </div>
          <p className="text-xl text-gray-300">
            {t('success_start_using')}
          </p>
        </div>

        {/* App Info Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">{activityName || 'La tua App'}</h2>
              <p className="text-gray-400">Tipo: {activityType}</p>
            </div>
            <div className="px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
              <span className="text-green-400 font-medium">{t('success_demo_active')}</span>
            </div>
          </div>

          {/* App URL */}
          <div className="mb-6 p-4 bg-gray-800 rounded-xl">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              {t('success_url_app')}
            </label>
            <div className="flex items-center gap-3">
              <a
                href={appUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-lg text-indigo-400 hover:text-indigo-300 underline truncate"
              >
                {appUrl}
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(appUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-300" />
                )}
              </button>
            </div>
          </div>

          {/* QR Code */}
          <div className="mb-6 p-6 bg-gray-800 rounded-xl text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-indigo-500/20 mb-4">
              <QrCode className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold mb-3">{t('success_qr_access')}</h3>
            <p className="text-gray-400 text-sm mb-4">
              {t('success_scan_qr')}
            </p>
            <div className="inline-block p-4 bg-white rounded-xl">
              <img
                src={qrCodeUrl}
                alt="QR Code"
                className="w-48 h-48"
              />
            </div>
            <p className="text-gray-500 text-xs mt-3">
              {t('success_scan_qr')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}