import React, { useState, useRef } from "react";
import { Upload, Loader2, Check, AlertCircle, Sparkles, Clock, ShieldCheck, Files } from "lucide-react";
import { motion } from "motion/react";
import { ExpirationOption } from "../types";
import { storageService } from "../services/storageService";

interface FileUploaderProps {
  onUploadSuccess: () => void;
}

export default function FileUploader({ onUploadSuccess }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [expiration, setExpiration] = useState<ExpirationOption>("never");
  const [uploadStatus, setUploadStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await processFilesUpload(files);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await processFilesUpload(files);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const processFilesUpload = async (files: File[]) => {
    setIsUploading(true);
    setUploadStatus(null);

    let successCount = 0;
    let failCount = 0;
    let lastError = "";

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(`Uploading file ${i + 1} of ${files.length}: ${file.name}`);

      // 50MB per file size limit check
      if (file.size > 50 * 1024 * 1024) {
        failCount++;
        lastError = `File "${file.name}" exceeds maximum size limit of 50 MB.`;
        continue;
      }

      try {
        await storageService.uploadFile(file, expiration);
        successCount++;
      } catch (err: any) {
        console.error("Upload error:", err);
        failCount++;
        lastError = err?.message || "Failed to process upload.";
      }
    }

    setIsUploading(false);
    setUploadProgress(null);

    if (successCount > 0) {
      setUploadStatus({
        type: "success",
        message: `Successfully uploaded ${successCount} file${successCount > 1 ? "s" : ""}${failCount > 0 ? ` (${failCount} failed)` : ""}!`,
      });
      onUploadSuccess();
      setTimeout(() => setUploadStatus(null), 4000);
    } else {
      setUploadStatus({
        type: "error",
        message: lastError || "Failed to upload file. Please check storage permissions or file size limits.",
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full">
      {/* Expiration Bar Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4 px-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300">
          <Clock className="h-4 w-4 text-violet-500" />
          <span>File Retention Expiry:</span>
        </div>

        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
          {[
            { id: "never", label: "Never Expire" },
            { id: "24h", label: "24 Hours" },
            { id: "7d", label: "7 Days" },
            { id: "30d", label: "30 Days" },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setExpiration(opt.id as ExpirationOption)}
              className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all whitespace-nowrap ${
                expiration === opt.id
                  ? "bg-white dark:bg-zinc-700 text-violet-600 dark:text-violet-300 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Drag-and-drop dropzone */}
      <div
        id="dropzone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`relative overflow-hidden cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-8 md:p-10 text-center ${
          isDragging
            ? "border-violet-500 bg-violet-50/60 dark:bg-violet-950/30 shadow-lg shadow-violet-500/10 scale-[1.01]"
            : "border-zinc-200 dark:border-zinc-800 hover:border-violet-400 dark:hover:border-violet-800 bg-white dark:bg-zinc-900/50 hover:bg-zinc-50/50"
        }`}
      >
        <input
          id="file-input"
          type="file"
          multiple
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {isDragging && (
          <motion.div
            layoutId="glow"
            className="absolute inset-0 bg-radial-gradient from-violet-500/10 to-transparent pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
        )}

        <div className="flex flex-col items-center">
          <div
            className={`p-4 rounded-2xl mb-3.5 transition-all duration-300 ${
              isDragging
                ? "bg-violet-600 text-white shadow-md shadow-violet-500/20"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 group-hover:text-violet-500"
            }`}
          >
            {isUploading ? (
              <Loader2 className="h-7 w-7 animate-spin text-violet-500" />
            ) : (
              <Upload className="h-7 w-7" />
            )}
          </div>

          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-1">
            {isUploading ? uploadProgress || "Uploading files..." : "Drag & drop files here"}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 max-w-xs">
            {isUploading
              ? "Please wait while files are being stored securely"
              : "Or click anywhere on this box to select single or batch files"}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              <Sparkles className="h-3 w-3 text-violet-500" />
              Batch uploads supported
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              <ShieldCheck className="h-3 w-3 text-emerald-500" />
              Max 50 MB / file
            </span>
          </div>
        </div>
      </div>

      {/* Upload Feedback Banner */}
      {uploadStatus && (
        <motion.div
          id="upload-status"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-4 p-4 rounded-xl flex items-start gap-3 border ${
            uploadStatus.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30 text-rose-800 dark:text-rose-300"
          }`}
        >
          {uploadStatus.type === "success" ? (
            <Check className="h-5 w-5 shrink-0 text-emerald-500 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-500 mt-0.5" />
          )}
          <div className="text-xs leading-relaxed font-semibold">{uploadStatus.message}</div>
        </motion.div>
      )}
    </div>
  );
}
