import { useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useBulkUploadQuestionsMutation } from "@/store/api/examTopicsApi";

export default function BulkQuestionUploadModal({
  open,
  onOpenChange,
  onQuestionsImported,
}) {
  const { toast } = useToast();
  const [csvText, setCsvText] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [templateType, setTemplateType] = useState("all");
  const [templateFormat, setTemplateFormat] = useState("xlsx");
  const [previewResult, setPreviewResult] = useState(null);
  const [parsedRows, setParsedRows] = useState(null);

  const [bulkUpload, { isLoading }] = useBulkUploadQuestionsMutation();

  const handleDownloadTemplate = () => {
    let rowsData = [];
    const filename = `exam_questions_template_${templateType}.${templateFormat}`;

    if (templateType === "multiple_choice") {
      rowsData = [
        {
          "Question": "Which AWS service is used to store scalable object data?",
          "Type": "multiple_choice",
          "Option A": "Amazon S3",
          "Option B": "Amazon EC2",
          "Option C": "Amazon RDS",
          "Option D": "AWS Lambda",
          "Correct Answer": "Option A",
          "Explanation": "Amazon Simple Storage Service (S3) provides highly durable object storage."
        },
        {
          "Question": "What is the primary function of Amazon CloudFront?",
          "Type": "multiple_choice",
          "Option A": "Content Delivery Network (CDN)",
          "Option B": "Relational Database",
          "Option C": "DNS Routing",
          "Option D": "Virtual Private Network",
          "Correct Answer": "Option A",
          "Explanation": "CloudFront is a web service that speeds up distribution of content."
        },
        {
          "Question": "Which database is a fully managed NoSQL service in AWS?",
          "Type": "multiple_choice",
          "Option A": "Amazon DynamoDB",
          "Option B": "Amazon Redshift",
          "Option C": "Amazon Aurora",
          "Option D": "Amazon ElastiCache",
          "Correct Answer": "Option A",
          "Explanation": "DynamoDB is a fast, flexible NoSQL database service."
        },
        {
          "Question": "What AWS tool is used to track user activity and API calls?",
          "Type": "multiple_choice",
          "Option A": "AWS CloudTrail",
          "Option B": "Amazon CloudWatch",
          "Option C": "AWS Config",
          "Option D": "AWS Trusted Advisor",
          "Correct Answer": "Option A",
          "Explanation": "CloudTrail records AWS account activity and events."
        },
        {
          "Question": "Sample Multiple Choice Question (Edit or duplicate this row)",
          "Type": "multiple_choice",
          "Option A": "Sample Option A",
          "Option B": "Sample Option B",
          "Option C": "Sample Option C",
          "Option D": "Sample Option D",
          "Correct Answer": "Option A",
          "Explanation": "Add explanation here."
        }
      ];
    } else if (templateType === "true_false") {
      rowsData = [
        {
          "Question": "Amazon DynamoDB is a fully managed NoSQL database service.",
          "Type": "true_false",
          "Option A": "True",
          "Option B": "False",
          "Option C": "",
          "Option D": "",
          "Correct Answer": "True",
          "Explanation": "DynamoDB is a fast and flexible NoSQL database service."
        },
        {
          "Question": "AWS IAM permissions apply globally across all AWS regions by default.",
          "Type": "true_false",
          "Option A": "True",
          "Option B": "False",
          "Option C": "",
          "Option D": "",
          "Correct Answer": "True",
          "Explanation": "AWS IAM is a global service."
        },
        {
          "Question": "Amazon S3 limits total storage capacity per account to 1 Terabyte.",
          "Type": "true_false",
          "Option A": "True",
          "Option B": "False",
          "Option C": "",
          "Option D": "",
          "Correct Answer": "False",
          "Explanation": "Amazon S3 provides virtually unlimited total storage."
        }
      ];
    } else if (templateType === "fill_in_blank") {
      rowsData = [
        {
          "Question": "AWS ________ is a serverless, event-driven compute service.",
          "Type": "fill_in_blank",
          "Option A": "",
          "Option B": "",
          "Option C": "",
          "Option D": "",
          "Correct Answer": "Lambda",
          "Explanation": "AWS Lambda lets you run code without provisioning servers."
        },
        {
          "Question": "Amazon ________ is a managed relational database service.",
          "Type": "fill_in_blank",
          "Option A": "",
          "Option B": "",
          "Option C": "",
          "Option D": "",
          "Correct Answer": "RDS",
          "Explanation": "Amazon RDS simplifies relational database setup."
        }
      ];
    } else {
      // Mixed ("all")
      rowsData = [
        {
          "Question": "Which AWS service is used to store scalable object data?",
          "Type": "multiple_choice",
          "Option A": "Amazon S3",
          "Option B": "Amazon EC2",
          "Option C": "Amazon RDS",
          "Option D": "AWS Lambda",
          "Correct Answer": "Option A",
          "Explanation": "S3 provides scalable object storage."
        },
        {
          "Question": "Amazon DynamoDB is a fully managed NoSQL database service.",
          "Type": "true_false",
          "Option A": "True",
          "Option B": "False",
          "Option C": "",
          "Option D": "",
          "Correct Answer": "True",
          "Explanation": "DynamoDB is a NoSQL database service."
        },
        {
          "Question": "AWS ________ is a serverless, event-driven compute service.",
          "Type": "fill_in_blank",
          "Option A": "",
          "Option B": "",
          "Option C": "",
          "Option D": "",
          "Correct Answer": "Lambda",
          "Explanation": "AWS Lambda runs code without server management."
        },
        {
          "Question": "What is the function of Amazon Route 53?",
          "Type": "multiple_choice",
          "Option A": "Domain Name System (DNS) web service",
          "Option B": "Virtual Private Cloud Router",
          "Option C": "Load Balancer",
          "Option D": "Database Engine",
          "Correct Answer": "Option A",
          "Explanation": "Route 53 provides highly available DNS routing."
        }
      ];
    }

    if (templateFormat === "xlsx") {
      const worksheet = XLSX.utils.json_to_sheet(rowsData);
      
      // Auto-fit column widths
      worksheet["!cols"] = [
        { wch: 55 }, // Question
        { wch: 18 }, // Type
        { wch: 25 }, // Option A
        { wch: 25 }, // Option B
        { wch: 25 }, // Option C
        { wch: 25 }, // Option D
        { wch: 18 }, // Correct Answer
        { wch: 60 }, // Explanation
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Questions");
      XLSX.writeFile(workbook, filename);
    } else {
      const worksheet = XLSX.utils.json_to_sheet(rowsData);
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
      const blob = new Blob([csvOutput], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    toast({
      title: "Template Downloaded",
      description: `Downloaded ${filename} for ${templateType.replace("_", " ")} questions.`,
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    const reader = new FileReader();

    if (isExcel) {
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          const csvFormatted = XLSX.utils.sheet_to_csv(worksheet);

          // Normalize row keys case-insensitively
          const normalizedRows = jsonRows.map((r) => {
            const norm = {};
            Object.keys(r).forEach((k) => {
              if (k) norm[k.trim().toLowerCase()] = r[k];
            });
            return norm;
          });

          setParsedRows(normalizedRows);
          setCsvText(csvFormatted);
          setPreviewResult(null);

          toast({
            title: "Excel File Loaded",
            description: `Successfully loaded ${jsonRows.length} rows from ${file.name}. Click Validate & Preview.`,
          });
        } catch (err) {
          toast({
            title: "Excel Read Error",
            description: "Failed to parse Excel file. Please ensure valid .xlsx format.",
            variant: "destructive",
          });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (evt) => {
        const content = evt.target?.result;
        if (typeof content === "string") {
          setCsvText(content);
          setParsedRows(null);
          setPreviewResult(null);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleProcessCSV = async () => {
    const payload = parsedRows && parsedRows.length > 0
      ? { rows: parsedRows }
      : { csvContent: csvText };

    if (!csvText.trim() && (!parsedRows || parsedRows.length === 0)) {
      toast({
        title: "No Content",
        description: "Please select a file or paste question data.",
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await bulkUpload(payload).unwrap();
      const parsed = res?.data || res;
      setPreviewResult(parsed);

      if (parsed?.questions?.length) {
        toast({
          title: "Data Validated",
          description: `Successfully parsed ${parsed.questions.length} questions. Review preview below.`,
        });
      } else {
        toast({
          title: "Validation Issues",
          description: "No valid questions were parsed from the input.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Bulk upload failed",
        description: err?.data?.message || "Error processing question data.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveQuestionFromPreview = (index) => {
    if (!previewResult) return;
    const updated = [...previewResult.questions];
    updated.splice(index, 1);
    setPreviewResult({
      ...previewResult,
      questions: updated,
    });
  };

  const handleConfirmImport = () => {
    if (!previewResult?.questions?.length) return;
    onQuestionsImported(previewResult.questions);
    toast({
      title: "Questions Imported",
      description: `Added ${previewResult.questions.length} questions to your draft set.`,
    });
    setCsvText("");
    setSelectedFileName("");
    setPreviewResult(null);
    setParsedRows(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Bulk Question Upload (CSV / Excel)
          </DialogTitle>
          <DialogDescription>
            Import multiple questions at once using Excel (`.xlsx`, `.xls`) or CSV (`.csv`) files.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Template Download Section with Select Dropdowns */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 dark:from-emerald-950/30 dark:to-teal-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">
                  Download Ready-To-Use Excel Template
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Select question type and file format to download a pre-formatted Excel template.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <Label className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300 mb-1 block">
                  Question Type
                </Label>
                <Select value={templateType} onValueChange={setTemplateType}>
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types (Mixed Sample)</SelectItem>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="true_false">True / False</SelectItem>
                    <SelectItem value="fill_in_blank">Fill in the Blank</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300 mb-1 block">
                  File Format
                </Label>
                <Select value={templateFormat} onValueChange={setTemplateFormat}>
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue placeholder="Format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                    <SelectItem value="csv">CSV (.csv)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  className="w-full h-9 border-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-xs gap-1.5 font-medium"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  Download Template
                </Button>
              </div>
            </div>
          </div>

          {/* File Picker */}
          <div>
            <Label className="text-xs font-semibold mb-2 block">Upload CSV or Excel File</Label>
            <div className="flex items-center gap-3">
              <label className="flex-1 flex items-center justify-center gap-2.5 p-4 border-2 border-dashed rounded-xl cursor-pointer hover:border-emerald-500 bg-slate-50 dark:bg-slate-900/60 transition-colors">
                <Upload className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div className="text-center sm:text-left">
                  <span className="text-xs font-semibold text-foreground block">
                    {selectedFileName ? selectedFileName : "Choose Excel (.xlsx / .xls) or CSV file..."}
                  </span>
                  <span className="text-[11px] text-muted-foreground block">
                    Supported formats: .xlsx, .xls, .csv
                  </span>
                </div>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.txt"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>

          {/* Raw Content Area */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs font-semibold">Parsed Content / CSV Data</Label>
              {parsedRows && (
                <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-300">
                  Excel Loaded: {parsedRows.length} Rows
                </Badge>
              )}
            </div>
            <Textarea
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                setParsedRows(null);
                setPreviewResult(null);
              }}
              placeholder={`Question,Type,Option A,Option B,Option C,Option D,Correct Answer,Explanation\n"What is S3?","multiple_choice","Object Storage","Compute Service","Database","CDN","Option A","S3 is scalable object storage"`}
              rows={4}
              className="font-mono text-xs"
            />
          </div>

          {/* Action to parse/validate */}
          {!previewResult && (
            <Button
              type="button"
              onClick={handleProcessCSV}
              disabled={isLoading || (!csvText.trim() && (!parsedRows || parsedRows.length === 0))}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            >
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Validate & Preview Questions
            </Button>
          )}

          {/* Validation & Preview Result */}
          {previewResult && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <CheckCircle className="w-4.5 h-4.5 text-emerald-500" />
                  Validation Summary
                </h4>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-600 text-white font-medium text-xs">
                    {previewResult.questions?.length || 0} Questions Ready to Import
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setPreviewResult(null)}
                    className="text-xs text-muted-foreground underline"
                  >
                    Re-validate
                  </Button>
                </div>
              </div>

              {previewResult.errors?.length > 0 && (
                <div className="p-3.5 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 text-xs text-red-700 dark:text-red-300 space-y-1.5">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-500" /> Validation Warnings ({previewResult.errors.length}):
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 max-h-24 overflow-y-auto font-mono text-[11px]">
                    {previewResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Interactive Preview of Parsed Questions */}
              {previewResult.questions?.length > 0 && (
                <div className="space-y-2.5 max-h-60 overflow-y-auto border rounded-xl p-3 bg-slate-50 dark:bg-slate-900/50">
                  {previewResult.questions.map((q, i) => (
                    <div key={i} className="text-xs p-3 rounded-lg border bg-background space-y-2 shadow-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-sm flex items-center gap-2">
                          <span className="text-primary font-bold">Q{i + 1}.</span>
                          <span>{q.question}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="outline" className="text-[10px] uppercase font-mono bg-muted">
                            {q.type?.replace("_", " ")}
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveQuestionFromPreview(i)}
                            title="Remove question from import"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Options rendering */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        {q.options?.map((opt, optIdx) => {
                          const isCorrect = Array.isArray(q.correctOptionIds)
                            ? q.correctOptionIds.includes(opt.id)
                            : q.correctOptionId === opt.id;

                          return (
                            <div
                              key={optIdx}
                              className={`p-1.5 px-2.5 rounded text-xs flex items-center justify-between border ${
                                isCorrect
                                  ? "bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200 font-medium"
                                  : "bg-muted/40 border-transparent text-muted-foreground"
                              }`}
                            >
                              <span>{opt.text}</span>
                              {isCorrect && (
                                <Badge className="text-[9px] bg-emerald-600 hover:bg-emerald-600 text-white h-4 px-1.5">
                                  Correct
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {q.explanation && (
                        <p className="text-[11px] text-muted-foreground italic pt-1 border-t">
                          💡 <span className="font-medium">Explanation:</span> {q.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          {previewResult?.questions?.length > 0 && (
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium"
              onClick={handleConfirmImport}
            >
              <CheckCircle className="w-4 h-4" />
              Import {previewResult.questions.length} Valid Questions
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
