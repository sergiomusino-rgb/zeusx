'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Copy, Check, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/src/lib/LanguageContext';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const appId = searchParams.get('appId');
  const slug = searchParams.get('slug');
  const password = searchParams.get('password');
  const appName = searchParams.get('appName');
  const { t } = useLanguage();

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (password) {
      setCopied(true);
      navigator.clipboard.writeText(password);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [password]);

  if (!appId || !slug) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-8 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t('success_error')}</h1>
          <p className="text-gray-400 mb-8">{t('success_missing_params')}</p>
          <Link
            href="/dashboard/generator"
            className="text-indigo-400 hover:text-indigo-300"
          >
            {t('success_back_generator')}
          </Link>
        </div>
      </div>
    );
  }

  const appUrl = `/a/${slug}`;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-6">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4">{t('success_congrats')}</h1>
          <p className="text-xl text-gray-300">
            {t('success_app_created')}
          </p>
        </div>

        {/* App Info Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">{appName || 'Il tuo Gestionale'}</h2>
              <p className="text-gray-400">{t('success_app_id')} {appId}</p>
            </div>
            <div className="px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
              <span className="text-green-400 font-medium">{t('success_active')}</span>
            </div>
          </div>

          {/* Password */}
          {password && (
            <div className="mb-6 p-4 bg-gray-800 rounded-xl">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {t('success_password_label')}
              </label>
              <div className="flex items-center gap-3">
                <code className="flex-1 text-2xl font-mono text-indigo-400">
                  {password}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(password);
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
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href={appUrl}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all"
            >
              <ExternalLink className="w-5 h-5" />
              {t('success_open_app')}
            </a>
            <Link
              href="/dashboard"
              className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-medium py-4 px-6 rounded-xl transition-all"
            >
              {t('success_back_dashboard')}
            </Link>
          </div>
        </div>

        {/* Help Text */}
        <div className="text-center text-gray-500 text-sm">
          <p>{t('success_password_hint')}</p>
        </div>
      </div>
    </div>
  );
}