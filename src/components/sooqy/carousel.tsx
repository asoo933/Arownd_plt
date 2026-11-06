import { useCallback, useEffect, useState, type ReactNode } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export function Carousel({
  children,
  className,
  slideClassName,
  showArrows = false,
  loop = true,
  onIndexChange,
}: {
  children: ReactNode[];
  className?: string;
  slideClassName?: string;
  showArrows?: boolean;
  loop?: boolean;
  onIndexChange?: (index: number) => void;
}) {
  const { isRTL, t } = useTranslation();
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    loop,
  });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    if (!emblaApi) return;
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
    onIndexChange?.(emblaApi.selectedScrollSnap());
  }, [emblaApi, onIndexChange]);

  useEffect(() => {
    if (!emblaApi) return;
    update();
    emblaApi.on("select", update);
    emblaApi.on("reInit", update);
    return () => {
      emblaApi.off("select", update);
      emblaApi.off("reInit", update);
    };
  }, [emblaApi, update]);

  // معكوس الأسهم في RTL
  const prevBtn = isRTL
    ? canNext
      ? () => emblaApi?.scrollNext()
      : null
    : canPrev
      ? () => emblaApi?.scrollPrev()
      : null;
  const nextBtn = isRTL
    ? canPrev
      ? () => emblaApi?.scrollPrev()
      : null
    : canNext
      ? () => emblaApi?.scrollNext()
      : null;

  return (
    <div className={cn("group relative", className)}>
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex touch-pan-y">
          {children.map((child, i) => (
            <div
              key={i}
              className={cn(
                "min-w-0 shrink-0 grow-0 basis-[85%] pe-3 first:pe-0 sm:basis-[60%]",
                slideClassName,
              )}
            >
              {child}
            </div>
          ))}
        </div>
      </div>
      {showArrows && (prevBtn || nextBtn) && (
        <>
          <button
            aria-label={t("aria_prev")}
            onClick={prevBtn ?? undefined}
            disabled={!prevBtn}
            className={cn(
              "absolute top-1/2 start-0 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-foreground shadow-lift backdrop-blur transition disabled:opacity-0",
              isRTL && "right-auto left-0",
            )}
          >
            <ChevronRight className={cn("size-4", isRTL && "rtl:rotate-180")} />
          </button>
          <button
            aria-label={t("aria_next")}
            onClick={nextBtn ?? undefined}
            disabled={!nextBtn}
            className={cn(
              "absolute top-1/2 end-0 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-foreground shadow-lift backdrop-blur transition disabled:opacity-0",
              isRTL && "left-auto right-0",
            )}
          >
            <ChevronLeft className={cn("size-4", isRTL && "rtl:rotate-180")} />
          </button>
        </>
      )}
    </div>
  );
}
