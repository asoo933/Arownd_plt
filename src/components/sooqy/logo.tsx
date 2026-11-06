import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";
import { useEffect, useState } from "react";

/**
 * شعار Arownd — الهوية الأساسية للعلامة التجارية.
 *
 * نسختان:
 * - `2994.svg` — الوضع الفاتح (نص أسود، خلفية شفافة)
 * - `2995.svg` — الوضع الداكن (نص أبيض، خلفية شفافة)
 *
 * يتحول تلقائياً حسب السمة الحالية (light/dark) عبر ThemeProvider.
 * يستخدم حالة عميلية تبدأ بالفاتح لتجنب اختلاف الترطيب (SSR hydration mismatch).
 */
export function ArowndLogo({
  variant = "horizontal",
  className,
  width,
  height,
}: {
  variant?: "horizontal" | "symbol";
  className?: string;
  width?: string | number;
  height?: string | number;
}) {
  const { resolved } = useTheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(resolved === "dark");
  }, [resolved]);

  const src = isDark ? "/2995.svg" : "/2994.svg";

  // الرمز الهندسي المستمد من حرف "a" في الشعار — لأيقونة التطبيق وfavicon
  const symbol = (
    <svg
      viewBox="0 0 2048 893"
      width={width ?? 48}
      height={height ?? 48}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      <rect width="2048" height="893" fill={isDark ? "#0A0A0A" : "#F5F5F5"} />
      <path
        fill={isDark ? "#F5F5F5" : "#0A0A0A"}
        d="M 329.202 307.165 C 362.331 304.642 390.55 330.759 407.882 356.609 C 445.663 412.956 481.488 475.54 512.098 536.28 L 483.142 536.343 C 472.389 513.576 453.655 481.417 440.828 459.98 C 418.519 422.699 383.806 349.872 343.886 332.761 C 301.082 323.26 256.734 414.739 239.658 445.702 C 222.911 475.837 206.344 506.072 189.958 536.404 L 161.05 536.35 C 172.052 513.01 188.224 483.852 201.31 461.444 C 230.575 411.333 267.968 320.227 329.202 307.165 z"
      />
    </svg>
  );

  if (variant === "symbol") {
    return symbol;
  }

  return (
    <img
      src={src}
      alt="Arownd"
      className={cn("shrink-0 block", className)}
      width={typeof width === "number" ? width : undefined}
      height={typeof height === "number" ? height : undefined}
      style={{
        width: typeof width === "string" ? width : undefined,
        height: typeof height === "string" ? height : undefined,
      }}
    />
  );
}

/**
 * شعار Arownd مع الاسم النصي — يُستخدم في رأس الصفحة والتذييل.
 *
 * يستخدم ملف SVG واحد فقط (`2994.svg`) مع تطبيق `invert` في الوضع الداكن
 * بحيث تصبح الخلفية سوداء والنص أبيض تلقائياً — بدون الحاجة لملفين منفصلين.
 *
 * يبدأ مخفياً حتى يتم تحديد السمة (light/dark) من ThemeProvider لتجنب
 * الوميض البصري (flash of wrong theme) عند فتح التطبيق لأول مرة.
 */
export function ArowndBrand({ className }: { className?: string }) {
  const { resolved } = useTheme();
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    setIsDark(resolved === "dark");
  }, [resolved]);

  // إخفاء الشعار حتى تُحدد السمة لتجنب التلوث البصري
  if (isDark === null) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src={isDark ? "/2995.svg" : "/2994.svg"}
        alt="Arownd"
        className="h-16 w-auto shrink-0"
        width={260}
        height={115}
      />
    </div>
  );
}
