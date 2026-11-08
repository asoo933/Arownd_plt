import {
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
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
  X,
  type LucideIcon
} from "lucide-react-native";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { useAppTheme } from "@/lib/theme";

const iconRegistry = {
  arrowDownUp: ArrowDownUp,
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  bell: Bell,
  calendar: Calendar,
  camera: Camera,
  check: Check,
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  circleCheck: CircleCheck,
  clock: Clock,
  creditCard: CreditCard,
  eye: Eye,
  fileText: FileText,
  gift: Gift,
  heart: Heart,
  home: Home,
  image: Image,
  info: Info,
  layoutGrid: LayoutGrid,
  list: List,
  listFilter: ListFilter,
  lock: Lock,
  locateFixed: LocateFixed,
  mapPin: MapPin,
  messageCircle: MessageCircle,
  minus: Minus,
  navigation: Navigation,
  package: Package,
  percent: Percent,
  phone: Phone,
  plus: Plus,
  refreshCw: RefreshCw,
  search: Search,
  settings: Settings,
  share: Share2,
  shoppingBag: ShoppingBag,
  shoppingCart: ShoppingCart,
  star: Star,
  store: Store,
  trash: Trash2,
  triangleAlert: TriangleAlert,
  truck: Truck,
  upload: Upload,
  user: User,
  wallet: Wallet,
  x: X
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof iconRegistry;

export function Icon({
  name,
  size = 20,
  color,
  strokeWidth = 1.8,
  accessibilityLabel,
  accessibilityHidden = false,
  style
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  accessibilityLabel?: string;
  accessibilityHidden?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const IconComponent = iconRegistry[name];
  const theme = useAppTheme();
  return (
    <View
      accessible={!accessibilityHidden}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={accessibilityHidden}
      style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style]}
    >
      <IconComponent size={size} color={color ?? theme.colors.foreground} strokeWidth={strokeWidth} />
    </View>
  );
}
