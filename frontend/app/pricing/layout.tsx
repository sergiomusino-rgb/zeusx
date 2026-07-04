import DashboardLayoutClient from '@/app/dashboard/DashboardLayoutClient';

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}