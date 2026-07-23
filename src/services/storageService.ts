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

class StorageService {
  private isServerAvailable: boolean | null = null;
  private activeBlobUrls: Map<string, string> = new Map();
  private inMemoryFiles: Map<string, UploadedFile & { blobData: Blob }> = new Map();

  // Test if Node Express Server backend is reachable and returning JSON
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

  // Fetch all files (from server, IndexedDB, or in-memory fallback)
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

    // 1. Load from IndexedDB if available
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
        });
      }
    } catch (e) {
      console.warn("IndexedDB read skipped or unavailable, using memory store:", e);
    }

    // 2. Load from in-memory fallback store
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
        });
      }
    }

    return validFiles;
  }

  // Upload single file with multi-level fallback guarantee
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

    // Client-side storage handling
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

    // Convert file to clean, serializable Blob
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

    // Attempt IndexedDB storage
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
