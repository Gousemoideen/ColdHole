import { UploadedFile, ExpirationOption } from "../types";

const DB_NAME = "ColdHoleDB";
const STORE_NAME = "files";
const DB_VERSION = 1;

// Open IndexedDB connection
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this browser environment."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "name" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
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

class StorageService {
  private isServerAvailable: boolean | null = null;
  private activeBlobUrls: Map<string, string> = new Map();

  // Test if Node Express Server backend is reachable and actually returning JSON
  async checkServerMode(): Promise<boolean> {
    if (this.isServerAvailable !== null) return this.isServerAvailable;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const response = await fetch("/api/files", { signal: controller.signal });
      clearTimeout(timeoutId);

      const contentType = response.headers.get("content-type") || "";
      // Must be ok AND return JSON (to avoid Netlify SPA 200 index.html fallback)
      this.isServerAvailable = response.ok && contentType.includes("application/json");
    } catch {
      this.isServerAvailable = false;
    }
    return this.isServerAvailable;
  }

  // Fetch all files (from server or IndexedDB)
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
        console.warn("Failed fetching from backend server, falling back to IndexedDB:", err);
      }
    }

    // Client-side IndexedDB mode fallback
    return this.getFilesFromIDB();
  }

  private async getFilesFromIDB(): Promise<UploadedFile[]> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const now = new Date().getTime();
          const allItems: (UploadedFile & { blobData?: Blob })[] = request.result || [];
          const validFiles: UploadedFile[] = [];

          for (const item of allItems) {
            // Filter expired files
            if (item.expiresAt && new Date(item.expiresAt).getTime() < now) {
              this.deleteFileFromIDB(item.name);
              continue;
            }

            // Create ObjectURL for local blob if needed
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
            });
          }

          resolve(validFiles);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error("IndexedDB error:", e);
      return [];
    }
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
        console.warn("Server upload failed, falling back to IndexedDB storage:", e);
      }
    }

    // Client-side IndexedDB store (Netlify / static deploy fallback)
    const db = await openDB();
    const expiresAt = getExpirationTimestamp(expiration);

    // Prevent duplicate name collision
    let fileName = file.name;
    const existing = await this.getFilesFromIDB();
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

    const blobUrl = URL.createObjectURL(file);
    this.activeBlobUrls.set(fileName, blobUrl);

    const fileRecord = {
      name: fileName,
      size: file.size,
      type: file.type || "application/octet-stream",
      uploadedAt: new Date().toISOString(),
      url: blobUrl,
      expiresAt,
      downloadsCount: 0,
      blobData: file,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(fileRecord);

      request.onsuccess = () => {
        resolve({
          name: fileRecord.name,
          size: fileRecord.size,
          type: fileRecord.type,
          uploadedAt: fileRecord.uploadedAt,
          url: blobUrl,
          expiresAt,
          downloadsCount: 0,
        });
      };
      request.onerror = () => reject(request.error);
    });
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

    return this.deleteFileFromIDB(fileName);
  }

  private async deleteFileFromIDB(fileName: string): Promise<boolean> {
    try {
      if (this.activeBlobUrls.has(fileName)) {
        URL.revokeObjectURL(this.activeBlobUrls.get(fileName)!);
        this.activeBlobUrls.delete(fileName);
      }
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(fileName);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return false;
    }
  }

  // Clear all storage
  async clearAll(): Promise<boolean> {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).clear();
      this.activeBlobUrls.forEach((url) => URL.revokeObjectURL(url));
      this.activeBlobUrls.clear();
      return true;
    } catch {
      return false;
    }
  }
}

export const storageService = new StorageService();
