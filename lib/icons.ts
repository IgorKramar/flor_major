import type { ComponentType, SVGProps } from 'react'
import {
  Flower,
  Flower2,
  Sprout,
  Leaf,
  Heart,
  Sparkles,
  Star,
  Gift,
  Cake,
  PartyPopper,
  Music,
  Smile,
  Truck,
  Clock,
  Award,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Send,
  Instagram,
  ShieldCheck,
  Palette,
  Package,
  HandHeart,
  HandHelping,
  Ribbon,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react'
import {
  FlowerLotus,
  FlowerTulip,
  Plant,
  PottedPlant,
  Tree,
  Basket,
  Balloon,
  Confetti,
  Butterfly,
  SunHorizon,
  HandHeart as PhHandHeart,
  GiftIcon,
  FirstAidKit,
  PaintBrush,
  Package as PhPackage,
} from '@phosphor-icons/react/ssr'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'

export type AnyIcon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>

type LucideLike = LucideIcon
type PhosphorLike = PhosphorIcon

const LUCIDE_MAP: Record<string, LucideLike> = {
  Flower,
  Flower2,
  Sprout,
  Leaf,
  Heart,
  Sparkles,
  Star,
  Gift,
  Cake,
  PartyPopper,
  Music,
  Smile,
  Truck,
  Clock,
  Award,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Send,
  Instagram,
  ShieldCheck,
  Palette,
  Package,
  HandHeart,
  HandHelping,
  Ribbon,
  ShoppingBag,
}

const PHOSPHOR_MAP: Record<string, PhosphorLike> = {
  FlowerLotus,
  FlowerTulip,
  Plant,
  PottedPlant,
  Tree,
  Basket,
  Balloon,
  Confetti,
  Butterfly,
  SunHorizon,
  HandHeart: PhHandHeart,
  Gift: GiftIcon,
  FirstAidKit,
  PaintBrush,
  Package: PhPackage,
}

export interface IconOption {
  id: string
  label: string
  source: 'lucide' | 'phosphor'
  component: AnyIcon
  tags: readonly string[]
}

function makeOption(
  source: 'lucide' | 'phosphor',
  name: string,
  component: AnyIcon,
  tags: string[] = [],
): IconOption {
  return {
    id: `${source}:${name}`,
    label: name,
    source,
    component,
    tags,
  }
}

export const ICON_OPTIONS: readonly IconOption[] = [
  makeOption('lucide', 'Flower', LUCIDE_MAP.Flower as AnyIcon, ['цветок', 'ромашка']),
  makeOption('lucide', 'Flower2', LUCIDE_MAP.Flower2 as AnyIcon, ['цветок', 'роза']),
  makeOption('lucide', 'Sprout', LUCIDE_MAP.Sprout as AnyIcon, ['росток', 'зелень']),
  makeOption('lucide', 'Leaf', LUCIDE_MAP.Leaf as AnyIcon, ['лист', 'эко']),
  makeOption('lucide', 'Heart', LUCIDE_MAP.Heart as AnyIcon, ['сердце', 'любовь']),
  makeOption('lucide', 'Sparkles', LUCIDE_MAP.Sparkles as AnyIcon, ['блёстки', 'свежесть']),
  makeOption('lucide', 'Star', LUCIDE_MAP.Star as AnyIcon, ['звезда', 'лучшее']),
  makeOption('lucide', 'Gift', LUCIDE_MAP.Gift as AnyIcon, ['подарок', 'коробка']),
  makeOption('lucide', 'Cake', LUCIDE_MAP.Cake as AnyIcon, ['торт', 'праздник']),
  makeOption('lucide', 'PartyPopper', LUCIDE_MAP.PartyPopper as AnyIcon, ['праздник']),
  makeOption('lucide', 'Music', LUCIDE_MAP.Music as AnyIcon, ['музыка']),
  makeOption('lucide', 'Smile', LUCIDE_MAP.Smile as AnyIcon, ['улыбка']),
  makeOption('lucide', 'Truck', LUCIDE_MAP.Truck as AnyIcon, ['доставка']),
  makeOption('lucide', 'Clock', LUCIDE_MAP.Clock as AnyIcon, ['часы', '24/7']),
  makeOption('lucide', 'Award', LUCIDE_MAP.Award as AnyIcon, ['награда']),
  makeOption('lucide', 'Phone', LUCIDE_MAP.Phone as AnyIcon, ['телефон']),
  makeOption('lucide', 'Mail', LUCIDE_MAP.Mail as AnyIcon, ['почта']),
  makeOption('lucide', 'MapPin', LUCIDE_MAP.MapPin as AnyIcon, ['адрес']),
  makeOption('lucide', 'MessageCircle', LUCIDE_MAP.MessageCircle as AnyIcon, ['сообщение']),
  makeOption('lucide', 'Send', LUCIDE_MAP.Send as AnyIcon, ['отправить']),
  makeOption('lucide', 'Instagram', LUCIDE_MAP.Instagram as AnyIcon, ['соцсеть']),
  makeOption('lucide', 'ShieldCheck', LUCIDE_MAP.ShieldCheck as AnyIcon, ['гарантия']),
  makeOption('lucide', 'Palette', LUCIDE_MAP.Palette as AnyIcon, ['палитра', 'цвет']),
  makeOption('lucide', 'Package', LUCIDE_MAP.Package as AnyIcon, ['коробка', 'товар']),
  makeOption('lucide', 'HandHeart', LUCIDE_MAP.HandHeart as AnyIcon, ['забота']),
  makeOption('lucide', 'HandHelping', LUCIDE_MAP.HandHelping as AnyIcon, ['помощь']),
  makeOption('lucide', 'Ribbon', LUCIDE_MAP.Ribbon as AnyIcon, ['лента', 'упаковка']),
  makeOption('lucide', 'ShoppingBag', LUCIDE_MAP.ShoppingBag as AnyIcon, ['сумка', 'покупки']),
  makeOption('phosphor', 'FlowerLotus', PHOSPHOR_MAP.FlowerLotus as unknown as AnyIcon, ['лотос']),
  makeOption('phosphor', 'FlowerTulip', PHOSPHOR_MAP.FlowerTulip as unknown as AnyIcon, ['тюльпан']),
  makeOption('phosphor', 'Plant', PHOSPHOR_MAP.Plant as unknown as AnyIcon, ['растение']),
  makeOption('phosphor', 'PottedPlant', PHOSPHOR_MAP.PottedPlant as unknown as AnyIcon, ['горшок', 'горшечный']),
  makeOption('phosphor', 'Tree', PHOSPHOR_MAP.Tree as unknown as AnyIcon, ['дерево']),
  makeOption('phosphor', 'Basket', PHOSPHOR_MAP.Basket as unknown as AnyIcon, ['корзина', 'корзинка']),
  makeOption('phosphor', 'Balloon', PHOSPHOR_MAP.Balloon as unknown as AnyIcon, ['шарик', 'воздушный шар']),
  makeOption('phosphor', 'Confetti', PHOSPHOR_MAP.Confetti as unknown as AnyIcon, ['конфетти', 'праздник']),
  makeOption('phosphor', 'Butterfly', PHOSPHOR_MAP.Butterfly as unknown as AnyIcon, ['бабочка']),
  makeOption('phosphor', 'SunHorizon', PHOSPHOR_MAP.SunHorizon as unknown as AnyIcon, ['солнце']),
  makeOption('phosphor', 'HandHeart', PHOSPHOR_MAP.HandHeart as unknown as AnyIcon, ['забота']),
  makeOption('phosphor', 'Gift', PHOSPHOR_MAP.Gift as unknown as AnyIcon, ['подарок']),
  makeOption('phosphor', 'FirstAidKit', PHOSPHOR_MAP.FirstAidKit as unknown as AnyIcon, ['уход']),
  makeOption('phosphor', 'PaintBrush', PHOSPHOR_MAP.PaintBrush as unknown as AnyIcon, ['кисть', 'оформление']),
  makeOption('phosphor', 'Package', PHOSPHOR_MAP.Package as unknown as AnyIcon, ['упаковка']),
] as const

const ICON_BY_ID: Record<string, IconOption> = ICON_OPTIONS.reduce<Record<string, IconOption>>(
  (acc, opt) => {
    acc[opt.id] = opt
    return acc
  },
  {},
)

export const ICON_NAMES: readonly string[] = ICON_OPTIONS.map((opt) => opt.id)

const FALLBACK: AnyIcon = Sparkles as AnyIcon

/**
 * Возвращает компонент иконки по ID (nэймспейс:Name) или легаси-имени (Flower2).
 */
export function getIcon(name?: string | null): AnyIcon {
  if (!name) return FALLBACK
  const exact = ICON_BY_ID[name]
  if (exact) return exact.component
  if (name.includes(':')) return FALLBACK
  // Обратная совместимость: legacy-имена без нэймспейса считаем lucide.
  const legacy = ICON_BY_ID[`lucide:${name}`]
  if (legacy) return legacy.component
  const phosphorLegacy = ICON_BY_ID[`phosphor:${name}`]
  if (phosphorLegacy) return phosphorLegacy.component
  return FALLBACK
}

export function getIconOption(name?: string | null): IconOption | null {
  if (!name) return null
  if (ICON_BY_ID[name]) return ICON_BY_ID[name]
  if (!name.includes(':')) {
    return ICON_BY_ID[`lucide:${name}`] ?? ICON_BY_ID[`phosphor:${name}`] ?? null
  }
  return null
}

/**
 * Нормализует легаси-имена (без нэймспейса) к новому формату.
 */
export function normalizeIconName(name?: string | null): string | null {
  if (!name) return null
  if (ICON_BY_ID[name]) return name
  if (!name.includes(':')) {
    if (ICON_BY_ID[`lucide:${name}`]) return `lucide:${name}`
    if (ICON_BY_ID[`phosphor:${name}`]) return `phosphor:${name}`
  }
  return name
}
