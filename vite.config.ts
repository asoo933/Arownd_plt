import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { nitro } from "nitro/vite";

// قيم Supabase تُدمج داخل حزمة المتصفح وقت البناء. لو بُنِي الموقع بلا متغيرات
// VITE_ يصل الرابط فارغًا إلى المتصفح فيرمي createClient الخطأ
// "Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL" وتظهر صفحة خطأ —
// مع أن SSR يعمل لأن الخادم يقرأ متغيرات البيئة وقت التشغيل.
//
// نشتق هنا قيم المتصفح من متغيرات الخادم عند غيابها. ويجب أن يتم ذلك عبر
// process.env لا عبر `define`: يُنفَّذ هذا الملف قبل loadEnv في Vite، فيقرؤها
// Vite كأنها متغيرات عادية فتعمل في كل صيغ الكتابة (import.meta.env.X و ["X"]).
const deriveClientEnv = (target: string, ...sources: string[]) => {
  if (process.env[target]) return;
  const fallback = sources.map((key) => process.env[key]).find((value) => value);
  if (fallback) process.env[target] = fallback;
};
deriveClientEnv("VITE_SUPABASE_URL", "SUPABASE_URL");
deriveClientEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_PUBLISHABLE_KEY");
deriveClientEnv("VITE_SUPABASE_PROJECT_ID", "SUPABASE_PROJECT_ID");

const buildId =
  process.env["VERCEL_GIT_COMMIT_SHA"] ??
  process.env["GITHUB_SHA"] ??
  process.env["VITE_BUILD_ID"] ??
  `local-${Date.now()}`;

const isBuild = process.argv.includes("build");
const rawPort = process.env["PORT"] ?? (isBuild ? "5173" : undefined);
if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}
const port = Number(rawPort);
if (!Number.isInteger(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env["BASE_PATH"] ?? (isBuild ? "/" : undefined);
if (!basePath) {
  throw new Error("BASE_PATH environment variable is required but was not provided.");
}

export default defineConfig(async ({ mode }): Promise<import("vite").UserConfig> => {
  const { tanstackStart } = await import("@tanstack/react-start/plugin/vite");
  return {
    define: { __AROWND_BUILD_ID__: JSON.stringify(buildId) },
    base: basePath,
    plugins: [
      tanstackStart({
        server: { entry: "server" },
        // Keep web production SSR unchanged; generate a static client shell only for Capacitor.
        spa: {
          enabled: mode === "capacitor",
          // Capacitor requires index.html at the webDir root.
          prerender: { outputPath: "/index.html" },
        },
      }),
      nitro(),
      react(),
      tailwindcss(),
    ],
    resolve: {
      // دعم مسارات tsconfig أصليًا في Vite 8 (بديل إضافة vite-tsconfig-paths)
      tsconfigPaths: true,
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    build: {
      // maplibre-gl وحدها ~1MB وتُحمَّل عند فتح الخريطة فقط، فلا داعي لتحذير الحجم
      chunkSizeWarningLimit: 1200,
      // Vite 8 uses Rolldown/Oxc minification natively; avoid the slower Terser plugin.
      rolldownOptions: {
        output: {
          minify: {
            compress: {
              dropConsole: true,
              dropDebugger: true,
            },
          },
          manualChunks: (id: string) => {
            if (id.includes("maplibre-gl")) return "vendor-maplibre";
            if (id.includes("@tanstack/react-query")) return "vendor-query";
            if (id.includes("@tanstack/react-router")) return "vendor-router";
            if (id.includes("lucide-react")) return "vendor-icons";
            if (id.includes("sonner")) return "vendor-sonner";
            if (id.includes("@supabase")) return "vendor-supabase";
            return undefined;
          },
        },
      },
    },
    // لا تُضِف optimizeDeps.exclude لـ maplibre-gl: إخراجها من التجميع المسبق
    // يجعل التطوير يخدم المكتبة غير مُجمَّعة (~1000 طلب) فيتأخر ظهور الخريطة.
    // الحل الصحيح لعنوان الـ worker مطبَّق في StoreMap (setWorkerUrl).
    server: {
      host: "0.0.0.0",
      port,
      strictPort: true,
      allowedHosts: true,
      headers: {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "X-XSS-Protection": "1; mode=block",
      },
    },
    preview: {
      host: "0.0.0.0",
      port,
      strictPort: true,
      allowedHosts: true,
    },
  };
});
