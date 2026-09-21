import { useConfirmStock } from "@/features/products/api/useConfirmStock";
import { useProducts } from "@/features/products/api/useProducts";
import { CsvImporter } from "@/features/products/ui/CsvImporter";
import React from "react";

export const OwnerDashboard: React.FC = () => {
  const { data: products, isLoading, isError } = useProducts();
  const confirmStock = useConfirmStock();

  if (isLoading)
    return <div className="p-6 text-gray-500">Loading inventory...</div>;
  if (isError)
    return <div className="p-6 text-red-500">Failed to load inventory.</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Inventory Dashboard</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          + Add Product
        </button>
      </div>

      <div className="grid gap-4">
        {products?.length === 0 ? (
          <p className="text-gray-500">
            No products found. Start by adding one.
          </p>
        ) : (
          products?.map((product) => (
            <div
              key={product.id}
              className="border p-4 rounded-lg shadow-sm flex justify-between items-center bg-white"
            >
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  {product.name}
                  {!product.is_published && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                      Draft
                    </span>
                  )}
                </h3>
                <div className="text-sm text-gray-600 mt-1">
                  <p>
                    Quantity:{" "}
                    <span className="font-medium">{product.quantity}</span>
                  </p>
                  <p>
                    Last verified:{" "}
                    {new Date(product.last_verified_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => confirmStock.mutate(product.id)}
                disabled={confirmStock.isPending}
                className="bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded hover:bg-green-100 disabled:opacity-50 transition-colors"
              >
                {confirmStock.isPending
                  ? "Verifying..."
                  : "Confirm Still In Stock"}
              </button>
            </div>
          ))
        )}
      </div>

      <CsvImporter />
    </div>
  );
};
