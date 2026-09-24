import { persistSession } from "@/session";
import { apiClient, UserRole } from "@nearcommerce/api";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface AuthResponse {
  access_token: string;
  user: { id: string; role: UserRole };
}

// Admin-only login page.  Accepts only SYSTEM_ADMIN credentials — any other
// role receives a clear "Unauthorised role" error rather than a silent failure.
export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data } = await apiClient.post<AuthResponse>("/auth/login", {
        email,
        password,
      });

      if (data.user.role !== UserRole.SYSTEM_ADMIN) {
        setError("Access denied. This portal is for System Admins only.");
        return;
      }

      persistSession(data.access_token);
      navigate("/dashboard", { replace: true });
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
          NearCommerce
        </p>
        <h1 className="mt-1 text-2xl font-bold">System Admin Portal</h1>
        <p className="mt-1 text-sm text-slate-400">
          Restricted access — admins only.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
