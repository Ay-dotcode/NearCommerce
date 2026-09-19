import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { LoginForm } from "../features/auth/ui/LoginForm";
import { OwnerDashboard } from "../features/products/ui/OwnerDashboard";

// ---------------------------------------------------------------------------
// Placeholder dashboard components — AdminDashboard will be replaced in Task 4.3
// ---------------------------------------------------------------------------
const AdminDashboard = () => <div>Master Oversight Portal</div>;

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <LoginForm />,
    },
    {
      // System Admins → master oversight portal (Task 4.3)
      path: "/admin/dashboard",
      element: <AdminDashboard />,
    },
    {
      // Store Owners → inventory dashboard with X-Store-ID already set (Task 4.2)
      path: "/owner/dashboard",
      element: <OwnerDashboard />, // Now points to the actual component
    },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    },
  },
);

export const AppRouter = () => <RouterProvider router={router} />;
