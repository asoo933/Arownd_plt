import "@testing-library/jest-dom/vitest";

// Node 26 + jsdom may expose storage on window without forwarding it to the
// Vitest global. Keep both references aligned; use an in-memory Storage only
// when jsdom cannot provide one (for example, an opaque origin).
const createMemoryStorage = (): Storage => {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(String(key)) ?? null,
    key: (index: number) => [...values.keys()][index] ?? null,
    removeItem: (key: string) => values.delete(String(key)),
    setItem: (key: string, value: string) => values.set(String(key), String(value)),
  };
};

let testStorage: Storage | undefined;
try {
  testStorage = window.localStorage;
} catch {
  testStorage = undefined;
}
testStorage ??= createMemoryStorage();
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: testStorage,
});
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: testStorage,
});

// jsdom يبلّغ عن "en-US" افتراضيًا، و`getSavedLang()` يتبع لغة المتصفح.
// SOOQY سوق جزائري — نثبّت لغة المتصفح على العربية ليعكس الاختبار السوق الافتراضي.
Object.defineProperty(navigator, "language", {
  configurable: true,
  get: () => "ar-DZ",
});

Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: () => {},
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// jsdom لا يوفر IntersectionObserver/ResizeObserver — مطلوبان من embla-carousel (Carousel)
class IntersectionObserverStub {
  root: Element | null = null;
  rootMargin = "";
  thresholds: number[] = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  value: IntersectionObserverStub,
});

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: ResizeObserverStub,
});
