import { importProducts } from "@/api/products";
import { Button, Modal, useToast } from "@/components/ui";
import { PRODUCTS_KEY } from "@/constants";
import {
  CSV_MAX_ROWS,
  downloadCsvTemplate,
  parseProductCsv,
  type CsvIssue,
} from "@/features/products/lib/csv";
import { cn } from "@/lib/cn";
import type { ImportResult } from "@/types/products";
import { parseApiError } from "@nearcommerce/api";
import { useQueryClient } from "@tanstack/react-query";
import { ChangeEvent, useRef, useState } from "react";

type Report =
  | { kind: "success"; result: ImportResult | null; drafts: number }
  | {
      kind: "error";
      message: string;
      issues: CsvIssue[];
      totalProblems?: number;
    };

const MAX_LISTED_ISSUES = 50;

// Dual-mode CSV import (SRS 4.2.2): rows with a public image URL are published, rows
// without one become drafts. The same file creates new products and updates existing ones.
export default function CsvImporter() {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<Report | null>(null);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Clear the input so choosing the same file again (after fixing it) still fires onChange.
    const reset = () => {
      if (inputRef.current) inputRef.current.value = "";
    };
    if (!file) return;

    setBusy(true);
    try {
      const parsed = await parseProductCsv(file);
      if (parsed.issues.length > 0) {
        setReport({
          kind: "error",
          message:
            "Nothing was imported. Fix the problems below and upload the file again.",
          issues: parsed.issues,
        });
        return;
      }

      try {
        const result = await importProducts(parsed.rows);
        await queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
        setReport({
          kind: "success",
          result,
          drafts: parsed.rows.filter((r) => !r.is_published).length,
        });
        toast.success("Import finished");
      } catch (error) {
        const apiError = parseApiError(
          error,
          "Server error during import. Please try again.",
        );
        const totalProblems = (error as any)?.response?.data?.totalProblems;
        setReport({
          kind: "error",
          message: apiError.message,
          issues: apiError.details.map((d) => ({
            row: null,
            message: `${d.path}: ${d.message}`,
          })),
          totalProblems:
            typeof totalProblems === "number" ? totalProblems : undefined,
        });
      }
    } finally {
      reset();
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleUpload}
        disabled={busy}
        className="peer sr-only"
        id="store-owner-csv"
        data-testid="csv-input"
      />
      <label
        htmlFor="store-owner-csv"
        className={cn(
          "inline-flex h-10 cursor-pointer items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-card hover:bg-slate-50",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 peer-focus-visible:ring-offset-2",
          busy && "pointer-events-none opacity-60",
        )}
      >
        {busy ? "Importing…" : "Import CSV"}
      </label>
      <Button variant="ghost" size="sm" onClick={downloadCsvTemplate}>
        Download template
      </Button>

      <Modal
        open={report !== null}
        onClose={() => setReport(null)}
        title={report?.kind === "success" ? "Import complete" : "Import failed"}
        size="md"
        footer={
          <Button onClick={() => setReport(null)} data-autofocus>
            {report?.kind === "success" ? "Done" : "Close"}
          </Button>
        }
      >
        {report?.kind === "success" && (
          <div className="space-y-3 text-sm text-slate-700">
            {report.result ? (
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Rows" value={report.result.total} />
                <Stat label="Created" value={report.result.created} />
                <Stat label="Updated" value={report.result.updated} />
                <Stat
                  label="Duplicates merged"
                  value={report.result.duplicatesMerged}
                />
              </dl>
            ) : (
              <p>Your products were imported.</p>
            )}
            {report.drafts > 0 && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
                {report.drafts} product{report.drafts === 1 ? "" : "s"} had no
                image URL, so {report.drafts === 1 ? "it was" : "they were"}{" "}
                saved as a draft and stay hidden from shoppers until you add an
                image.
              </p>
            )}
          </div>
        )}

        {report?.kind === "error" && (
          <div className="space-y-3 text-sm text-slate-700">
            <p role="alert" className="font-medium text-red-800">
              {report.message}
            </p>
            {report.issues.length > 0 && (
              <>
                <ul className="max-h-64 list-disc space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 py-2 pl-7 pr-3">
                  {report.issues.slice(0, MAX_LISTED_ISSUES).map((issue, i) => (
                    <li key={i}>
                      {issue.row !== null && (
                        <span className="font-medium">Row {issue.row}: </span>
                      )}
                      {issue.message}
                    </li>
                  ))}
                </ul>
                {(report.totalProblems ?? report.issues.length) >
                  Math.min(report.issues.length, MAX_LISTED_ISSUES) && (
                  <p className="text-slate-500">
                    Showing the first{" "}
                    {Math.min(report.issues.length, MAX_LISTED_ISSUES)} of{" "}
                    {report.totalProblems ?? report.issues.length} problems.
                  </p>
                )}
              </>
            )}
            <p className="text-slate-500">
              Row numbers count products only, not the header. Up to{" "}
              {CSV_MAX_ROWS} rows per file.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums text-slate-900">
        {value}
      </dd>
    </div>
  );
}
