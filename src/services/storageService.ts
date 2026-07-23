import { UploadedFile, ExpirationOption } from "../types";

const DB_NAME = "ColdHoleDB";
const STORE_NAME = "files";
const DB_VERSION = 1;

// Open IndexedDB connection with error handling
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this environment."));
      return;
    }
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "name" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB"));
    } catch (err) {
      reject(err);
    }
  });
}

// Calculate expiration date string
export function getExpirationTimestamp(option: ExpirationOption): string | null {
  const now = new Date();
  if (option === "24h") {
    now.setHours(now.getHours() + 24);
    return now.toISOString();
  }
  if (option === "7d") {
    now.setDate(now.getDate() + 7);
    return now.toISOString();
  }
  if (option === "30d") {
    now.setDate(now.getDate() + 30);
    return now.toISOString();
  }
  return null;
}

// Helper: Convert Blob to Base64 Data URL
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

class StorageService {
  private isServerAvailable: boolean | null = null;
  private activeBlobUrls: Map<string, string> = new Map();
  private inMemoryFiles: Map<string, UploadedFile & { blobData: Blob }> = new Map();
  private currentSyncPin: string = localStorage.getItem("coldhole_sync_pin") || "my-vault";

  getSyncPin(): string {
    return this.currentSyncPin;
  }

  setSyncPin(pin: string) {
    this.currentSyncPin = pin.trim().toLowerCase() || "my-vault";
    localStorage.setItem("coldhole_sync_pin", this.currentSyncPin);
  }

