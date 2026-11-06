#!/usr/bin/env node
/**
 * Arownd UI lint — يفرض قواعد docs/UI_SYSTEM.md على الواجهة (بلا اعتماديات).
 * التشغيل: node scripts/ui-lint.mjs   (يخرج بكود 1 عند وجود أخطاء error)
 * القواعد error تكسر الفحص؛ warn دَين تقني يُعرض فقط.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const SCAN = ["src/routes", "src/components"];
const files = [];
(function walk(dir) {
  if (!existsSync(dir)) return;
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (p === join(ROOT, "src/components/error-boundary.tsx")) continue;
    if (
      p.startsWith(`${join(ROOT, "src/components/ui")}/`) &&
      !["dialog.tsx", "sonner.tsx"].includes(n)
    ) continue;
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".tsx")) files.push(p);
  }
})(join(ROOT, SCAN[0]));

const findings = [];
const add = (level, rule, file, line, msg) =>
  findings.push({ level, rule, file: relative(ROOT, file), line, msg });

const isComment = (l) => /^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l);
const PHYS =
  /(?<![\w-])(?:[a-z0-9\[\]&:>*_-]+:)*-?(ml|mr|pl|pr|left|right)-(?=[\[0-9a]|px)|(?<![\w-])text-(left|right)\b/;
const BRAND = /\b(SooQy|SOOQY)\b/;

for (const f of files) {
  const src = readFileSync(f, "utf8");
  const lines = src.split("\n");
  lines.forEach((l, i) => {
    if (isComment(l)) return;
    const n = i + 1;
    // 1) اتجاه فيزيائي (يُسمح بالأسطر التي تعالج RTL صراحةً أو مركز translate-x)
    if (PHYS.test(l) && !/isRTL|rtl:|ltr:|translate-x|left-1\/2|right-1\/2|group-active/.test(l))
      add(
        "error",
        "logical-direction",
        f,
        n,
        "استخدم ms/me/ps/pe/start/end بدل ml/mr/pl/pr/left/right",
      );
    // 2) اسم العلامة
    if (
      BRAND.test(l) &&
      !relative(ROOT, f).includes("/test/") &&
      !/SOOQY_VECTOR_STYLE|console\.|\[SooQy\]|name: "SooQy/.test(l)
    )
      add("error", "brand-name", f, n, "الكتابة المعتمدة: Arownd");
    // 3) حوارات المتصفح الأصلية
    if (/(?<![\w.])(prompt|alert|confirm)\(/.test(l))
      add("error", "native-dialog", f, n, "لا تستخدم حوارات المتصفح؛ استخدم confirm-dialog/toast");
    // 4) ألوان حرفية داخل className
    if (!/StoreMap\.tsx$/.test(f) && /className=.*#[0-9a-fA-F]{6}\b/.test(l))
      // الخريطة بلوحة فاتحة ثابتة عمدًا
      add("error", "hex-in-class", f, n, "استخدم رموز التصميم بدل #hex");
    // 5) نص عربي ثابت في خصائص وصول/إدخال
    if (/(aria-label|placeholder|title|alt)=("[^"{]*[\u0600-\u06FF][^"]*")/.test(l))
      add("warn", "hardcoded-attr", f, n, "انقل النص إلى القاموس عبر t()");
  });
  // 6) <img> بلا alt
  for (const m of src.matchAll(/<img\b[^>]*?>/gs)) {
    const tag = m[0].replace(/=>/g, "=§");
    const line = src.slice(0, m.index).split("\n").length;
    if (!/\balt=/.test(tag)) add("error", "img-alt", f, line, "الصورة بلا alt");
    if (!/loading=|fetchPriority=/.test(tag))
      add("warn", "img-lazy", f, line, 'أضف loading="lazy" decoding="async"');
  }
  // 7) أزرار/روابط أيقونية بلا اسم وصولي
  const s2 = src.replace(/=>/g, "=§");
  for (const m of s2.matchAll(/<(button|Link|a)\b([^>]*?)>\s*(<[A-Z]\w*\b[^>]*\/>)\s*<\/\1>/gs)) {
    if (/aria-label|aria-labelledby|title=/.test(m[2])) continue;
    add(
      "error",
      "icon-only-name",
      f,
      s2.slice(0, m.index).split("\n").length,
      "زر أيقوني بلا aria-label",
    );
  }
  // 8) حقول tel/email بلا inputMode/autoComplete. Mask arrow functions so
  // the `>` in `onChange={(event) => ...}` does not terminate the tag early.
  const tagSafeSource = src.replace(/=>/g, "=§");
  for (const m of tagSafeSource.matchAll(/<input\b[^>]*?>/gs)) {
    const tag = m[0].replace(/=>/g, "=§");
    const line = tagSafeSource.slice(0, m.index).split("\n").length;
    if (/type="(tel|email)"/.test(tag) && !/autoComplete=/.test(tag))
      add("warn", "input-autocomplete", f, line, "أضف autoComplete (+ inputMode للهاتف)");
    if (/type="tel"/.test(tag) && !/inputMode=/.test(tag))
      add("warn", "input-mode-tel", f, line, "أضف inputMode=\"tel\" لحقل الهاتف");
  }
}

// 9) ثوابت نظام التصميم: يمنع حذف الرموز الأساسية أو ضوابط الوصول دون ملاحظة.
const stylesFile = join(ROOT, "src/styles.css");
if (existsSync(stylesFile)) {
  const css = readFileSync(stylesFile, "utf8");
  const required = [
    ["--color-bg-canvas", "رمز خلفية التطبيق"],
    ["--color-action-primary", "رمز الإجراء الرئيسي"],
    ["--color-action-ink", "رمز نص/أيقونة الإجراء"],
    ["--color-overlay-scrim", "رمز تعتيم الخلفية"],
    ["--space-1", "سلم المسافات"],
    ["--radius-pill", "نصف قطر الأزرار والحقول"],
    ["--radius-card", "نصف قطر البطاقات"],
    ["--control-height", "ارتفاع عناصر التحكم"],
    ["--touch-target-size", "الحد الأدنى لمساحة اللمس"],
    [':root[data-theme="light"]', "المظهر الفاتح"],
    [':root[data-theme="dark"]', "المظهر الداكن"],
    [":focus-visible", "مؤشر التركيز المرئي"],
    ["prefers-reduced-motion: reduce", "احترام تقليل الحركة"],
  ];
  for (const [needle, label] of required) {
    if (!css.includes(needle)) {
      add(
        "error",
        "design-system-contract",
        stylesFile,
        1,
        `مفقود من src/styles.css: ${label} (${needle})`,
      );
    }
  }
} else {
  add("error", "design-system-contract", stylesFile, 1, "ملف src/styles.css غير موجود");
}

const errors = findings.filter((x) => x.level === "error");
const warns = findings.filter((x) => x.level === "warn");
const byRule = {};
for (const x of findings)
  byRule[`${x.level}:${x.rule}`] = (byRule[`${x.level}:${x.rule}`] ?? 0) + 1;
const verbose = process.argv.includes("--verbose");
for (const x of verbose ? findings : errors)
  console.log(`${x.level.toUpperCase()} [${x.rule}] ${x.file}:${x.line} — ${x.msg}`);
console.log("\nملخص:", JSON.stringify(byRule));
console.log(`أخطاء: ${errors.length} | تحذيرات: ${warns.length} | ملفات: ${files.length}`);
process.exit(errors.length ? 1 : 0);
