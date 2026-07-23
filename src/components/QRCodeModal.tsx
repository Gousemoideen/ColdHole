import React, { useState } from "react";
import { X, Copy, Check, QrCode, ExternalLink, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  fileUrl: string;
}

export default function QRCodeModal({ isOpen, onClose, fileName, fileUrl }: QRCodeModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const fullUrl = fileUrl.startsWith("http") ? fileUrl : window.location.origin + fileUrl;
  // Use public QR Code generator API as reliable fallback or inline rendering
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(fullUrl)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Copy failed", e);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative flex flex-col items-center text-center"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="h-12 w-12 rounded-2xl bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center text-violet-600 dark:text-violet-400 mb-3 mt-1">
            <QrCode className="h-6 w-6" />
          </div>

          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
            Mobile QR Share
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-[240px] truncate" title={fileName}>
            {fileName}
          </p>

          {/* QR Code Container */}
          <div className="my-5 p-4 bg-white rounded-2xl border border-zinc-200 shadow-inner flex flex-col items-center justify-center">
            <img
              src={qrApiUrl}
              alt={`QR Code for ${fileName}`}
              className="w-48 h-48 object-contain rounded-lg"
              loading="eager"
            />
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-zinc-500 font-medium">
              <Smartphone className="h-3.5 w-3.5 text-violet-500" />
              Scan with phone camera to open
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 w-full">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-xl transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-500" /> Copied Link!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy Direct URL
                </>
              )}
            </button>

            <a
              href={fullUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-colors"
              title="Open link"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
