import { registerPlugin } from "@capacitor/core";
import { isNativePlatform } from "@/lib/platform";

interface ArowndSystemUiPlugin {
  setStatusBar(options: { dark: boolean; color: string }): Promise<void>;
  openExternal(options: { url: string }): Promise<void>;
  shareText(options: { title: string; text: string; url?: string }): Promise<void>;
  shareFile(options: {
    data: string;
    fileName: string;
    mimeType: string;
  }): Promise<void>;
}

const ArowndSystemUi = registerPlugin<ArowndSystemUiPlugin>("ArowndSystemUi");

function safeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || !url.hostname) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function safeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (!["https:", "http:", "tel:", "mailto:", "sms:", "geo:"].includes(url.protocol)) {
      return null;
    }
    if ((url.protocol === "http:" || url.protocol === "https:") && !url.hostname) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Synchronizes the Android status bar with the active app theme. */
export async function syncNativeStatusBar(dark: boolean, color: string): Promise<void> {
  if (isNativePlatform()) {
    await ArowndSystemUi.setStatusBar({ dark, color });
  }
}

/** Opens a validated web link in the operating system's default handler. */
export async function openExternalUrl(value: string): Promise<boolean> {
  const url = safeExternalUrl(value);
  if (!url) return false;

  if (isNativePlatform()) {
    await ArowndSystemUi.openExternal({ url });
    return true;
  }

  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read selected file"));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Selected file could not be encoded"));
        return;
      }
      const comma = result.indexOf(",");
      if (comma < 0) {
        reject(new Error("Invalid file data URL"));
        return;
      }
      resolve(result.slice(comma + 1));
    };
    reader.readAsDataURL(file);
  });
}

/** Shares text and links through the native Android Sharesheet when available. */
export async function shareTextContent(options: {
  title: string;
  text: string;
  url?: string;
}): Promise<boolean> {
  if (isNativePlatform()) {
    await ArowndSystemUi.shareText(options);
    return true;
  }
  if (typeof navigator.share === "function") {
    await navigator.share(options);
    return true;
  }
  return false;
}

/**
 * Shares a local file using Android's native Sharesheet on device.
 * On supported browsers, uses the Web Share API with file support.
 */
export async function shareLocalFile(file: File): Promise<boolean> {
  if (file.size === 0 || file.size > 15 * 1024 * 1024) {
    throw new Error("The file must be between 1 byte and 15 MB");
  }
  const mimeType = file.type || "application/octet-stream";
  if (
    !mimeType.startsWith("image/") &&
    mimeType !== "application/pdf" &&
    mimeType !== "text/plain"
  ) {
    throw new Error("This file type cannot be shared");
  }

  if (isNativePlatform()) {
    await ArowndSystemUi.shareFile({
      data: await fileToBase64(file),
      fileName: file.name || "arownd-share",
      mimeType,
    });
    return true;
  }

  if (typeof navigator.share === "function") {
    const data = { files: [file], title: file.name };
    if (typeof navigator.canShare !== "function" || navigator.canShare(data)) {
      await navigator.share(data);
      return true;
    }
  }
  return false;
}

/** Fetches a public product image and shares it as an actual file. */
export async function shareRemoteImage(value: string, fileName = "arownd-image.jpg"): Promise<boolean> {
  const url = safeHttpUrl(value);
  if (!url) throw new Error("Invalid image URL");

  const response = await fetch(url, { credentials: "omit" });
  if (!response.ok) throw new Error("Could not retrieve the image");
  const declaredSize = Number(response.headers.get("content-length") || 0);
  if (declaredSize > 15 * 1024 * 1024) {
    throw new Error("The image is larger than 15 MB");
  }
  const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!contentType.startsWith("image/")) {
    throw new Error("The selected resource is not an image");
  }

  // Enforce the limit while streaming so a missing or misleading
  // Content-Length header cannot cause an unbounded Blob allocation.
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Streaming image downloads are not supported");
  }

  // Copy each chunk into an owned ArrayBuffer. This avoids passing a
  // potentially SharedArrayBuffer-backed view to BlobPart on newer TS libs.
  const chunks: ArrayBuffer[] = [];
  let received = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > 15 * 1024 * 1024) {
        await reader.cancel();
        throw new Error("The image is larger than 15 MB");
      }
      const chunk = new Uint8Array(value.byteLength);
      chunk.set(value);
      chunks.push(chunk.buffer);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  }

  const blob = new Blob(chunks, { type: contentType });
  if (blob.size === 0) {
    throw new Error("The image is empty");
  }

  const extension = blob.type === "image/png" ? "png" :
    blob.type === "image/webp" ? "webp" :
    blob.type === "image/jpeg" ? "jpg" : "img";
  const normalizedName = fileName.replace(/\.[^.]+$/, "");
  const file = new File([blob], `${normalizedName}.${extension}`, { type: blob.type });
  return shareLocalFile(file);
}
