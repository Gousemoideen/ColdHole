import React, { useState, useEffect } from "react";
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  QrCode, 
  Trash2, 
  ExternalLink, 
  FileText, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Music as MusicIcon, 
  Clock, 
  HardDrive,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UploadedFile } from "../types";
import { formatBytes, formatDate } from "./FileCard";
import QRCodeModal from "./QRCodeModal";

interface FilePreviewModalProps {
  file: UploadedFile | null;
  onClose: () => void;
  onDelete: (name: string) => Promise<void>;
}

export default function FilePreviewModal({ file, onClose, onDelete }: FilePreviewModalProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!file) return;
    setZoomLevel(1);
    setConfirmDelete(false);
    setTextContent(null);

    // If file is text/code/json/csv, fetch text content for inline preview
    const ext = file.name.toLowerCase();
    const type = file.type.toLowerCase();
    const isText = 
      type.includes("text") || 
      type.includes("json") || 
      ext.endsWith(".txt") || 
      ext.endsWith(".md") || 
      ext.endsWith(".json") || 
      ext.endsWith(".js") || 
      ext.endsWith(".ts") || 
      ext.endsWith(".css") || 
      ext.endsWith(".html") || 
      ext.endsWith(".csv");

    if (isText && file.url) {
      setIsLoadingText(true);
      fetch(file.url)
        .then((res) => res.text())
        .then((text) => {
          setTextContent(text.slice(0, 100000)); // Cap preview at 100KB
        })
        .catch(() => setTextContent("Unable to load text preview."))
        .finally(() => setIsLoadingText(false));
    }
  }, [file]);

  if (!file) return null;

  const fullUrl = file.url.startsWith("http") ? file.url : window.location.origin + file.url;
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  const isImage = type.startsWith("image/");
  const isVideo = type.startsWith("video/");
  const isAudio = type.startsWith("audio/");
  const isPdf = type === "application/pdf" || name.endsWith(".pdf");

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Clipboard copy failed", e);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    await onDelete(file.name);
    onClose();
  };

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Modal Header */}
            <div className="p-4 sm:px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 shrink-0">
                  {isImage && <ImageIcon className="h-5 w-5" />}
                  {isVideo && <VideoIcon className="h-5 w-5" />}
                  {isAudio && <MusicIcon className="h-5 w-5" />}
                  {!isImage && !isVideo && !isAudio && <FileText className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate" title={file.name}>
                    {file.name}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono mt-0.5">
                    <span>{formatBytes(file.size)}</span>
                    <span>•</span>
                    <span>{formatDate(file.uploadedAt)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setShowQR(true)}
                  className="p-2 text-zinc-500 hover:text-violet-600 dark:text-zinc-400 dark:hover:text-violet-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                  title="Generate Mobile QR Code"
                >
                  <QrCode className="h-4.5 w-4.5" />
                </button>
                <button
                  onClick={handleCopyLink}
                  className="p-2 text-zinc-500 hover:text-violet-600 dark:text-zinc-400 dark:hover:text-violet-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                  title="Copy Direct Link"
                >
                  {copied ? <Check className="h-4.5 w-4.5 text-emerald-500" /> : <Copy className="h-4.5 w-4.5" />}
                </button>
                <a
                  href={file.url}
                  download={file.name}
                  className="p-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-colors flex items-center gap-1 text-xs font-semibold px-3"
                  title="Download File"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Download</span>
                </a>
                <button
                  onClick={onClose}
                  className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors ml-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Media Viewport */}
            <div className="flex-1 bg-zinc-950/90 relative overflow-auto flex items-center justify-center p-4 min-h-[300px] sm:min-h-[420px]">
              {isImage && (
                <div className="relative flex items-center justify-center w-full h-full overflow-auto p-2">
                  <img
                    src={file.url}
                    alt={file.name}
                    style={{ transform: `scale(${zoomLevel})` }}
                    className="max-h-[60vh] max-w-full object-contain rounded-xl transition-transform duration-200"
                  />
                  <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-black/60 backdrop-blur-md p-1.5 rounded-xl border border-white/10 text-white">
                    <button
                      onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                      className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                      title="Zoom Out"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-mono px-2">{Math.round(zoomLevel * 100)}%</span>
                    <button
                      onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                      className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                      title="Zoom In"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {isVideo && (
                <video
                  src={file.url}
                  controls
                  autoPlay
                  className="max-h-[60vh] max-w-full rounded-xl shadow-2xl"
                />
              )}

              {isAudio && (
                <div className="flex flex-col items-center justify-center p-8 bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full text-white">
                  <div className="p-5 rounded-full bg-violet-600/20 text-violet-400 mb-6 animate-pulse">
                    <MusicIcon className="h-12 w-12" />
                  </div>
                  <h4 className="text-sm font-semibold mb-6 text-center max-w-xs truncate">{file.name}</h4>
                  <audio src={file.url} controls className="w-full" />
                </div>
              )}

              {isPdf && (
                <iframe
                  src={file.url}
                  title={file.name}
                  className="w-full h-[60vh] rounded-xl border-none bg-white"
                />
              )}

              {!isImage && !isVideo && !isAudio && !isPdf && textContent !== null && (
                <div className="w-full h-[60vh] bg-zinc-900 p-4 rounded-xl overflow-auto font-mono text-xs text-zinc-300 whitespace-pre-wrap border border-zinc-800 leading-relaxed">
                  {isLoadingText ? "Loading file contents..." : textContent}
                </div>
              )}

              {!isImage && !isVideo && !isAudio && !isPdf && textContent === null && (
                <div className="flex flex-col items-center justify-center text-center p-12 text-zinc-400">
                  <FileText className="h-16 w-16 mb-4 text-zinc-600" />
                  <h4 className="text-sm font-semibold text-zinc-200 mb-1">Binary / Archive File</h4>
                  <p className="text-xs max-w-xs text-zinc-500 mb-6">
                    Direct browser preview is not available for this file type. You can download or stream it.
                  </p>
                  <a
                    href={file.url}
                    download={file.name}
                    className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-lg shadow-violet-600/20"
                  >
                    <Download className="h-4 w-4" /> Download File Now
                  </a>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 sm:px-6 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                {file.expiresAt ? (
                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Expires: {formatDate(file.expiresAt)}
                  </span>
                ) : (
                  <span>Permanent Storage</span>
                )}
              </div>

              <button
                onClick={handleDelete}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  confirmDelete
                    ? "bg-rose-600 text-white"
                    : "text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                }`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {confirmDelete ? "Tap to confirm deletion" : "Delete File"}
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* QR Code Sub-modal */}
      <QRCodeModal
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        fileName={file.name}
        fileUrl={file.url}
      />
    </>
  );
}
