import * as Linking from "expo-linking";

import { getSelectedCountryCode } from "@/lib/country-service";

import { getSupabaseClient } from "@/lib/supabase";
import type {
  BusinessSignupInput,
  LoginInput,
  PersonalSignupInput,
  RecoveryInput
} from "@/lib/auth-validation";

export async function signIn(input: LoginInput): Promise<void> {
  const { error } = await getSupabaseClient().auth.signInWithPassword({
    email: input.email,
    password: input.password
  });

  if (error) throw error;
}

export async function signUpPersonal(input: PersonalSignupInput): Promise<boolean> {
  const countryCode = await getSelectedCountryCode();
  if (!countryCode) throw new Error("COUNTRY_NOT_SELECTED");

  const redirectTo = Linking.createURL("auth/callback", {
    scheme: "com.arownd.app"
  });

  const { data, error } = await getSupabaseClient().auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: redirectTo,
      data: {
        full_name: input.fullName.trim(),
        account_type: "personal",
        country_code: countryCode
      }
    }
  });

  if (error) throw error;
  return data.session !== null;
}

export async function signUpBusiness(input: BusinessSignupInput): Promise<boolean> {
  const countryCode = await getSelectedCountryCode();
  if (!countryCode) throw new Error("COUNTRY_NOT_SELECTED");

  const redirectTo = Linking.createURL("auth/callback", {
    scheme: "com.arownd.app"
  });

  const { data, error } = await getSupabaseClient().auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: redirectTo,
      data: {
        full_name: input.fullName.trim(),
        account_type: "merchant",
        country_code: countryCode,
        business_name: input.businessName.trim()
      }
    }
  });

  if (error) throw error;
  return data.session !== null;
}

export async function requestPasswordRecovery(input: RecoveryInput): Promise<void> {
  const redirectTo = Linking.createURL("reset-password", {
    scheme: "com.arownd.app"
  });

  const { error } = await getSupabaseClient().auth.resetPasswordForEmail(input.email, {
    redirectTo
  });

  if (error) throw error;
}