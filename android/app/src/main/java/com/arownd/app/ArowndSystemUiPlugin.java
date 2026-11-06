package com.arownd.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.util.Base64;
import android.graphics.Color;
import android.view.Window;

import androidx.core.content.FileProvider;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.Locale;

@CapacitorPlugin(name = "ArowndSystemUi")
public class ArowndSystemUiPlugin extends Plugin {
    @PluginMethod
    public void setStatusBar(PluginCall call) {
        boolean dark = call.getBoolean("dark", false);
        String color = call.getString("color");

        getActivity().runOnUiThread(() -> {
            Window window = getActivity().getWindow();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                WindowInsetsControllerCompat controller =
                    WindowCompat.getInsetsController(window, window.getDecorView());
                controller.setAppearanceLightStatusBars(!dark);
            }

            if (Build.VERSION.SDK_INT < 35 && color != null && !color.isEmpty()) {
                try {
                    window.setStatusBarColor(Color.parseColor(color));
                } catch (IllegalArgumentException ignored) {
                    // Ignore invalid CSS colors instead of breaking native navigation.
                }
            } else if (Build.VERSION.SDK_INT >= 35) {
                window.setStatusBarColor(Color.TRANSPARENT);
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void openExternal(PluginCall call) {
        String rawUrl = call.getString("url");
        if (rawUrl == null) {
            call.reject("A URL is required");
            return;
        }

        Uri uri = Uri.parse(rawUrl);
        String scheme = uri.getScheme();
        boolean webLink = "https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme);
        boolean systemLink = "tel".equalsIgnoreCase(scheme) ||
            "mailto".equalsIgnoreCase(scheme) || "sms".equalsIgnoreCase(scheme) ||
            "geo".equalsIgnoreCase(scheme);
        if (scheme == null || (!webLink && !systemLink) ||
            (webLink && uri.getHost() == null)) {
            call.reject("This external link type is not supported");
            return;
        }

        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception error) {
            call.reject("No application can open this link", error);
        }
    }

    @PluginMethod
    public void shareText(PluginCall call) {
        String title = call.getString("title", "Share with");
        String text = call.getString("text", "");
        String url = call.getString("url");
        String payload = text == null ? "" : text.trim();
        if (url != null && !url.trim().isEmpty()) {
            payload = payload.isEmpty() ? url : payload + "\n" + url;
        }
        if (payload.isEmpty()) {
            call.reject("Share text or URL is required");
            return;
        }

        try {
            Intent intent = new Intent(Intent.ACTION_SEND);
            intent.setType("text/plain");
            intent.putExtra(Intent.EXTRA_TEXT, payload);
            intent.putExtra(Intent.EXTRA_SUBJECT, title == null ? "Share with" : title);
            getContext().startActivity(
                Intent.createChooser(intent, title == null ? "Share with" : title)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            );
            call.resolve();
        } catch (RuntimeException error) {
            call.reject("Could not open the sharing menu", error);
        }
    }

    @PluginMethod
    public void shareFile(PluginCall call) {
        String encoded = call.getString("data");
        String requestedName = call.getString("fileName", "arownd-share");
        String mimeType = call.getString("mimeType", "application/octet-stream");
        if (encoded == null || encoded.isEmpty()) {
            call.reject("File data is required");
            return;
        }
        if (mimeType == null || !(mimeType.startsWith("image/") ||
            mimeType.equals("application/pdf") || mimeType.equals("text/plain"))) {
            call.reject("This file type cannot be shared");
            return;
        }

        if (encoded.length() > 21 * 1024 * 1024) {
            call.reject("File must be 15 MB or smaller");
            return;
        }

        byte[] bytes;
        try {
            bytes = Base64.decode(encoded, Base64.DEFAULT);
        } catch (IllegalArgumentException error) {
            call.reject("Invalid file data", error);
            return;
        }
        if (bytes.length == 0 || bytes.length > 15 * 1024 * 1024) {
            call.reject("File must be between 1 byte and 15 MB");
            return;
        }

        String safeName = requestedName == null ? "arownd-share" :
            requestedName.replaceAll("[^A-Za-z0-9._-]", "_");
        if (safeName.isEmpty() || safeName.equals(".") || safeName.equals("..")) {
            safeName = "arownd-share";
        }

        try {
            File directory = new File(getContext().getCacheDir(), "shared");
            if (!directory.exists() && !directory.mkdirs()) {
                call.reject("Could not prepare a temporary share folder");
                return;
            }
            File[] cachedFiles = directory.listFiles();
            if (cachedFiles != null) {
                long expiry = System.currentTimeMillis() - 24L * 60L * 60L * 1000L;
                for (File cached : cachedFiles) {
                    if (cached.isFile() && cached.lastModified() < expiry) {
                        // Old share payloads are no longer needed after a day.
                        //noinspection ResultOfMethodCallIgnored
                        cached.delete();
                    }
                }
            }
            File output = new File(directory, System.currentTimeMillis() + "-" + safeName);
            try (FileOutputStream stream = new FileOutputStream(output)) {
                stream.write(bytes);
            }

            Uri contentUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                output
            );
            Intent intent = new Intent(Intent.ACTION_SEND);
            intent.setType(mimeType.toLowerCase(Locale.ROOT));
            intent.putExtra(Intent.EXTRA_STREAM, contentUri);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.setClipData(android.content.ClipData.newUri(
                getContext().getContentResolver(), "Arownd file", contentUri
            ));
            getContext().startActivity(Intent.createChooser(intent, "Share with").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            call.resolve();
        } catch (IOException | RuntimeException error) {
            call.reject("Could not prepare the file for sharing", error);
        }
    }
}
