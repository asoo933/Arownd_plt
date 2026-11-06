package com.arownd.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ArowndSystemUiPlugin.class);
        registerPlugin(ArowndSecureStoragePlugin.class);
        registerPlugin(ArowndAppUpdatePlugin.class);
        super.onCreate(savedInstanceState);

        // Disable pinch-to-zoom for every screen hosted by the Android WebView.
        if (getBridge() != null && getBridge().getWebView() != null) {
            android.webkit.WebSettings webSettings = getBridge().getWebView().getSettings();
            webSettings.setSupportZoom(false);
            webSettings.setBuiltInZoomControls(false);
            webSettings.setDisplayZoomControls(false);
        }
    }
}
