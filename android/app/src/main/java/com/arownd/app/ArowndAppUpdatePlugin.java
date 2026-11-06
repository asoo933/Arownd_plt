package com.arownd.app;


import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.InstallState;
import com.google.android.play.core.install.InstallStateUpdatedListener;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.InstallStatus;
import com.google.android.play.core.install.model.UpdateAvailability;

@CapacitorPlugin(name = "ArowndAppUpdate")
public class ArowndAppUpdatePlugin extends Plugin {
    private AppUpdateManager updateManager;
    private InstallStateUpdatedListener installStateListener;

    @Override
    public void load() {
        updateManager = AppUpdateManagerFactory.create(getContext());
        installStateListener = this::publishInstallState;
        updateManager.registerListener(installStateListener);
    }

    @Override
    protected void handleOnDestroy() {
        if (updateManager != null && installStateListener != null) {
            updateManager.unregisterListener(installStateListener);
        }
        super.handleOnDestroy();
    }

    @PluginMethod
    public void checkForUpdate(PluginCall call) {
        if (updateManager == null) {
            call.reject("Google Play update manager is not initialized");
            return;
        }
        updateManager.getAppUpdateInfo()
            .addOnSuccessListener(info -> call.resolve(toJson(info)))
            .addOnFailureListener(error -> call.reject("Could not check Google Play updates", error));
    }

    @PluginMethod
    public void startUpdate(PluginCall call) {
        if (updateManager == null || getActivity() == null) {
            call.reject("Google Play update flow is not available");
            return;
        }
        String requestedType = call.getString("type", "flexible");
        final int requestedUpdateType = "immediate".equalsIgnoreCase(requestedType)
            ? AppUpdateType.IMMEDIATE
            : AppUpdateType.FLEXIBLE;

        updateManager.getAppUpdateInfo().addOnSuccessListener(info -> {
            int availability = info.updateAvailability();
            boolean resumingImmediate =
                availability == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS;
            if (info.installStatus() == InstallStatus.DOWNLOADED) {
                call.reject("The update has already been downloaded; complete it instead");
                return;
            }
            if (availability != UpdateAvailability.UPDATE_AVAILABLE && !resumingImmediate) {
                call.reject("No Google Play update is currently available");
                return;
            }
            int selectedUpdateType = resumingImmediate ? AppUpdateType.IMMEDIATE : requestedUpdateType;
            AppUpdateOptions options = AppUpdateOptions.newBuilder(selectedUpdateType).build();
            if (!info.isUpdateTypeAllowed(options)) {
                call.reject("Google Play does not allow the requested update type");
                return;
            }
            updateManager.startUpdateFlow(info, getActivity(), options)
                .addOnSuccessListener(resultCode -> {
                    JSObject response = new JSObject();
                    response.put("started", true);
                    response.put("accepted", resultCode == android.app.Activity.RESULT_OK);
                    response.put("type", selectedUpdateType == AppUpdateType.IMMEDIATE ? "immediate" : "flexible");
                    call.resolve(response);
                })
                .addOnFailureListener(error -> call.reject("Could not launch the Google Play update flow", error));
        }).addOnFailureListener(error -> call.reject("Could not prepare the Google Play update", error));
    }

    @PluginMethod
    public void completeUpdate(PluginCall call) {
        if (updateManager == null) {
            call.reject("Google Play update manager is not initialized");
            return;
        }
        updateManager.getAppUpdateInfo().addOnSuccessListener(info -> {
            if (info.installStatus() != InstallStatus.DOWNLOADED) {
                call.reject("There is no downloaded update to install");
                return;
            }
            updateManager.completeUpdate()
                .addOnSuccessListener(unused -> call.resolve())
                .addOnFailureListener(error -> call.reject("Could not complete the Google Play update", error));
        }).addOnFailureListener(error -> call.reject("Could not read the Google Play update state", error));
    }

    private JSObject toJson(AppUpdateInfo info) {
        JSObject response = new JSObject();
        int availability = info.updateAvailability();
        int installStatus = info.installStatus();
        response.put(
            "available",
            availability == UpdateAvailability.UPDATE_AVAILABLE ||
                availability == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS
        );
        response.put("inProgress", availability == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS);
        response.put("priority", info.updatePriority());
        response.put("immediateAllowed", info.isUpdateTypeAllowed(AppUpdateOptions.newBuilder(AppUpdateType.IMMEDIATE).build()));
        response.put("flexibleAllowed", info.isUpdateTypeAllowed(AppUpdateOptions.newBuilder(AppUpdateType.FLEXIBLE).build()));
        response.put("downloaded", installStatus == InstallStatus.DOWNLOADED);
        response.put("installStatus", installStatus);
        response.put("updateAvailability", availability);
        return response;
    }

    private void publishInstallState(InstallState state) {
        JSObject response = new JSObject();
        response.put("installStatus", state.installStatus());
        response.put("downloaded", state.installStatus() == InstallStatus.DOWNLOADED);
        response.put("bytesDownloaded", state.bytesDownloaded());
        response.put("totalBytesToDownload", state.totalBytesToDownload());
        notifyListeners("installStateChange", response);
    }
}
