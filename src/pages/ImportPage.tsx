import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import {
  FileUp,
  ArrowRight,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  COLUMN_LABELS,
  COLUMN_ALIASES,
  REQUIRED_IMPORT_FIELDS,
} from "@/lib/constants";

type ImportStep = "upload" | "map" | "preview" | "done";

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  // Detect delimiter
  const firstLine = lines[0];
  const delimiter = firstLine.includes("\t") ? "\t" : ",";

  // Parse with quote handling
  function parseLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || "";
    });
    return row;
  });

  return { headers, rows };
}

function autoMapColumns(
  csvHeaders: string[]
): Record<string, string> {
  const mappings: Record<string, string> = {};

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const csvHeader of csvHeaders) {
      const normalized = csvHeader.toLowerCase().trim();
      if (
        aliases.some(
          (alias) =>
            normalized === alias || normalized.replace(/[_-]/g, " ") === alias
        )
      ) {
        mappings[field] = csvHeader;
        break;
      }
    }
  }

  return mappings;
}

export function ImportPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importLeads = useMutation(api.leads.importLeads);

  const [step, setStep] = useState<ImportStep>("upload");
  const [fileName, setFileName] = useState("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { headers, rows } = parseCSV(text);

      if (headers.length === 0 || rows.length === 0) {
        toast.error("Could not parse CSV file");
        return;
      }

      setCsvHeaders(headers);
      setCsvRows(rows);

      // Auto-map columns
      const autoMappings = autoMapColumns(headers);
      setMappings(autoMappings);

      setStep("map");
      toast.success(
        `Parsed ${rows.length} rows with ${headers.length} columns`
      );
    };
    reader.readAsText(file);
  };

  const updateMapping = (field: string, csvColumn: string) => {
    setMappings((prev) => {
      const next = { ...prev };
      if (csvColumn === "__skip__") {
        delete next[field];
      } else {
        next[field] = csvColumn;
      }
      return next;
    });
  };

  const missingRequired = REQUIRED_IMPORT_FIELDS.filter(
    (f) => !mappings[f]
  );

  const getOpt = (row: Record<string, string>, field: string): string | undefined => {
    if (!mappings[field]) return undefined;
    const val = row[mappings[field]];
    return val && val.trim() ? val.trim() : undefined;
  };

  const parseBool = (val: string | undefined): boolean | undefined => {
    if (!val) return undefined;
    const lower = val.toLowerCase().trim();
    if (lower === "true" || lower === "yes" || lower === "1") return true;
    if (lower === "false" || lower === "no" || lower === "0") return false;
    return undefined;
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      // Import in batches of 500 to avoid mutation size limits
      const BATCH_SIZE = 500;
      let totalImported = 0;
      let totalSkipped = 0;

      for (let i = 0; i < csvRows.length; i += BATCH_SIZE) {
        const batch = csvRows.slice(i, i + BATCH_SIZE);
        const leads = batch.map((row) => ({
          externalId: getOpt(row, "externalId"),
          businessName: row[mappings.businessName] || "",
          contactName: row[mappings.contactName] || "",
          phone: row[mappings.phone] || "",
          phone2: getOpt(row, "phone2"),
          email: getOpt(row, "email"),
          address: row[mappings.address] || "",
          address2: getOpt(row, "address2"),
          city: row[mappings.city] || "",
          state: row[mappings.state] || "",
          zip: row[mappings.zip] || "",
          rep: getOpt(row, "rep"),
          leadRep: getOpt(row, "leadRep"),
          saleDate: getOpt(row, "saleDate"),
          paymentCleared: getOpt(row, "paymentCleared"),
          pipelineStatus: getOpt(row, "pipelineStatus"),
          leadTemperature: getOpt(row, "leadTemperature"),
          language: getOpt(row, "language"),
          callAttempts: mappings.callAttempts ? parseInt(row[mappings.callAttempts]) || 0 : undefined,
          lastCallAt: getOpt(row, "lastCallAt"),
          callable: mappings.callable ? parseBool(row[mappings.callable]) : undefined,
          badPhone: mappings.badPhone ? parseBool(row[mappings.badPhone]) : undefined,
          currentProducts: mappings.currentProducts
            ? (row[mappings.currentProducts] || "")
                .split(/,(?=\s*[A-Z])/)
                .map((s: string) => s.trim())
                .filter(Boolean)
            : [],
          activePackages: getOpt(row, "activePackages"),
          fgStatus: getOpt(row, "fgStatus"),
          fgDepartment: getOpt(row, "fgDepartment"),
          fastgemId: getOpt(row, "fastgemId"),
          lat: getOpt(row, "lat"),
          lng: getOpt(row, "lng"),
          createdAtSource: getOpt(row, "createdAtSource"),
          updatedAtSource: getOpt(row, "updatedAtSource"),
        }));

        const batchName = i === 0 ? fileName : `${fileName} (batch ${Math.floor(i/BATCH_SIZE) + 1})`;
        const res = await importLeads({ leads, fileName: batchName });
        totalImported += res.imported;
        totalSkipped += res.skipped;
      }

      setResult({ imported: totalImported, skipped: totalSkipped });
      setStep("done");
      toast.success(
        `Imported ${totalImported.toLocaleString()} leads${totalSkipped > 0 ? `, skipped ${totalSkipped}` : ""}`
      );
    } catch (e) {
      toast.error(
        `Import failed: ${e instanceof Error ? e.message : "Unknown error"}`
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import Leads</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Upload a CSV file from your Lead Portal export
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(["upload", "map", "preview", "done"] as ImportStep[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && (
              <div className="w-8 h-px bg-border" />
            )}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                step === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}. {s === "upload" ? "Upload" : s === "map" ? "Map" : s === "preview" ? "Preview" : "Done"}
            </div>
          </div>
        ))}
      </div>

      {/* Upload Step */}
      {step === "upload" && (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="py-16">
            <div className="text-center">
              <FileUp className="size-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">Upload CSV File</h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
                Export your leads from the Lead Portal as CSV and upload them
                here. We'll help you map the columns to the right fields.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button onClick={() => fileInputRef.current?.click()}>
                <FileUp className="size-4 mr-2" />
                Choose CSV File
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Map Step */}
      {step === "map" && (
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Map CSV Columns</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  <FileText className="size-3 inline mr-1" />
                  {fileName} · {csvRows.length} rows · {csvHeaders.length}{" "}
                  columns
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep("upload")}
              >
                <RotateCcw className="size-3 mr-1" />
                Start Over
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.keys(COLUMN_LABELS).map((field) => (
                <div key={field} className="space-y-1.5">
                  <Label className="text-xs">
                    {COLUMN_LABELS[field]}
                    {REQUIRED_IMPORT_FIELDS.includes(field) &&
                      !mappings[field] && (
                        <span className="text-destructive ml-1">⚠</span>
                      )}
                  </Label>
                  <Select
                    value={mappings[field] || "__skip__"}
                    onValueChange={(v) => updateMapping(field, v)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Skip" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__skip__">— Skip —</SelectItem>
                      {csvHeaders.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                          {csvRows[0]?.[h] && (
                            <span className="text-muted-foreground ml-2">
                              ({csvRows[0][h].substring(0, 30)})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {missingRequired.length > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Missing required fields:</p>
                  <p>
                    {missingRequired
                      .map((f) => COLUMN_LABELS[f])
                      .join(", ")}
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <Button
                onClick={() => setStep("preview")}
                disabled={missingRequired.length > 0}
              >
                Preview Import
                <ArrowRight className="size-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Step */}
      {step === "preview" && (
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Preview Import</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Showing first 10 of {csvRows.length} rows
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep("map")}
                >
                  Back to Mapping
                </Button>
                <Button onClick={handleImport} disabled={importing}>
                  {importing
                    ? "Importing..."
                    : `Import ${csvRows.length} Leads`}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Business</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Products</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvRows.slice(0, 10).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm font-medium">
                        {row[mappings.businessName] || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {row[mappings.contactName] || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {row[mappings.address]}, {row[mappings.city]},{" "}
                        {row[mappings.state]} {row[mappings.zip]}
                      </TableCell>
                      <TableCell className="text-sm">
                        {row[mappings.phone] || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {mappings.currentProducts
                          ? row[mappings.currentProducts]?.substring(0, 30)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Done Step */}
      {step === "done" && result && (
        <Card className="border-border/50">
          <CardContent className="py-12">
            <div className="text-center">
              <CheckCircle className="size-16 mx-auto mb-4 text-green-500" />
              <h3 className="text-xl font-semibold mb-2">Import Complete!</h3>
              <p className="text-muted-foreground mb-6">
                Successfully imported{" "}
                <span className="font-semibold text-foreground">
                  {result.imported.toLocaleString()}
                </span>{" "}
                leads
                {result.skipped > 0 && `, skipped ${result.skipped}`}
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep("upload");
                    setCsvRows([]);
                    setCsvHeaders([]);
                    setMappings({});
                  }}
                >
                  Import More
                </Button>
                <Button onClick={() => navigate("/leads")}>
                  View Leads
                  <ArrowRight className="size-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
