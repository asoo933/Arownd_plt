import {
  ArrowDownUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Bell,
  Calendar,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock,
  CreditCard,
  Eye,
  FileText,
  Gift,
  Heart,
  Home,
  House,
  Image,
  Info,
  LayoutGrid,
  List,
  ListFilter,
  Lock,
  LocateFixed,
  MapPin,
  MessageCircle,
  Minus,
  Navigation,
  Package,
  Percent,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Share2,
  ShoppingBag,
  ShoppingCart,
  Star,
  Store,
  Trash2,
  TriangleAlert,
  Truck,
  Upload,
  User,
  Wallet,
  X
} from "lucide-react-native";
import { View, type StyleProp, type ViewStyle } from "react-native";

import { useAppTheme } from "@/lib/theme";

const iconRegistry = {
  "arrow-down": ArrowDown,
  "arrow-down-up": ArrowDownUp,
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  "arrow-up": ArrowUp,
  "arrow-up-down": ArrowUpDown,
  bell: Bell,
  calendar: Calendar,
  camera: Camera,
  check: Check,
  "chevron-down": ChevronDown,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  "circle-check": CircleCheck,
  clock: Clock,
  "credit-card": CreditCard,
  eye: Eye,
  "file-text": FileText,
  gift: Gift,
  heart: Heart,
  home: Home,
  house: House,
  image: Image,
  info: Info,
  "layout-grid": LayoutGrid,
  list: List,
  "list-filter": ListFilter,
  lock: Lock,
  "locate-fixed": LocateFixed,
  "map-pin": MapPin,
  "message-circle": MessageCircle,
  minus: Minus,
  navigation: Navigation,
  package: Package,
  percent: Percent,
  phone: Phone,
  plus: Plus,
  "refresh-cw": RefreshCw,
  search: Search,
  settings: Settings,
  share: Share2,
  "shopping-bag": ShoppingBag,
  "shopping-cart": ShoppingCart,
  star: Star,
  store: Store,
  "trash-2": Trash2,
  "triangle-alert": TriangleAlert,
  truck: Truck,
  upload: Upload,
  user: User,
  wallet: Wallet,
  x: X
} as const;

export type IconName = keyof typeof iconRegistry;

export function Icon({
  name,
  size,
  color,
  fill = "none",
  strokeWidth = 1.8,
  accessibilityLabel,
  accessibilityHidden = false,
  style
}: {
  name: IconName;
  size?: number;
  color?: string;
  fill?: string;
  strokeWidth?: number;
  accessibilityLabel?: string;
  accessibilityHidden?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const IconComponent = iconRegistry[name];
  const theme = useAppTheme();
  const resolvedSize = size ?? theme.dimensions.iconSize.md;

  return (
    <View
      accessible={!accessibilityHidden}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={accessibilityHidden}
      style={[{ width: resolvedSize, height: resolvedSize, alignItems: "center", justifyContent: "center" }, style]}
    >
      <IconComponent size={resolvedSize} color={color ?? theme.colors.foreground} fill={fill} strokeWidth={strokeWidth} />
    </View>
  );
}
