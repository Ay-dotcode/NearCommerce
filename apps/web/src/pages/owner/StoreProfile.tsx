import { apiClient } from "@nearcommerce/api";
import { Button } from "@nearcommerce/ui";
import { ErrorMessage, Field, Form, Formik } from "formik";
import { useEffect, useState } from "react";
import * as Yup from "yup";

const StoreSchema = Yup.object().shape({
  name: Yup.string().required("Store name is required"),
  address: Yup.string().required("Physical address is required"),
  timezone: Yup.string().required("IANA timezone is required"),
});

export const StoreProfile = ({ storeId }: { storeId?: string }) => {
  const [initialValues, setInitialValues] = useState({
    name: "",
    address: "",
    timezone: "UTC",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (storeId) {
      apiClient.get(`/stores/${storeId}`).then((res) => {
        setInitialValues({
          name: res.data.name,
          address: res.data.address,
          timezone: res.data.timezone,
        });
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [storeId]);

  if (loading)
    return <div className="p-6 text-gray-500">Loading profile data...</div>;

  return (
    <div className="max-w-2xl bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Store Profile</h2>
      <Formik
        initialValues={initialValues}
        enableReinitialize
        validationSchema={StoreSchema}
        onSubmit={async (values, { setSubmitting }) => {
          try {
            if (storeId) {
              await apiClient.put(`/stores/${storeId}`, values);
            } else {
              await apiClient.post(`/stores`, values);
            }
            alert("Store profile updated successfully.");
          } catch (error) {
            console.error("Failed to update store:", error);
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {({ isSubmitting }) => (
          <Form className="flex flex-col gap-5">
            <div>
              <label
                htmlFor="store-name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Store Name
              </label>
              <Field
                id="store-name"
                name="name"
                className="border border-gray-300 p-2 w-full rounded focus:ring-blue-500 focus:border-blue-500"
              />
              <ErrorMessage
                name="name"
                component="div"
                className="text-red-500 text-sm mt-1"
              />
            </div>
            <div>
              <label
                htmlFor="store-address"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Physical Address
              </label>
              <Field
                id="store-address"
                name="address"
                className="border border-gray-300 p-2 w-full rounded focus:ring-blue-500 focus:border-blue-500"
              />
              <ErrorMessage
                name="address"
                component="div"
                className="text-red-500 text-sm mt-1"
              />
            </div>
            <div>
              <label
                htmlFor="store-timezone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Timezone (IANA Format)
              </label>
              <Field
                id="store-timezone"
                name="timezone"
                placeholder="e.g., Europe/Istanbul"
                className="border border-gray-300 p-2 w-full rounded focus:ring-blue-500 focus:border-blue-500"
              />
              <ErrorMessage
                name="timezone"
                component="div"
                className="text-red-500 text-sm mt-1"
              />
            </div>
            <div className="pt-4 border-t border-gray-100">
              <Button type="submit" disabled={isSubmitting} variant="primary">
                {isSubmitting ? "Saving Profile..." : "Save Profile Changes"}
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};
