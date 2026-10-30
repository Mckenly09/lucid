import {
  ArrowUp,
  Atom,
  Bell,
  Book,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Calculator,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  Clock,
  Copy,
  Cpu,
  Download,
  EllipsisVertical,
  Eye,
  EyeOff,
  HardDrive,
  Image,
  House,
  KeyRound,
  Info,
  Languages,
  Lock,
  Mail,
  MessageCircle,
  Mic,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Shuffle,
  Square,
  Sun,
  Trash2,
  TriangleAlert,
  Upload,
  Wifi,
  WifiOff,
  X,
  Zap,
} from 'lucide-react-native';

import { type ColorToken, useColor } from '@/hooks/use-color';

// The only icons the app uses (docs/ui.md "Icons"). Named imports keep the rest of Lucide out of the bundle.
const ICONS = {
  ArrowUp,
  Atom,
  Bell,
  Book,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Calculator,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  Clock,
  Copy,
  Cpu,
  Download,
  EllipsisVertical,
  Eye,
  EyeOff,
  HardDrive,
  Image,
  House,
  KeyRound,
  Info,
  Languages,
  Lock,
  Mail,
  MessageCircle,
  Mic,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Shuffle,
  Square,
  Sun,
  Trash2,
  TriangleAlert,
  Upload,
  Wifi,
  WifiOff,
  X,
  Zap,
} as const;

export type IconName = keyof typeof ICONS;
export type IconTone = ColorToken | 'muted';

type Props = { name: IconName; size?: number; tone?: IconTone; fill?: boolean };

/** Lucide takes a color value, not className, so the tone is read from the theme tokens. */
export function Icon({ name, size = 22, tone = 'ink', fill }: Props) {
  const color = useColor(tone === 'muted' ? 'ink' : tone);
  const Glyph = ICONS[name];
  return (
    <Glyph
      size={size}
      color={color}
      fill={fill ? color : 'none'}
      strokeWidth={2}
      opacity={tone === 'muted' ? 0.6 : 1}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
