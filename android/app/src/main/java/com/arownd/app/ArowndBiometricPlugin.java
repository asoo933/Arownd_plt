package com.arownd.app;

import android.content.SharedPreferences;

import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ArowndBiometric")
public class ArowndBiometricPlugin extends Plugin {
    private static final String PREFS_NAME = "arownd_biometric";
    private static final String ENABLED_KEY = "app_lock_enabled";
    private static final int AUTHENTICATORS = BiometricManager.Authenticators.BIOMETRIC_WEAK;

    private SharedPreferences preferences() {
        return getContext().getSharedPreferences(PREFS_NAME, android.content.Context.MODE_PRIVATE);
    }

    private int availability() {
        return BiometricManager.from(getContext()).canAuthenticate(AUTHENTICATORS);
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        int result = availability();
        JSObject response = new JSObject();
        response.put("available", result == BiometricManager.BIOMETRIC_SUCCESS);
        response.put("enabled", preferences().getBoolean(ENABLED_KEY, false));
        response.put("reason", reasonFor(result));
        call.resolve(response);
    }

    @PluginMethod
    public void setEnabled(PluginCall call) {
        Boolean enabled = call.getBoolean("enabled");
        if (enabled == null) {
            call.reject("An enabled value is required");
            return;
        }
        if (!enabled) {
            preferences().edit().remove(ENABLED_KEY).apply();
            call.resolve();
            return;
        }
        authenticate(call, true);
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        authenticate(call, false);
    }

    private void authenticate(PluginCall call, boolean enableAfterAuthentication) {
        int result = availability();
        if (result != BiometricManager.BIOMETRIC_SUCCESS) {
            call.reject("Biometric authentication is not available: " + reasonFor(result));
            return;
        }
        if (getActivity() == null) {
            call.reject("The Android activity is not available");
            return;
        }

        getActivity().runOnUiThread(() -> {
            BiometricPrompt.AuthenticationCallback callback = new BiometricPrompt.AuthenticationCallback() {
                @Override
                public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult authResult) {
                    if (enableAfterAuthentication) preferences().edit().putBoolean(ENABLED_KEY, true).apply();
                    JSObject response = new JSObject();
                    response.put("success", true);
                    response.put("enabled", preferences().getBoolean(ENABLED_KEY, false));
                    call.resolve(response);
                }

                @Override
                public void onAuthenticationError(int errorCode, CharSequence errString) {
                    call.reject("Biometric authentication was not completed: " + errString);
                }
            };

            BiometricPrompt prompt = new BiometricPrompt(
                (FragmentActivity) getActivity(),
                ContextCompat.getMainExecutor(getContext()),
                callback
            );
            BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                .setTitle("Arownd")
                .setSubtitle("استخدم البصمة أو التعرّف على الوجه لفتح التطبيق")
                .setNegativeButtonText("إلغاء")
                .setAllowedAuthenticators(AUTHENTICATORS)
                .build();
            prompt.authenticate(promptInfo);
        });
    }

    private String reasonFor(int result) {
        if (result == BiometricManager.BIOMETRIC_SUCCESS) return "available";
        if (result == BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE) return "no_hardware";
        if (result == BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE) return "hardware_unavailable";
        if (result == BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED) return "not_enrolled";
        if (result == BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED) return "security_update_required";
        return "unavailable";
    }
}
