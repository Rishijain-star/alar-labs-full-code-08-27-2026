import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { useBulkCreateLabsMutation } from "@/store/api/labApi";
import { toast } from "sonner";

export default function BulkLabUploadModal({ open, onOpenChange, onSuccess }) {
  const [csvText, setCsvText] = useState("");
  const [parsedLabs, setParsedLabs] = useState([]);
  const [parseErrors, setParseErrors] = useState([]);
  const [isParsed, setIsParsed] = useState(false);

  const [bulkCreateLabs, { isLoading }] = useBulkCreateLabsMutation();

  const sampleCSV = `title,slug,description,type,difficulty,duration,price,is_free,status
AWS S3 Bucket Security Lab,aws-s3-security-lab,"Hands-on lab configuring IAM policies and encryption for S3 buckets.",hands_on,easy,45,0,true,published
Kubernetes Pod Deployment Lab,k8s-pod-deployment,"Deploy and troubleshoot multi-container Kubernetes pods.",hands_on,medium,60,19.99,false,published
Docker Containerization Challenge,docker-container-challenge,"Build production-grade multi-stage Docker images.",hands_on,medium,60,0,true,published`;

  const downloadTemplate = () => {
    const blob = new Blob([sampleCSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "labs_bulk_upload_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSV = (rawText) => {
    const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      setParseErrors(["CSV must contain a header line and at least one data row."]);
      setParsedLabs([]);
      setIsParsed(false);
      return;
    }

    const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, "").toLowerCase());
    const labs = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const rowNum = i + 1;
      const values = lines[i].split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
      if (values.length < headers.length) {
        errors.push(`Row ${rowNum}: Insufficient columns`);
        continue;
      }

      const rowObj = {};
      headers.forEach((h, idx) => {
        rowObj[h] = values[idx] || "";
      });

      if (!rowObj.title) {
        errors.push(`Row ${rowNum}: Title is required`);
        continue;
      }

      labs.push({
        title: rowObj.title,
        slug: rowObj.slug || undefined,
        description: rowObj.description || "",
        type: rowObj.type || "hands_on",
        difficulty: rowObj.difficulty || "easy",
        time_limit_minutes: Number(rowObj.duration || rowObj.time_limit_minutes) || 60,
        price: Number(rowObj.price) || 0,
        is_free: rowObj.is_free === "true" || rowObj.is_free === "1" || Number(rowObj.price) === 0,
        status: rowObj.status || "published",
      });
    }

    setParsedLabs(labs);
    setParseErrors(errors);
    setIsParsed(true);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result || "";
      setCsvText(content);
      parseCSV(content);
    };
    reader.readAsText(file);
  };

  const handleTextChange = (e) => {
    const text = e.target.value;
    setCsvText(text);
    if (text.trim().length > 0) {
      parseCSV(text);
    } else {
      setIsParsed(false);
      setParsedLabs([]);
      setParseErrors([]);
    }
  };

  const handleSubmit = async () => {
    if (!parsedLabs.length) {
      toast.error("No valid labs to import!");
      return;
    }

    try {
      const res = await bulkCreateLabs({ items: parsedLabs }).unwrap();
      toast.success(res.message || `Successfully created ${res.data?.createdCount || parsedLabs.length} labs!`);
      if (onSuccess) onSuccess();
      onOpenChange(false);
      setCsvText("");
      setIsParsed(false);
    } catch (err) {
      toast.error(err?.data?.message || err?.message || "Bulk upload failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <FileSpreadsheet className="w-6 h-6 text-purple-600" />
            Bulk Upload Practical Labs (CSV / Excel)
          </DialogTitle>
          <DialogDescription>
            Import multiple hands-on or assessment labs at once using CSV formatting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="flex items-center justify-between bg-purple-50/80 p-3.5 rounded-lg border border-purple-200">
            <div className="text-xs text-purple-900">
              <span className="font-semibold block text-sm mb-0.5">Need a starting template?</span>
              Download our ready-to-use CSV template with sample fields.
            </div>
            <Button size="sm" variant="outline" onClick={downloadTemplate} className="gap-1.5 shrink-0 bg-white">
              <Download className="w-3.5 h-3.5" />
              Download Template
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Upload CSV File</Label>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Or Paste Raw CSV Data</Label>
            <Textarea
              rows={5}
              placeholder="title,slug,description,type,difficulty,duration,price,is_free,status&#10;My Hands-On Lab,my-hands-on-lab,Description,hands_on,easy,45,0,true,published"
              value={csvText}
              onChange={handleTextChange}
              className="font-mono text-xs"
            />
          </div>

          {isParsed && (
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800">
                  Validation Results:
                </span>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {parsedLabs.length} Valid Labs
                  </Badge>
                  {parseErrors.length > 0 && (
                    <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {parseErrors.length} Errors
                    </Badge>
                  )}
                </div>
              </div>

              {parseErrors.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-md space-y-1 text-xs text-rose-800 max-h-32 overflow-y-auto">
                  {parseErrors.map((err, idx) => (
                    <div key={idx}>• {err}</div>
                  ))}
                </div>
              )}

              {parsedLabs.length > 0 && (
                <div className="border rounded-md max-h-44 overflow-y-auto divide-y text-xs">
                  {parsedLabs.map((l, i) => (
                    <div key={i} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-slate-900 block">{l.title}</span>
                        <span className="text-slate-500 block text-[11px]">{l.description || "No description"}</span>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="capitalize text-[10px]">
                          {l.difficulty} • {l.time_limit_minutes}m • {l.is_free ? "FREE" : `$${l.price}`}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!parsedLabs.length || isLoading}
            className="gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Import {parsedLabs.length} Labs
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
