export interface UploadedFile {
  id?: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  url: string;
  expiresAt?: string | null; // ISO string or null for never
  downloadsCount?: number;
  blobData?: Blob; // For local indexedDB fallback
  content?: string; // Optional text content snippet if applicable
}

export type ExpirationOption = "never" | "24h" | "7d" | "30d";

export interface FileFilterOptions {
  searchQuery: string;
  category: "all" | "images" | "documents" | "media" | "archives" | "code";
  sortBy: "newest" | "oldest" | "name-asc" | "name-desc" | "size-desc" | "size-asc";
}
