import {
  Flower2,
  Heart,
  Sparkles,
  Truck,
  Leaf,
  Gift,
  Clock,
  Award,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Send,
  Instagram,
  Star,
  ShieldCheck,
  Palette,
  Package,
  Cake,
  PartyPopper,
  Music,
  Smile,
  type LucideIcon,
} from 'lucide-react'

export const ICON_MAP: Record<string, LucideIcon> = {
  Flower2,
  Heart,
  Sparkles,
  Truck,
  Leaf,
  Gift,
  Clock,
  Award,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Send,
  Instagram,
  Star,
  ShieldCheck,
  Palette,
  Package,
  Cake,
  PartyPopper,
  Music,
  Smile,
}

export const ICON_NAMES = Object.keys(ICON_MAP)

export function getIcon(name?: string | null): LucideIcon {
  if (!name) return Sparkles
  return ICON_MAP[name] ?? Sparkles
}
