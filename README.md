# مكتبة مكونات Arownd — React Native

مكتبة مكونات بـ TypeScript/React Native مبنية على هوية Arownd البصرية (Lime Signal #C6F135، أسود #0A0A0A، خط IBM Plex Sans Arabic/Inter)، بدون أي اعتماد خارجي إجباري — فقط `react-native` الأساسية.

## التركيب

```
src/
  theme/index.ts        ألوان الوضعين، المسافات، الأنصاف القطرية، الطباعة، ThemeProvider/useTheme
  components/
    foundation.tsx       Divider, Surface, Container, Icon
    actions.tsx           Button, IconButton, FloatingActionButton, ToggleButton, ButtonGroup
    forms.tsx              Input, SearchBar, Checkbox, Switch, QuantitySelector
    navigation.tsx      AppHeader, BottomTabs, SegmentedControl
    commerce.tsx         ProductCard, DiscountBadge, FavoriteButton, Rating, StoreCard, ProductGrid
    cart.tsx                CartItem, CartSummary, CouponInput, PaymentMethodCard, OrderSummary, CheckoutSteps, OrderSuccess
    delivery.tsx          DeliveryStatus, TrackingTimeline, DriverCard
    feedback.tsx         Toast, Badge, ProgressBar, BottomSheet
    states.tsx             Skeleton, EmptyState, ErrorState
    user.tsx                Avatar, UserCard, WalletCard
    merchant.tsx          DashboardStatCard, OrderStatusBadge, EarningsCard
    shared.tsx             ListItem, SectionHeader, Chip, Tag, Pagination
  index.ts                 تصدير واحد يجمع كل شيء
```

## التركيب في المشروع

1. انسخ مجلد `src` إلى مشروعك (أو اجعله حزمة محلية منفصلة).
2. حمّل الخطوط عند إقلاع التطبيق (مثال مع Expo):

```tsx
import { useFonts } from 'expo-font';

useFonts({
  IBMPlexSansArabic: require('./assets/fonts/IBMPlexSansArabic-Regular.ttf'),
  Inter: require('./assets/fonts/Inter-Regular.ttf'),
});
```

3. فعّل الاتجاه RTL مرة واحدة قبل أول render (يتطلب إعادة تشغيل التطبيق):

```tsx
import { I18nManager } from 'react-native';
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);
```

4. لفّ التطبيق بالـ ThemeProvider:

```tsx
import { ThemeProvider } from './src';

export default function App() {
  return (
    <ThemeProvider initialMode="light">
      {/* شاشاتك */}
    </ThemeProvider>
  );
}
```

5. استخدم أي مكون:

```tsx
import { Button, ProductCard, useTheme } from './src';
```

## ملاحظة عن الأيقونات

لا توجد مكتبة أيقونات مربوطة لتبقى المكتبة بلا اعتماديات. مكوّن `Icon` ومعظم الأزرار تستقبل `glyph` كنص (إيموجي/رمز) مؤقتًا — استبدلها بمكتبة أيقوناتك (`lucide-react-native` أو `react-native-vector-icons`) داخل كل مكون حسب الحاجة.

## حالة التغطية

تم بناء الأساس (Theme) بالكامل مطابقًا لهوية Arownd، مع مجموعة مكونات حقيقية وجاهزة للإنتاج تغطي كل فئة من الفئات الـ12 التي حددتها. هذه هي **المرحلة الأولى** من الفهرس الكامل الذي أرسلته (أكثر من 100 مكوّن) — أعطيتك الأهم والأكثر استخدامًا في كل فئة أولًا. المكونات المتبقية (مثل PhoneInput، OTPInput، DatePicker، MapView، AlertDialog، Accordion، PullToRefresh، SwipeableRow، SalesChart، وغيرها) يمكنني إكمالها في نفس البنية والأسلوب — أخبرني بأي فئة تريد أن أكملها أولًا.
