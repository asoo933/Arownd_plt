import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

describe("Premium Marketplace UI primitives", () => {
  it("renders primary buttons with the shared 48px control size", () => {
    render(<Button>متابعة</Button>);
    const button = screen.getByRole("button", { name: "متابعة" });
    expect(button).toHaveClass("min-h-12");
    expect(button).toHaveClass("rounded-[var(--radius-control)]");
  });

  it("renders icon buttons with a 44px touch target", () => {
    render(<Button size="icon" aria-label="فتح القائمة" />);
    expect(screen.getByRole("button", { name: "فتح القائمة" })).toHaveClass("size-11");
  });

  it("uses the shared card radius without decorative shadows", () => {
    render(<Card>محتوى البطاقة</Card>);
    const card = screen.getByText("محتوى البطاقة");
    expect(card).toHaveClass("rounded-[var(--radius-card)]");
    expect(card).toHaveClass("shadow-none");
  });

  it("renders form inputs with a 48px minimum height", () => {
    render(<Input aria-label="البحث" />);
    expect(screen.getByRole("textbox", { name: "البحث" })).toHaveClass("min-h-12");
  });
});
