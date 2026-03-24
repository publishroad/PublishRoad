"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface ImportResult {
  imported: number;
  errors: Array<{ row: number; message: string }>;
}

export function BulkImportModal() {
  const [open, setOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith(".csv") || f.name.endsWith(".json"))) {
      setFile(f);
    }
  }

  async function handleUpload() {
    if (!file) return;
    setIsUploading(true);
    setProgress(10);

    const formData = new FormData();
    formData.append("file", file);

    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 10, 85));
    }, 500);

    const res = await fetch("/api/admin/websites/bulk-import", {
      method: "POST",
      body: formData,
    });

    clearInterval(interval);
    setProgress(100);
    setIsUploading(false);

    const data = await res.json().catch(() => ({ imported: 0, errors: [{ row: 0, message: "Unknown error" }] }));
    setResult(data);
  }

  function handleClose() {
    setOpen(false);
    setFile(null);
    setResult(null);
    setProgress(0);
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        Bulk Import
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-navy">Bulk Import Websites</h2>
          <button
            onClick={handleClose}
            className="text-medium-gray hover:text-dark-gray"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {result ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-success font-medium">
                {result.imported} websites imported successfully
              </p>
            </div>
            {result.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-error">
                  {result.errors.length} errors:
                </p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-medium-gray">
                      Row {err.row}: {err.message}
                    </p>
                  ))}
                </div>
              </div>
            )}
            <Button className="w-full bg-navy hover:bg-blue" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-medium-gray bg-ice-blue rounded-lg p-3">
              <p className="font-medium text-navy mb-1">CSV/JSON format:</p>
              <p className="font-mono text-xs">
                name, url, type, da, pa, spam_score, traffic, country_slug, category_slug, tags, description
              </p>
            </div>

            {!file ? (
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? "border-blue bg-light-blue"
                    : "border-border-gray hover:border-navy"
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                <svg className="w-8 h-8 text-medium-gray mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-medium-gray">
                  Drag & drop CSV or JSON file here, or click to browse
                </p>
                <p className="text-xs text-medium-gray mt-1">Max 10MB</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setFile(f);
                  }}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-ice-blue rounded-lg p-3">
                  <svg className="w-5 h-5 text-navy shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy truncate">{file.name}</p>
                    <p className="text-xs text-medium-gray">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="text-medium-gray hover:text-error text-xs"
                  >
                    Remove
                  </button>
                </div>

                {isUploading && (
                  <div className="space-y-1">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-medium-gray text-center">
                      Importing... {progress}%
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-navy hover:bg-blue"
                    onClick={handleUpload}
                    disabled={isUploading}
                  >
                    {isUploading ? "Importing..." : "Start Import"}
                  </Button>
                  <Button variant="outline" onClick={() => setFile(null)} disabled={isUploading}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
