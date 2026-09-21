import {
  ParsedProduct,
  useImportCsv,
} from "@/features/products/api/useImportCsv";
import Papa from "papaparse";
import React, { useState } from "react";

export const CsvImporter: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const importMutation = useImportCsv();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const parsedProducts: ParsedProduct[] = results.data.map(
            (row: any) => {
              const hasImage = !!row.image_url && row.image_url.trim() !== "";
              return {
                name: row.name,
                price: parseFloat(row.price),
                quantity: parseInt(row.quantity, 10),
                image_url: hasImage ? row.image_url.trim() : null,
                is_published: hasImage,
              };
            },
          );

          importMutation.mutate(parsedProducts);
        } catch {
          setError(
            "Failed to parse CSV. Ensure name, price, quantity, and image_url columns exist.",
          );
        }
      },
      error: () => {
        setError("Failed to read the file.");
      },
    });
  };

  return (
    <div className="mt-6 p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-2">
        Bulk Import Inventory (CSV)
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Upload a CSV with columns:{" "}
        <strong>name, price, quantity, image url</strong>. Products without an
        image url will automatically be saved as drafts.
      </p>

      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        disabled={importMutation.isPending}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 disabled:opacity-50"
        data-testid="csv-input"
      />

      {importMutation.isPending && (
        <p className="text-blue-600 mt-2 text-sm">Processing import...</p>
      )}
      {importMutation.isError && (
        <p className="text-red-600 mt-2 text-sm">Server error during import.</p>
      )}
      {importMutation.isSuccess && (
        <p className="text-green-600 mt-2 text-sm">Import successful!</p>
      )}
      {error && <p className="text-red-600 mt-2 text-sm">{error}</p>}
    </div>
  );
};
