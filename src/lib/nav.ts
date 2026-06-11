import {
  Activity,
  BarChart3,
  GraduationCap,
  MapPin,
  Settings,
  Store,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/types/next-auth";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/ruta", label: "Mi ruta", icon: MapPin, roles: ["walker", "cpa"] },
  { href: "/clientes", label: "Clientes", icon: Store, roles: ["manager", "cpa"] },
  { href: "/actividad", label: "Actividad", icon: Activity, roles: ["walker", "manager", "cpa"] },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3, roles: ["walker", "manager", "cpa"] },
  { href: "/programas", label: "Programas", icon: GraduationCap, roles: ["walker", "manager", "cpa"] },
  { href: "/admin", label: "Admin", icon: Settings, roles: ["cpa"] },
];

// En mobile solo caben 4 tabs; selección por rol (Admin de CP&A es trabajo de desktop)
export const MOBILE_TABS: Record<UserRole, string[]> = {
  walker: ["/ruta", "/actividad", "/dashboard", "/programas"],
  manager: ["/dashboard", "/actividad", "/clientes", "/programas"],
  cpa: ["/ruta", "/clientes", "/dashboard", "/admin"],
};

export const ROLE_LABEL: Record<UserRole, string> = {
  walker: "Walker",
  manager: "OT Manager",
  cpa: "CP&A",
};
