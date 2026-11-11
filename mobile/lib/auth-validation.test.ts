import { describe, expect, it } from "vitest";

import {
  businessSignupSchema,
  loginSchema,
  personalSignupSchema,
  recoverySchema,
  resetPasswordSchema
} from "./auth-validation";

describe("auth validation", () => {
  it("rejects an invalid login email", () => {
    expect(loginSchema.safeParse({ email: "bad", password: "password123" }).success).toBe(false);
  });

  it("accepts valid personal signup details", () => {
    expect(personalSignupSchema.safeParse({
      fullName: "Arownd User",
      email: "user@example.com",
      password: "password123",
      confirmPassword: "password123"
    }).success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    expect(personalSignupSchema.safeParse({
      fullName: "Arownd User",
      email: "user@example.com",
      password: "password123",
      confirmPassword: "different123"
    }).success).toBe(false);
  });

  it("requires a business name for merchant signup", () => {
    expect(businessSignupSchema.safeParse({
      fullName: "Merchant User",
      email: "merchant@example.com",
      password: "password123",
      confirmPassword: "password123",
      businessName: ""
    }).success).toBe(false);
  });

  it("validates password recovery email", () => {
    expect(recoverySchema.safeParse({ email: "person@example.com" }).success).toBe(true);
  });

  it("validates a password reset confirmation", () => {
    expect(resetPasswordSchema.safeParse({
      password: "newpassword123",
      confirmPassword: "newpassword123"
    }).success).toBe(true);
  });
});