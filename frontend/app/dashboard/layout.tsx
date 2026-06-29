// Server Component - forza rendering dinamico per evitare pre-rendering statico di Vercel
export const dynamic = 'force-dynamic';

import DashboardClientLayout from './DashboardClientLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardClientLayout>{children}</DashboardClientLayout>;
}