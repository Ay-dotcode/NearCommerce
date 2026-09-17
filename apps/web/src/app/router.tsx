import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { LoginForm } from '../features/auth/ui/LoginForm';

// ---------------------------------------------------------------------------
// Placeholder dashboard components — will be replaced in Tasks 4.2 & 4.3
// ---------------------------------------------------------------------------
const AdminDashboard = () => <div>Master Oversight Portal</div>;
const OwnerDashboard = () => <div>Inventory Dashboard</div>;

const router = createBrowserRouter([
  {
    path: '/',
    element: <LoginForm />,
  },
  {
    // System Admins → master oversight portal (Task 4.3)
    path: '/admin/dashboard',
    element: <AdminDashboard />,
  },
  {
    // Store Owners → inventory dashboard with X-Store-ID already set (Task 4.2)
    path: '/owner/dashboard',
    element: <OwnerDashboard />,
  },
]);

export const AppRouter = () => <RouterProvider router={router} />;
