// ─── ZeusX Branding Footer ───────────────────────────────────────────────────────
// Footer statico e branding per le app generate - Nessun link, solo visivo

import Image from 'next/image';

export default function ZeusXBrandingFooter() {
  return (
    <footer className="w-full py-6 px-4 bg-slate-950/80 backdrop-blur-md border-t border-slate-800/50">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
        {/* Logo ZeusX */}
        <div className="flex items-center gap-2">
          <Image
            src="/zeusxapps.jpeg"
            alt="ZeusX Logo"
            width={24}
            height={24}
            className="h-5 w-5 object-contain"
          />
          <span className="text-gray-400 text-sm font-medium">
            byMUSINO
          </span>
        </div>
      </div>
    </footer>
  );
}