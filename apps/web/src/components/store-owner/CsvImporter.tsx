import { ProductImportRow, importProducts } from "@/api/products";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";
import { ChangeEvent, useRef, useState } from "react";

const toProduct = (row: Record<string, string>): ProductImportRow => {
  const imageUrl = row.image_url?.trim() || null;
  const price = Number(row.price);
  const quantity = Number(row.quantity);

  if (
    !row.name?.trim() ||
    !Number.isFinite(price) ||
    !Number.isInteger(quantity)
  )
    throw new Error(
      "Each row needs a name, numeric price, and integer quantity.",
    );

  return {
    name: row.name.trim(),
    description: row.description?.trim() || "",
    price,
    quantity,
    image_url: imageUrl,
    is_published: Boolean(imageUrl),
  };
};

export default function CsvImporter() {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const importMutation = useMutation({
    mutationFn: importProducts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-products"] });
      if (inputRef.current) inputRef.current.value = "";
    },
  });

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const products = results.data.map(toProduct);
          if (!products.length)
            throw new Error("The CSV contains no products.");
          importMutation.mutate(products);
        } catch (parseError) {
          setError(
            parseError instanceof Error ? parseError.message : "Invalid CSV.",
          );
        }
      },
      error: () => setError("Unable to read the CSV file."),
    });
  };

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleUpload}
        disabled={importMutation.isPending}
        className="sr-only"
        id="store-owner-csv"
      />
      <label
        htmlFor="store-owner-csv"
        className="cursor-pointer rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        {importMutation.isPending ? "Importing..." : "Import CSV"}
      </label>
      {error && <span className="text-sm text-red-600">{error}</span>}
      {importMutation.isError && (
        <span className="text-sm text-red-600">Import failed.</span>
      )}
      {importMutation.isSuccess && (
        <span className="text-sm text-emerald-700">Imported.</span>
      )}
    </div>
  );
}
