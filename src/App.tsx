import React, { useState, useEffect } from "react";
import { 
  FolderDown, 
  Search, 
  Grid, 
  List as ListIcon, 
  FolderOpen, 
  HardDrive, 
  RefreshCw,
  Image as ImageIcon,
  FileText as DocIcon,
  Video as MediaIcon,
  FileArchive as ZipIcon,
  ChevronDown,
  Trash2,
  CheckCircle,
  AlertCircle,
  Sun,
  Moon,
  CheckSquare,
  Square,
  ShieldAlert,
  Code,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UploadedFile } from "./types";
import { storageService } from "./services/storageService";
import FileUploader from "./components/FileUploader";
import FileCard, { formatBytes } from "./components/FileCard";
import FilePreviewModal from "./components/FilePreviewModal";
import QRCodeModal from "./components/QRCodeModal";

export default function App() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<"all" | "images" | "documents" | "media" | "archives" | "code">("all");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("theme") === "dark" || 
      (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const [qrFile, setQrFile] = useState<UploadedFile | null>(null);
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  // Sync dark mode class on <html> tag
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      const data = await storageService.getFiles();
      setFiles(data);
    } catch (error) {
      console.error("Failed to fetch files:", error);
      showNotification("error", "Could not load files from storage.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstantSync = async () => {
    setIsSyncing(true);
    try {
      await storageService.syncNow();
      const updatedData = await storageService.getFiles();
      setFiles(updatedData);
      showNotification("success", "Vault synced! Mobile & Desktop are updated.");
    } catch (error) {
      console.error("Sync error:", error);
      showNotification("error", "Sync failed. Please check connection.");
    } finally {
      setIsSyncing(false);
    }
  };

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleDeleteFile = async (name: string) => {
    try {
      const success = await storageService.deleteFile(name);
      if (success) {
        setFiles(prev => prev.filter(f => f.name !== name));
        setSelectedFileNames(prev => prev.filter(n => n !== name));
        showNotification("success", `File "${name}" deleted successfully.`);
      } else {
        showNotification("error", "Failed to delete file.");
      }
    } catch (error) {
      console.error(error);
      showNotification("error", "Error occurred while deleting file.");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedFileNames.length === 0) return;
    setIsDeletingBulk(true);

    let count = 0;
    for (const name of selectedFileNames) {
      const success = await storageService.deleteFile(name);
      if (success) count++;
    }

    setFiles(prev => prev.filter(f => !selectedFileNames.includes(f.name)));
    setSelectedFileNames([]);
    setIsDeletingBulk(false);
    showNotification("success", `Deleted ${count} selected file${count > 1 ? "s" : ""}.`);
  };

  const toggleSelectFile = (name: string) => {
    setSelectedFileNames(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const toggleSelectAll = () => {
    if (selectedFileNames.length === sortedFiles.length) {
      setSelectedFileNames([]);
    } else {
      setSelectedFileNames(sortedFiles.map(f => f.name));
    }
  };

  // Compute stats
  const totalFiles = files.length;
  const totalStorage = files.reduce((acc, f) => acc + f.size, 0);
  const MAX_STORAGE = 500 * 1024 * 1024; // 500MB recommended limit indicator
  const storagePercentage = Math.min(100, Math.round((totalStorage / MAX_STORAGE) * 100));

  // Filtering
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    
    if (filterCategory === "all") return true;

    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();

    if (filterCategory === "images") return type.startsWith("image/");
    if (filterCategory === "documents") {
      return (
        type === "application/pdf" ||
        type.includes("word") ||
        type.includes("text") ||
        type.includes("excel") ||
        name.endsWith(".pdf") ||
        name.endsWith(".doc") ||
        name.endsWith(".docx") ||
        name.endsWith(".txt") ||
        name.endsWith(".md") ||
        name.endsWith(".xls") ||
        name.endsWith(".xlsx") ||
        name.endsWith(".csv")
      );
    }
    if (filterCategory === "media") return type.startsWith("audio/") || type.startsWith("video/");
    if (filterCategory === "archives") {
      return (
        type.includes("zip") ||
        type.includes("compressed") ||
        name.endsWith(".zip") ||
        name.endsWith(".rar") ||
        name.endsWith(".7z") ||
        name.endsWith(".tar")
      );
    }
    if (filterCategory === "code") {
      return (
        name.endsWith(".js") ||
        name.endsWith(".ts") ||
        name.endsWith(".tsx") ||
        name.endsWith(".jsx") ||
        name.endsWith(".json") ||
        name.endsWith(".html") ||
        name.endsWith(".css") ||
        name.endsWith(".py")
      );
    }
    return true;
  });

  // Sorting
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    if (sortBy === "newest") {
      return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
    }
    if (sortBy === "oldest") {
      return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
    }
    if (sortBy === "name-asc") {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === "name-desc") {
      return b.name.localeCompare(a.name);
    }
    if (sortBy === "size-desc") {
      return b.size - a.size;
    }
    if (sortBy === "size-asc") {
      return a.size - b.size;
    }
    return 0;
  });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 transition-colors duration-300 flex flex-col">
      
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-violet-600/20">
              <FolderDown className="h-5.5 w-5.5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">ColdHole</h1>
              <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Fast Universal File Vault</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 1-Click Instant Sync Button */}
            <button
              onClick={handleInstantSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-md shadow-violet-600/20"
              title="1-Click Sync Desktop & Mobile"
            >
              <Zap className={`h-4 w-4 text-amber-300 ${isSyncing ? "animate-spin" : "animate-pulse"}`} />
              <span>{isSyncing ? "Syncing..." : "Sync Vault"}</span>
            </button>

            {/* Dark Mode Switcher */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Toggle Theme"
            >
              {darkMode ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5" />}
            </button>

            {/* Refresh Button */}
            <button
              onClick={fetchFiles}
              className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Refresh Files"
            >
              <RefreshCw className={`h-4.5 w-4.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 md:py-8 flex flex-col gap-6 md:gap-8 flex-1 w-full">
        
        {/* Toast Notification Banner */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`p-4 rounded-2xl flex items-center gap-3 border shadow-sm ${
                notification.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300"
                  : "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/30 text-rose-800 dark:text-rose-300"
              }`}
            >
              {notification.type === "success" ? (
                <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
              ) : (
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
              )}
              <span className="text-xs font-semibold">{notification.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dashboard Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-4 rounded-2xl flex items-center gap-3.5 shadow-sm">
            <div className="p-3 rounded-2xl bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Total Files</p>
              <p className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100 leading-tight mt-0.5">{totalFiles}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-4 rounded-2xl flex items-center gap-3.5 shadow-sm">
            <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400">
              <HardDrive className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Vault Capacity</p>
                <span className="text-[10px] font-mono text-zinc-400">{storagePercentage}%</span>
              </div>
              <p className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100 leading-tight mt-0.5">{formatBytes(totalStorage)}</p>
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-violet-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${storagePercentage}%` }}
                />
              </div>
            </div>
          </div>

          <div
            onClick={handleInstantSync}
            className="bg-gradient-to-br from-violet-600 to-indigo-700 p-4 rounded-2xl text-white shadow-lg shadow-violet-500/10 flex items-center justify-between cursor-pointer hover:scale-[1.01] transition-transform"
          >
            <div>
              <h4 className="text-xs font-bold leading-tight flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-amber-300" /> Automatic Cross-Sync Active
              </h4>
              <p className="text-[10px] text-white/80 mt-1 max-w-[210px]">Drop files on desktop and tap Sync to instantly view on mobile.</p>
            </div>
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping shadow-sm shrink-0" />
          </div>
        </div>

        {/* File Drag-and-drop Uploader Zone */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-4 md:p-6 rounded-3xl shadow-sm">
          <FileUploader onUploadSuccess={fetchFiles} />
        </div>

        {/* Repository Listing Controls */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200/80 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-200">Repository Files</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Showing {sortedFiles.length} of {totalFiles} total uploads</p>
              </div>
            </div>

            {/* View Mode & Sorter controls */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <div className="bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl flex items-center">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === "grid" ? "bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-600"}`}
                  title="Grid view"
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === "list" ? "bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-600"}`}
                  title="List view"
                >
                  <ListIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none pl-3.5 pr-8 py-2 text-xs font-semibold bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-violet-500 cursor-pointer shadow-sm"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name-asc">Name A-Z</option>
                  <option value="name-desc">Name Z-A</option>
                  <option value="size-desc">Largest Size</option>
                  <option value="size-asc">Smallest Size</option>
                </select>
                <ChevronDown className="h-3 w-3 absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Bulk Selection Bar */}
          {sortedFiles.length > 0 && (
            <div className="flex items-center justify-between bg-zinc-100/70 dark:bg-zinc-900/60 p-2.5 px-4 rounded-xl border border-zinc-200/60 dark:border-zinc-800/80 text-xs">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 font-semibold text-zinc-700 dark:text-zinc-300 hover:text-violet-600 transition-colors"
              >
                {selectedFileNames.length === sortedFiles.length && sortedFiles.length > 0 ? (
                  <CheckSquare className="h-4 w-4 text-violet-600" />
                ) : (
                  <Square className="h-4 w-4 text-zinc-400" />
                )}
                <span>
                  {selectedFileNames.length > 0
                    ? `Selected ${selectedFileNames.length} of ${sortedFiles.length}`
                    : "Select All Files"}
                </span>
              </button>

              {selectedFileNames.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  disabled={isDeletingBulk}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold transition-colors shadow-sm"
                >
                  {isDeletingBulk ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  <span>Delete Selected ({selectedFileNames.length})</span>
                </button>
              )}
            </div>
          )}

          {/* Category Tabs & Search Input */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 md:pb-0 shrink-0">
              {[
                { id: "all", label: "All Files", icon: FolderOpen },
                { id: "images", label: "Images", icon: ImageIcon },
                { id: "documents", label: "Docs", icon: DocIcon },
                { id: "media", label: "Media", icon: MediaIcon },
                { id: "archives", label: "Archives", icon: ZipIcon },
                { id: "code", label: "Code", icon: Code },
              ].map(tab => {
                const IconComp = tab.icon;
                const active = filterCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setFilterCategory(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors ${
                      active 
                        ? "bg-violet-600 text-white shadow-sm" 
                        : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    <IconComp className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files by name..."
                className="w-full text-xs pl-9 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-violet-500 placeholder-zinc-400 transition-colors shadow-sm"
              />
              <Search className="h-4 w-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Core File Display Grid / List */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-violet-500 mb-3" />
              <p className="text-xs text-zinc-400 font-semibold">Scanning file cluster...</p>
            </div>
          ) : sortedFiles.length > 0 ? (
            <motion.div 
              layout
              className={
                viewMode === "grid" 
                  ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" 
                  : "flex flex-col gap-2.5"
              }
            >
              <AnimatePresence mode="popLayout">
                {sortedFiles.map(file => (
                  <FileCard
                    key={file.name}
                    file={file}
                    onDelete={handleDeleteFile}
                    onPreview={(f) => setPreviewFile(f)}
                    onShowQR={(f) => setQrFile(f)}
                    isSelected={selectedFileNames.includes(file.name)}
                    onToggleSelect={toggleSelectFile}
                    viewMode={viewMode}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center p-12 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl text-center py-16 shadow-sm"
            >
              <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 mb-4">
                <FolderOpen className="h-7 w-7" />
              </div>
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                {searchQuery || filterCategory !== "all" ? "No matching files" : "Vault is empty"}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs leading-relaxed">
                {searchQuery || filterCategory !== "all" 
                  ? "Try adjusting your search terms or category filters." 
                  : "Drag and drop your files above to store and share them immediately."}
              </p>
            </motion.div>
          )}

        </div>

      </main>

      {/* File Preview Modal Lightbox */}
      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        onDelete={handleDeleteFile}
      />

      {/* Standalone QR Code Modal */}
      {qrFile && (
        <QRCodeModal
          isOpen={!!qrFile}
          onClose={() => setQrFile(null)}
          fileName={qrFile.name}
          fileUrl={qrFile.url}
        />
      )}

      {/* Footer */}
      <footer className="mt-auto py-8 text-center text-[11px] text-zinc-400 dark:text-zinc-600 border-t border-zinc-200/60 dark:border-zinc-800/80 bg-white/50 dark:bg-zinc-950/50">
        <p>© 2026 ColdHole • High-Performance File Dump & Vault</p>
      </footer>

    </div>
  );
}
