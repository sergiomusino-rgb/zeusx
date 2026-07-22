import {
  Users, ShoppingCart, Package, FileText, LayoutDashboard,
  BookOpen, Code, Tag, Globe, Heart, List, CheckCircle, Utensils, Menu,
} from 'lucide-react';

// Estratto da DynamicLayoutRenderer.tsx: riusato sia dalla dashboard
// autenticata sia dalla landing pubblica (LandingPublic in page.tsx).
const ICON_MAP: Record<string, React.ReactNode> = {
  users: <Users size={18} />,
  orders: <ShoppingCart size={18} />,
  products: <Package size={18} />,
  invoices: <FileText size={18} />,
  dashboard: <LayoutDashboard size={18} />,
  default: <LayoutDashboard size={18} />,
  docs: <BookOpen size={18} />,
  api: <Code size={18} />,
  method: <Tag size={18} />,
  endpoint: <Globe size={18} />,
  product: <Package size={18} />,
  cart: <ShoppingCart size={18} />,
  recipe: <Heart size={18} />,
  ingredient: <List size={18} />,
  step: <CheckCircle size={18} />,
  restaurant: <Utensils size={18} />,
  menu: <Menu size={18} />,
  dish: <Utensils size={18} />,
};

export function resolveIcon(iconName: string) {
  return ICON_MAP[iconName?.toLowerCase() || 'default'] || ICON_MAP.default;
}
