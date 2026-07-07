import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Target, FileStack, ListChecks, Archive, Bell, Settings } from "lucide-react";

export interface PortalNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const PORTAL_NAV_ITEMS: PortalNavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Business Health Score", href: "/dashboard/health-score", icon: Target },
  { label: "Board Packs", href: "/dashboard/board-packs", icon: FileStack },
  { label: "Action Tracker", href: "/dashboard/action-tracker", icon: ListChecks },
  { label: "Documents", href: "/dashboard/documents", icon: Archive },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];