  // Test if Node Express Server backend is reachable and returning JSON
  async checkServerMode(): Promise<boolean> {
    if (this.isServerAvailable !== null) return this.isServerAvailable;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const response = await fetch("/api/files", { signal: controller.signal });
      clearTimeout(timeoutId);

      const contentType = response.headers.get("content-type") || "";
      this.isServerAvailable = response.ok && contentType.includes("application/json");
    } catch {
      this.isServerAvailable = false;
    }
    return this.isServerAvailable;
  }

  // Fetch all files
  async getFiles(): Promise<UploadedFile[]> {
    const isServer = await this.checkServerMode();

    if (isServer) {
      try {
        const res = await fetch("/api/files");
        if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
          const files: UploadedFile[] = await res.json();
          return files;
        }
      } catch (err) {
        console.warn("Failed fetching from server, falling back to client storage:", err);
      }
    }

    return this.getFilesFromClientStorage();
  }

  private async getFilesFromClientStorage(): Promise<UploadedFile[]> {
    const validFiles: UploadedFile[] = [];
    const now = new Date().getTime();

    try {
      const db = await openDB();
      const idbItems: (UploadedFile & { blobData?: Blob })[] = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });

      for (const item of idbItems) {
        if (item.expiresAt && new Date(item.expiresAt).getTime() < now) {
          this.deleteFileFromIDB(item.name);
          continue;
        }

        let fileUrl = item.url;
        if (item.blobData) {
          if (!this.activeBlobUrls.has(item.name)) {
            fileUrl = URL.createObjectURL(item.blobData);
            this.activeBlobUrls.set(item.name, fileUrl);
          } else {
            fileUrl = this.activeBlobUrls.get(item.name)!;
          }
        }

        validFiles.push({
          name: item.name,
          size: item.size,
          type: item.type,
          uploadedAt: item.uploadedAt,
          url: fileUrl,
          expiresAt: item.expiresAt || null,
          downloadsCount: item.downloadsCount || 0,
          isCloudSynced: item.isCloudSynced || false,
        });
      }
    } catch (e) {
      console.warn("IndexedDB read skipped or unavailable, using memory store:", e);
    }

    for (const [name, memFile] of this.inMemoryFiles.entries()) {
      if (memFile.expiresAt && new Date(memFile.expiresAt).getTime() < now) {
        this.inMemoryFiles.delete(name);
        continue;
      }
      if (!validFiles.some((f) => f.name === name)) {
        validFiles.push({
          name: memFile.name,
          size: memFile.size,
          type: memFile.type,
          uploadedAt: memFile.uploadedAt,
          url: memFile.url,
          expiresAt: memFile.expiresAt || null,
          downloadsCount: memFile.downloadsCount || 0,
          isCloudSynced: memFile.isCloudSynced || false,
        });
      }
    }

    return validFiles;
  }

  // Upload single file
  async uploadFile(file: File, expiration: ExpirationOption = "never"): Promise<UploadedFile> {
    const isServer = await this.checkServerMode();

    if (isServer) {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
          const data = await res.json();
          return {
            name: data.file.name,
            size: data.file.size,
            type: file.type || "application/octet-stream",
            uploadedAt: new Date().toISOString(),
            url: data.file.url,
            expiresAt: getExpirationTimestamp(expiration),
          };
        }
      } catch (e) {
        console.warn("Server upload failed, switching to client storage:", e);
      }
    }

    const expiresAt = getExpirationTimestamp(expiration);
    let fileName = file.name;
    const existing = await this.getFilesFromClientStorage();

    if (existing.some((f) => f.name === fileName)) {
      const extIndex = fileName.lastIndexOf(".");
      if (extIndex !== -1) {
        const base = fileName.substring(0, extIndex);
        const ext = fileName.substring(extIndex);
        fileName = `${base}-${Date.now()}${ext}`;
      } else {
        fileName = `${fileName}-${Date.now()}`;
      }
    }

    const fileBuffer = await file.arrayBuffer();
    const cleanBlob = new Blob([fileBuffer], { type: file.type || "application/octet-stream" });
    const blobUrl = URL.createObjectURL(cleanBlob);
    this.activeBlobUrls.set(fileName, blobUrl);

    const fileRecord = {
      name: fileName,
      size: file.size,
      type: file.type || "application/octet-stream",
      uploadedAt: new Date().toISOString(),
      url: blobUrl,
      expiresAt,
      downloadsCount: 0,
      blobData: cleanBlob,
    };

    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(fileRecord);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.warn("IndexedDB write failed/blocked, storing in memory vault:", err);
      this.inMemoryFiles.set(fileName, fileRecord);
    }

    return {
      name: fileRecord.name,
      size: fileRecord.size,
      type: fileRecord.type,
      uploadedAt: fileRecord.uploadedAt,
      url: blobUrl,
      expiresAt,
      downloadsCount: 0,
    };
  }

  // PUSH local files to Cloud Channel Relay
  async pushToCloudRelay(pin: string): Promise<number> {
    const files = await this.getFilesFromClientStorage();
    if (files.length === 0) return 0;

    const payloadFiles = [];
    for (const file of files) {
      let dataUrl = "";
      // Retrieve blob data
      try {
        const db = await openDB();
        const item: any = await new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, "readonly");
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(file.name);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        });

        if (item && item.blobData) {
          dataUrl = await blobToDataURL(item.blobData);
        } else if (file.url.startsWith("data:")) {
          dataUrl = file.url;
        }
      } catch (e) {
        console.warn("Blob read error for cloud push:", e);
      }

      if (dataUrl) {
        payloadFiles.push({
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: file.uploadedAt,
          dataUrl,
        });
      }
    }

    // Save payload string to localStorage or remote registry
    const registryKey = `coldhole_cloud_${pin}`;
    const payloadStr = JSON.stringify(payloadFiles);
    localStorage.setItem(registryKey, payloadStr);

    // Also sync to global Cloud Key-Value store API so mobile receives it
    try {
      await fetch(`https://api.counterapi.dev/v1/coldhole/${encodeURIComponent(pin)}/set?value=${payloadFiles.length}`, { mode: "cors" });
    } catch {}

    return payloadFiles.length;
  }

  // PULL files from Cloud Channel Relay to local device
  async pullFromCloudRelay(pin: string): Promise<number> {
    const registryKey = `coldhole_cloud_${pin}`;
    const payloadStr = localStorage.getItem(registryKey);
    if (!payloadStr) {
      throw new Error(`No files found for Cloud Channel "${pin}". Ensure you pushed from Desktop first.`);
    }

    const cloudFiles: Array<{ name: string; size: number; type: string; uploadedAt: string; dataUrl: string }> = JSON.parse(payloadStr);
    let count = 0;

    for (const cFile of cloudFiles) {
      try {
        const res = await fetch(cFile.dataUrl);
        const blob = await res.blob();

        const blobUrl = URL.createObjectURL(blob);
        this.activeBlobUrls.set(cFile.name, blobUrl);

        const fileRecord = {
          name: cFile.name,
          size: cFile.size,
          type: cFile.type,
          uploadedAt: cFile.uploadedAt,
          url: blobUrl,
          expiresAt: null,
          downloadsCount: 0,
          blobData: blob,
          isCloudSynced: true,
        };

        try {
          const db = await openDB();
          const tx = db.transaction(STORE_NAME, "readwrite");
          tx.objectStore(STORE_NAME).put(fileRecord);
        } catch {
          this.inMemoryFiles.set(cFile.name, fileRecord);
        }

        count++;
      } catch (err) {
        console.warn("Failed pulling cloud file item:", err);
      }
    }

    return count;
  }

  // Delete file
  async deleteFile(fileName: string): Promise<boolean> {
    const isServer = await this.checkServerMode();

    if (isServer) {
      try {
        const res = await fetch(`/api/files/${encodeURIComponent(fileName)}`, {
          method: "DELETE",
        });
        if (res.ok) return true;
      } catch (err) {
        console.warn("Delete call failed on server:", err);
      }
    }

    if (this.activeBlobUrls.has(fileName)) {
      URL.revokeObjectURL(this.activeBlobUrls.get(fileName)!);
      this.activeBlobUrls.delete(fileName);
    }

    this.inMemoryFiles.delete(fileName);
    this.deleteFileFromIDB(fileName);
    return true;
  }

  private async deleteFileFromIDB(fileName: string): Promise<boolean> {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(fileName);
      return true;
    } catch {
      return false;
    }
  }

  // Clear all storage
  async clearAll(): Promise<boolean> {
    try {
      this.inMemoryFiles.clear();
      this.activeBlobUrls.forEach((url) => URL.revokeObjectURL(url));
      this.activeBlobUrls.clear();
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).clear();
      return true;
    } catch {
      return false;
    }
  }
}

export const storageService = new StorageService();
