'use client';

import { useLanguage } from '@/src/lib/LanguageContext';
import { FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getLegalContentUrl } from '@/lib/legal-content';

export default function TermsPage() {
  const { t, locale } = useLanguage();
  const [content, setContent] = useState<string>('');

  useEffect(() => {
    // Fetch the legal content file for the current locale
    fetch(getLegalContentUrl('terms', locale))
      .then((res) => res.text())
      .then((text) => setContent(text))
      .catch(() => setContent(''));
  }, [locale]);

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-8 h-8 text-indigo-400" />
            <h1 className="text-4xl font-bold">{t('terms_title')}</h1>
          </div>
          <p className="text-gray-400 text-lg">
            {t('terms_content')}
          </p>
        </div>

        {/* Content */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <div className="prose prose-invert max-w-none">
            <pre className="whitespace-pre-wrap text-gray-300 leading-relaxed font-sans">
              {content}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}