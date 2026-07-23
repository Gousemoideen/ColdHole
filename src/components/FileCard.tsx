import React, { useState } from "react";
import { 
  Image, 
  Video, 
  Music, 
  FileText, 
  FileArchive, 
  FileCode, 
  File, 
  Trash2, 
  Copy, 
  Check, 
  ExternalLink,
  Clock,
  QrCode,
  Eye,
  CheckSquare,
  Square
} from "lucide-react";
import { UploadedFile } from "../types";
import { motion } from "motion/react";

interface FileCardProps {
  file: UploadedFile;
  onDelete: (name: string) => Promise<void>;
  onPreview: (file: UploadedFile) => void;
  onShowQR: (file: UploadedFile) => void;
  isSelected?: boolean;
  onToggleSelect?: (name: string) => void;
  viewMode: "grid" | "list";
}

export function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function formatDate(dateString: string) {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return "Unknown Date";
  }
}

export default function FileCard({
  file,
  onDelete,
  onPreview,
  onShowQR,
  isSelected,
  onToggleSelect,
  viewMode,
}: FileCardProps) {
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fullUrl = file.url.startsWith("http") ? file.url : window.location.origin + file.url;

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  };

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(file.name);
    } catch (error) {
      console.error(error);
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const getFileIcon = () => {
    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();

    if (type.startsWith("image/")) return <Image className="h-5 w-5 text-emerald-500" />;
    if (type.startsWith("video/")) return <Video className="h-5 w-5 text-indigo-500" />;
    if (type.startsWith("audio/")) return <Music className="h-5 w-5 text-amber-500" />;
    if (type === "application/pdf") return <FileText className="h-5 w-5 text-rose-500" />;
    if (type.includes("word") || name.endsWith(".doc") || name.endsWith(".docx")) return <FileText className="h-5 w-5 text-blue-500" />;
    if (type.includes("excel") || name.endsWith(".xls") || name.endsWith(".xlsx") || name.endsWith(".csv")) return <FileCode className="h-5 w-5 text-teal-500" />;
    if (type.includes("zip") || name.endsWith(".zip") || name.endsWith(".rar") || name.endsWith(".7z") || name.endsWith(".tar")) return <FileArchive className="h-5 w-5 text-amber-600" />;
    if (name.endsWith(".json") || name.endsWith(".js") || name.endsWith(".ts") || name.endsWith(".html") || name.endsWith(".css")) return <FileCode className="h-5 w-5 text-violet-500" />;
    return <File className="h-5 w-5 text-zinc-500" />;
  };

  const getAccentBg = () => {
    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();

    if (type.startsWith("image/")) return "bg-emerald-50 dark:bg-emerald-950/20";
    if (type.startsWith("video/")) return "bg-indigo-50 dark:bg-indigo-950/20";
    if (type.startsWith("audio/")) return "bg-amber-50 dark:bg-amber-950/20";
    if (type === "application/pdf") return "bg-rose-50 dark:bg-rose-950/20";
    if (type.includes("word") || name.endsWith(".doc") || name.endsWith(".docx")) return "bg-blue-50 dark:bg-blue-950/20";
    return "bg-zinc-50 dark:bg-zinc-800/30";
  };

  // Render List View
  if (viewMode === "list") {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        onClick={() => onPreview(file)}
        className={`flex items-center justify-between p-3.5 bg-white dark:bg-zinc-900 border rounded-2xl cursor-pointer hover:border-violet-500 dark:hover:border-violet-500 transition-all group ${
          isSelected ? "border-violet-600 bg-violet-50/40 dark:bg-violet-950/20" : "border-zinc-100 dark:border-zinc-800"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {onToggleSelect && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(file.name);
              }}
              className="text-zinc-400 hover:text-violet-600 transition-colors p-1"
            >
              {isSelected ? <CheckSquare className="h-4 w-4 text-violet-600" /> : <Square className="h-4 w-4" />}
            </button>
          )}

          <div className={`p-2.5 rounded-xl shrink-0 ${getAccentBg()}`}>
            {getFileIcon()}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors" title={file.name}>
                {file.name}
              </h4>
              {file.expiresAt && (
                <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-200/50 shrink-0">
                  Expiring
                </span>
              )}
            </div>
            <div className="flex items-center gap-2.5 mt-0.5 text-xs text-zinc-400 font-mono">
              <span>{formatBytes(file.size)}</span>
              <span>•</span>
              <span className="flex items-center gap-1 font-sans">
                <Clock className="h-3 w-3" />
                {formatDate(file.uploadedAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 ml-3 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onPreview(file)}
            className="p-2 rounded-xl text-zinc-400 hover:text-violet-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Preview File"
          >
            <Eye className="h-4 w-4" />
          </button>

          <button
            onClick={() => onShowQR(file)}
            className="p-2 rounded-xl text-zinc-400 hover:text-violet-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Mobile QR Code"
          >
            <QrCode className="h-4 w-4" />
          </button>

          <button
            onClick={handleCopyLink}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors relative"
            title="Copy URL"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
          </button>

          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Open Direct Link"
          >
            <ExternalLink className="h-4 w-4" />
          </a>

          <button
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className={`p-2 rounded-xl transition-colors ${
              confirmDelete
                ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600 font-bold"
                : "text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/10"
            }`}
            title={confirmDelete ? "Tap again to confirm deletion" : "Delete File"}
          >
            {isDeleting ? (
              <div className="h-4 w-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
            ) : confirmDelete ? (
              <span className="text-[10px] uppercase font-bold tracking-wider">Confirm?</span>
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </motion.div>
    );
  }

  // Render Grid View
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      onClick={() => onPreview(file)}
      className={`bg-white dark:bg-zinc-900 border rounded-2xl p-4 flex flex-col justify-between cursor-pointer hover:border-violet-500 dark:hover:border-violet-500 hover:shadow-md transition-all group relative ${
        isSelected ? "border-violet-600 bg-violet-50/40 dark:bg-violet-950/20 shadow-sm" : "border-zinc-100 dark:border-zinc-800"
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {onToggleSelect && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect(file.name);
                }}
                className="text-zinc-400 hover:text-violet-600 transition-colors p-0.5"
              >
                {isSelected ? <CheckSquare className="h-4 w-4 text-violet-600" /> : <Square className="h-4 w-4" />}
              </button>
            )}
            <div className={`p-3 rounded-xl ${getAccentBg()}`}>
              {getFileIcon()}
            </div>
          </div>

          <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onShowQR(file)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-violet-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Mobile QR Code"
            >
              <QrCode className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleCopyLink}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Copy URL"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Open File"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 break-all line-clamp-2 leading-snug group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors" title={file.name}>
          {file.name}
        </h4>

        {file.expiresAt && (
          <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-200/50">
            <Clock className="h-3 w-3" /> Auto-expires
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col">
          <span className="font-mono text-zinc-500 dark:text-zinc-400 font-medium">{formatBytes(file.size)}</span>
          <span className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
            <Clock className="h-2.5 w-2.5" />
            {formatDate(file.uploadedAt)}
          </span>
        </div>

        <button
          onClick={handleDeleteClick}
          disabled={isDeleting}
          className={`p-1.5 rounded-lg transition-colors ${
            confirmDelete
              ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600 font-bold"
              : "text-zinc-300 dark:text-zinc-600 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/10"
          }`}
          title={confirmDelete ? "Tap again to delete" : "Delete File"}
        >
          {isDeleting ? (
            <div className="h-3.5 w-3.5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
          ) : confirmDelete ? (
            <span className="text-[9px] px-1 font-bold uppercase tracking-wider">Delete?</span>
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </motion.div>
  );
}
