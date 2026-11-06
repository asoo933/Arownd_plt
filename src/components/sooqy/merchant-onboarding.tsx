import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Check, MapPin } from "lucide-react";
import { toast } from "sonner";
import { showError, showSuccess } from "@/lib/feedback";
import { useGeo, geoErrorMessage } from "@/lib/geo";
import { childrenOf } from "@/lib/taxonomy";
import { MainCategoryPicker, SubcategoryMultiSelect } from "@/components/sooqy/category-tiles";
import { WilayaSelect } from "@/components/sooqy/WilayaSelect";
import { cn } from "@/lib/utils";
import { merchantCreateStore } from "@/lib/sooqy";

export type StoreForm = {
  name: string;
  phone: string;
  whatsapp: string;
  wilaya_id: number | null;
  commune: string;
  address_line: string;
  open: string;
  close: string;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
  subcategories: string[];
};

export function defaultStoreForm(): StoreForm {
  return {
    name: "",
    phone: "",
    whatsapp: "",
    wilaya_id: null,
    commune: "",
    address_line: "",
    open: "09:00",
    close: "18:00",
    latitude: null,
    longitude: null,
    category: null,
    subcategories: [],
  };
}

export function MerchantOnboarding({
  onSubmit,
  form,
  setForm,
}: {
  onSubmit: (input: Parameters<typeof merchantCreateStore>[0]) => Promise<void>;
  form: StoreForm;
  setForm: Dispatch<SetStateAction<StoreForm>>;
}) {
  const [busy, setBusy] = useState(false);
  const [busyOrder, setBusyOrder] = useState<string | null>(null);
  const { ask, locating } = useGeo();

  const locate = async () => {
    const { pos: found, reason: why } = await ask();
    if (!found) {
      toast.error(geoErrorMessage(why));
      return;
    }
    setForm((f) => ({ ...f, latitude: found.lat, longitude: found.lng }));
    showSuccess("تم تحديد موقع المتجر");
  };

  const submit = async () => {
    if (!form.name || !form.phone || !form.wilaya_id || !form.commune || !form.address_line) {
      toast.error("املأ بيانات المتجر المطلوبة.");
      return;
    }
    if (!form.category) {
      toast.error("اختر التصنيف الرئيسي لمتجرك.");
      return;
    }
    setBusy(true);
    try {
      const hasCoords = form.latitude != null && form.longitude != null;
      await onSubmit({
        ...form,
        wilaya_id: form.wilaya_id ?? 0,
        latitude: hasCoords ? form.latitude : null,
        longitude: hasCoords ? form.longitude : null,
      });
      showSuccess("تم فتح المتجر بنجاح");
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 px-4 pb-24 pt-6">
      <div>
        <p className="text-sm text-muted-foreground">منصة Arownd للتجار</p>
        <h1 className="text-2xl font-bold">أنشئ متجر Arownd</h1>
      </div>
      <div className="space-y-3 rounded-[var(--radius-card)] bg-card p-4 ">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="اسم المتجر"
          aria-label="اسم المتجر"
          autoComplete="organization"
          className="h-[var(--control-height)] w-full rounded-full border border-input bg-background px-4 outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
        />
        <input
          value={form.phone}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="هاتف المتجر"
          aria-label="هاتف المتجر"
          className="h-[var(--control-height)] w-full rounded-full border border-input bg-background px-4 outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
        />
        <input
          value={form.whatsapp}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
          placeholder="واتساب"
          aria-label="رقم واتساب"
          className="h-[var(--control-height)] w-full rounded-full border border-input bg-background px-4 outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
        />
        <WilayaSelect
          value={form.wilaya_id}
          onChange={(wilaya_id) => setForm({ ...form, wilaya_id })}
          required
          className="h-[var(--control-height)] w-full"
        />
        <input
          value={form.commune}
          onChange={(e) => setForm({ ...form, commune: e.target.value })}
          placeholder="البلدية"
          aria-label="البلدية"
          autoComplete="address-level2"
          className="h-[var(--control-height)] w-full rounded-full border border-input bg-background px-4 outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
        />
        <textarea
          value={form.address_line}
          onChange={(e) => setForm({ ...form, address_line: e.target.value })}
          rows={3}
          placeholder="العنوان"
          aria-label="العنوان التفصيلي"
          autoComplete="street-address"
          className="w-full min-h-[var(--control-height)] rounded-[var(--radius-control)] border border-input bg-background px-4 py-3 outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
        />

        <div className="space-y-3 rounded-[var(--radius-card)] border border-border bg-background/60 p-3">
          <div>
            <p className="text-sm font-bold text-foreground">تصنيف المتجر</p>
            <p className="text-caption text-muted-foreground">
              اختر التصنيف الرئيسي لنشاطك، ثم الفئات الفرعية التي تبيعها.
            </p>
          </div>
          <MainCategoryPicker
            value={form.category}
            onChange={(category) =>
              setForm((f) => ({
                ...f,
                category,
                subcategories: f.subcategories.filter((x) =>
                  childrenOf(category).some((c) => c.id === x),
                ),
              }))
            }
          />
          {form.category && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground">الفئات الفرعية (اختيارية)</p>
              <SubcategoryMultiSelect
                categoryId={form.category}
                value={form.subcategories}
                onToggle={(id) =>
                  setForm((f) => ({
                    ...f,
                    subcategories: f.subcategories.includes(id)
                      ? f.subcategories.filter((x) => x !== id)
                      : [...f.subcategories, id],
                  }))
                }
              />
            </div>
          )}
        </div>

        <div className="rounded-[var(--radius-control)] border border-dashed border-accent-ink/40 bg-primary-soft/30 p-3">
          <p className="mb-1 text-xs font-bold text-accent-ink flex items-center gap-1">
            <MapPin className="size-4 shrink-0" /> موقع المتجر على الخريطة{" "}
            <span className="font-medium">(اختياري)</span>
          </p>
          <p className="mb-2 text-caption leading-relaxed text-muted-foreground">
            يمكنك فتح المتجر الآن دون تحديد الموقع، وإضافته لاحقًا من «تخصيص المتجر». المتاجر بدون
            موقع تعمل عادةً، لكنها لا تظهر على الخريطة.
          </p>
          <button
            type="button"
            onClick={locate}
            disabled={locating}
            className="w-full min-h-[var(--control-height)] rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition active:scale-[var(--scale-pressed)] disabled:opacity-50"
          >
            {locating ? "جارٍ تحديد الموقع..." : "تحديد موقعي الحالي"}
          </button>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input
              value={form.latitude ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  latitude: e.target.value ? Number(e.target.value) : null,
                })
              }
              placeholder="خط العرض"
              aria-label="خط العرض"
              inputMode="decimal"
              dir="ltr"
              className="h-[var(--control-height)] rounded-full border border-input bg-background px-3 text-end text-xs outline-none focus:border-ring focus:ring-2 focus:ring-ring"
            />
            <input
              value={form.longitude ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  longitude: e.target.value ? Number(e.target.value) : null,
                })
              }
              placeholder="خط الطول"
              aria-label="خط الطول"
              inputMode="decimal"
              dir="ltr"
              className="h-[var(--control-height)] rounded-full border border-input bg-background px-3 text-end text-xs outline-none focus:border-ring focus:ring-2 focus:ring-ring"
            />
          </div>
          {form.latitude != null && form.longitude != null && (
            <p className="mt-2 text-caption font-bold text-success flex items-center gap-1">
              <Check className="size-3" /> سيظهر متجرك على الخريطة
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input
            type="time"
            aria-label="وقت فتح المتجر"
            value={form.open}
            onChange={(e) => setForm({ ...form, open: e.target.value })}
            className="h-[var(--control-height)] rounded-full border border-input bg-background px-4 outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
          />
          <input
            type="time"
            aria-label="وقت إغلاق المتجر"
            value={form.close}
            onChange={(e) => setForm({ ...form, close: e.target.value })}
            className="h-[var(--control-height)] rounded-full border border-input bg-background px-4 outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="w-full min-h-[var(--control-height)] rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition active:scale-[var(--scale-pressed)] disabled:opacity-50"
        >
          {busy ? "جارٍ الإعداد..." : "فتح المتجر"}
        </button>
      </div>
    </div>
  );
}
