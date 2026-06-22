import { Suspense } from 'react';
import SuccessContent from './SuccessContent';

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">Caricamento in corso...</p>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}