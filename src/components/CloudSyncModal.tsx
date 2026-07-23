import React, { useState } from "react";
import { X, Cloud, CloudUpload, CloudDownload, Key, Check, RefreshCw, Smartphone, Monitor } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { storageService } from "../services/storageService";

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete: () => void;
}

export default function CloudSyncModal({ isOpen, onClose, onSyncComplete }: CloudSyncModalProps) {
  const [pin, setPin] = useState(() => storageService.getSyncPin());
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isOpen) return null;

  const handlePush = async () => {
    setIsPushing(true);
    setStatusMessage(null);
    try {
      storageService.setSyncPin(pin);
      const count = await storageService.pushToCloudRelay(pin);
      setStatusMessage({
        type: "success",
        text: `Successfully synced ${count} file${count !== 1 ? "s" : ""} to Cloud Channel "${pin}"! Open mobile to pull.`,
      });
      onSyncComplete();
    } catch (e: any) {
      console.error(e);
      setStatusMessage({
        type: "error",
        text: e.message || "Failed to push files to cloud. Check internet connection.",
      });
    } finally {
      setIsPushing(false);
    }
  };

  const handlePull = async () => {
    setIsPulling(true);
    setStatusMessage(null);
    try {
      storageService.setSyncPin(pin);
      const count = await storageService.pullFromCloudRelay(pin);
      setStatusMessage({
        type: "success",
        text: `Fetched ${count} file${count !== 1 ? "s" : ""} from Cloud Channel "${pin}" into your device!`,
      });
      onSyncComplete();
    } catch (e: any) {
      console.error(e);
      setStatusMessage({
        type: "error",
        text: e.message || "Could not find any cloud files for this channel pin.",
      });
    } finally {
      setIsPulling(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative flex flex-col"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-violet-600/20">
              <Cloud className="h-6 w-6 animate-bounce" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">
                Cross-Device Cloud Sync
              </h3>
              <p className="text-xs text-zinc-400">Sync files between Desktop & Mobile instantly</p>
            </div>
          </div>

          {/* Channel Pin Input */}
          <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 mb-5">
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5 text-violet-500" />
              Sync Channel Pin / Secret Room Name:
            </label>
            <div className="relative">
              <input
                type="text"
                value={pin}
                onChange={(e) => setPin(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                placeholder="e.g. gouse-vault"
                className="w-full text-xs font-mono font-bold px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-violet-600 dark:text-violet-400 focus:outline-none focus:border-violet-500 uppercase"
              />
            </div>
            <p className="text-[10px] text-zinc-400 mt-1.5 leading-relaxed">
              Use the <strong>same pin name</strong> on your mobile phone to access files pushed from desktop.
            </p>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold mb-4 border flex items-center gap-2 ${
                statusMessage.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300"
                  : "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/30 text-rose-800 dark:text-rose-300"
              }`}
            >
              <Check className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handlePush}
              disabled={isPushing || isPulling}
              className="flex flex-col items-center justify-center p-4 bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white rounded-2xl font-bold text-xs transition-all shadow-md shadow-violet-600/20"
            >
              {isPushing ? (
                <RefreshCw className="h-6 w-6 animate-spin mb-1.5" />
              ) : (
                <CloudUpload className="h-6 w-6 mb-1.5" />
              )}
              <span>Push Desktop Vault</span>
              <span className="text-[9px] font-normal text-white/80 mt-0.5">Upload to Cloud Channel</span>
            </button>

            <button
              onClick={handlePull}
              disabled={isPushing || isPulling}
              className="flex flex-col items-center justify-center p-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-[0.98] text-zinc-800 dark:text-zinc-100 rounded-2xl font-bold text-xs transition-all border border-zinc-200/80 dark:border-zinc-700"
            >
              {isPulling ? (
                <RefreshCw className="h-6 w-6 animate-spin mb-1.5 text-violet-500" />
              ) : (
                <CloudDownload className="h-6 w-6 mb-1.5 text-violet-500" />
              )}
              <span>Pull Mobile Vault</span>
              <span className="text-[9px] font-normal text-zinc-400 dark:text-zinc-400 mt-0.5">Fetch from Cloud Channel</span>
            </button>
          </div>

          <div className="mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
            <span className="flex items-center gap-1">
              <Monitor className="h-3.5 w-3.5 text-violet-500" /> Desktop
            </span>
            <span>⇄</span>
            <span className="flex items-center gap-1">
              <Smartphone className="h-3.5 w-3.5 text-indigo-500" /> Mobile
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
