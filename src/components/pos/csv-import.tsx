"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  Check,
  X,
  AlertTriangle,
  Loader2,
  Download,
  HelpCircle,
} from "lucide-react";

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

interface CSVImportProps {
  onClose: () => void;
  onComplete: () => void;
}

export function CSVImport({ onClose, onComplete }: CSVImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      toast.error("Please select a CSV file");
      return;
    }

    setFile(selectedFile);
    setResult(null);

    // Parse preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").slice(0, 6); // First 5 rows + header
      const parsed = lines.map((line) =>
        line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""))
      );
      setPreview(parsed);
    };
    reader.readAsText(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/pos/products/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Import failed");
      }

      setResult(data);

      if (data.success > 0) {
        toast.success(`Imported ${data.success} products`);
        if (data.failed === 0) {
          onComplete();
        }
      }

      if (data.failed > 0) {
        toast.error(`${data.failed} products failed to import`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = [
      "sku",
      "name",
      "brand",
      "category",
      "retail_price",
      "wholesale_price",
      "size",
      "color",
      "stock_quantity",
      "description",
    ];
    const example = [
      "BIK-BLK-S",
      "Classic Bikini Top",
      "Beach Vibes",
      "Bikini Tops",
      "49.99",
      "25.00",
      "S",
      "Black",
      "25",
      "Classic triangle bikini top",
    ];

    const csv = [headers.join(","), example.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-500" />
            <h2 className="text-xl font-bold">Import Products</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {!result ? (
            <div className="space-y-6">
              {/* Template Download */}
              <div className="p-4 bg-muted rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <HelpCircle className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Need a template?</p>
                    <p className="text-sm text-muted-foreground">
                      Download our CSV template with required columns
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Template
                </Button>
              </div>

              {/* File Upload */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  file
                    ? "border-green-500 bg-green-500/10"
                    : "border-muted hover:border-primary"
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {file ? (
                  <div>
                    <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="font-medium">Drop CSV file here</p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse
                    </p>
                  </div>
                )}
              </div>

              {/* Preview */}
              {preview.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Preview</h3>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          {preview[0]?.map((header, i) => (
                            <th
                              key={i}
                              className="px-3 py-2 text-left font-medium"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.slice(1).map((row, i) => (
                          <tr key={i} className="border-t">
                            {row.map((cell, j) => (
                              <td
                                key={j}
                                className="px-3 py-2 truncate max-w-[150px]"
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Showing first 5 rows
                  </p>
                </div>
              )}

              {/* Required Columns */}
              <div className="text-sm">
                <h3 className="font-medium mb-2">Required Columns</h3>
                <div className="flex flex-wrap gap-2">
                  {["sku", "name", "retail_price", "stock_quantity"].map(
                    (col) => (
                      <Badge key={col} variant="secondary">
                        {col}
                      </Badge>
                    )
                  )}
                </div>
                <p className="text-muted-foreground mt-2">
                  Optional: brand, category, wholesale_price, size, color,
                  description
                </p>
              </div>
            </div>
          ) : (
            /* Results */
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
                  <Check className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-3xl font-bold text-green-500">
                    {result.success}
                  </p>
                  <p className="text-sm text-muted-foreground">Imported</p>
                </div>
                <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
                  <X className="h-8 w-8 mx-auto mb-2 text-red-500" />
                  <p className="text-3xl font-bold text-red-500">
                    {result.failed}
                  </p>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2 flex items-center gap-2 text-red-500">
                    <AlertTriangle className="h-4 w-4" />
                    Errors
                  </h3>
                  <div className="max-h-48 overflow-auto border rounded-lg p-3 bg-red-500/5">
                    {result.errors.map((error, i) => (
                      <p key={i} className="text-sm text-red-500 mb-1">
                        • {error}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                onClick={() => {
                  setFile(null);
                  setPreview([]);
                  setResult(null);
                }}
              >
                Import Another File
              </Button>
            </div>
          )}
        </div>

        <div className="p-4 border-t flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleUpload}
            disabled={!file || isUploading || !!result}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import Products
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
