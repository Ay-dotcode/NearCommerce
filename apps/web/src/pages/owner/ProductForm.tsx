import { apiClient } from "@nearcommerce/api";
import { Button } from "@nearcommerce/ui";
import { ErrorMessage, Field, Form, Formik } from "formik";
import * as Yup from "yup";

const ProductSchema = Yup.object().shape({
  name: Yup.string().required("Product name is required"),
  price: Yup.number().positive("Price must be positive").required("Required"),
  quantity: Yup.number()
    .integer()
    .min(0, "Cannot be negative")
    .required("Required"),
  description: Yup.string(),
});

export const ProductForm = ({
  storeId,
  onSuccess,
}: {
  storeId: string;
  onSuccess: () => void;
}) => {
  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold mb-4 text-gray-900">Add New Product</h2>
      <Formik
        initialValues={{ name: "", price: 0, quantity: 0, description: "" }}
        validationSchema={ProductSchema}
        onSubmit={async (values, { setSubmitting, resetForm }) => {
          try {
            await apiClient.post(`/stores/${storeId}/products`, values);
            resetForm();
            onSuccess();
          } catch (error) {
            console.error("Failed to create product:", error);
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {({ isSubmitting }) => (
          <Form className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="product-name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Product Name
              </label>
              <Field
                id="product-name"
                name="name"
                className="border border-gray-300 p-2 w-full rounded focus:ring-blue-500 focus:border-blue-500"
              />
              <ErrorMessage
                name="name"
                component="div"
                className="text-red-500 text-sm mt-1"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label
                  htmlFor="product-price"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Price ($)
                </label>
                <Field
                  id="product-price"
                  name="price"
                  type="number"
                  step="0.01"
                  className="border border-gray-300 p-2 w-full rounded focus:ring-blue-500 focus:border-blue-500"
                />
                <ErrorMessage
                  name="price"
                  component="div"
                  className="text-red-500 text-sm mt-1"
                />
              </div>
              <div className="flex-1">
                <label
                  htmlFor="product-quantity"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Quantity in Stock
                </label>
                <Field
                  id="product-quantity"
                  name="quantity"
                  type="number"
                  className="border border-gray-300 p-2 w-full rounded focus:ring-blue-500 focus:border-blue-500"
                />
                <ErrorMessage
                  name="quantity"
                  component="div"
                  className="text-red-500 text-sm mt-1"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="product-description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description
              </label>
              <Field
                id="product-description"
                name="description"
                as="textarea"
                rows={3}
                className="border border-gray-300 p-2 w-full rounded focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              variant="primary"
              className="w-full mt-2"
            >
              {isSubmitting ? "Saving..." : "Save Product"}
            </Button>
          </Form>
        )}
      </Formik>
    </div>
  );
};
