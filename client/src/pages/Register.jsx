import { Sprout } from "lucide-react";
import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SEO from "../components/common/SEO";
import { AuthContext } from "../context/AuthContext";

export default function Register() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "farmer",
    location: "",
  });

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await register(
        formData.username.trim(),
        formData.email.trim().toLowerCase(),
        formData.password,
        formData.role,
        formData.location.trim(),
      );

      navigate("/thank-you");
    } catch (err) {
      if (err.code === "ERR_NETWORK" || !err.response) {
        setError(
          "Unable to reach the server. Check that the backend is running.",
        );
      } else {
        setError(
          err.response?.data?.message ||
            err.response?.data?.error ||
            "Registration failed. Try a different username or email.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <SEO
        title="Register | Acreage"
        description="Create your Acreage merchant or buyer account to start trading farm produce directly."
      />

      <div className="flex items-center space-x-2.5 mb-6">
        <div className="auth-brand-icon">
          <Sprout className="w-[22px] h-[22px] stroke-[2.5]" />
        </div>
        <span className="font-black text-xl tracking-wider text-slate-800 dark:text-white uppercase">
          ACREAGE
        </span>
      </div>

      <div className="auth-card">
        <h2 className="text-xl font-extrabold text-slate-800 dark:text-white text-center mb-1">
          Create Account
        </h2>
        <p className="text-xs text-slate-400 dark:text-slate-400 text-center mb-6">
          Join the digital marketplace connecting farmers and buyers
        </p>

        {error && (
          <div
            role="alert"
            data-testid="register-error"
            className="mb-4 text-xs font-semibold text-red-600 dark:text-rose-400 bg-red-50 dark:bg-rose-950/50 border border-red-100 dark:border-rose-900 p-3 rounded-xl text-center"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" data-testid="register-form">
          <div>
            <label
              htmlFor="register-username"
              className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Username
            </label>
            <input
              id="register-username"
              name="username"
              type="text"
              autoComplete="username"
              required
              disabled={isSubmitting}
              value={formData.username}
              placeholder="e.g. john_doe"
              data-testid="register-username-input"
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="register-email"
              className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Email Address
            </label>
            <input
              id="register-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={isSubmitting}
              value={formData.email}
              placeholder="e.g. john@farm.com"
              data-testid="register-email-input"
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="register-password"
              className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Password
            </label>
            <input
              id="register-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              disabled={isSubmitting}
              value={formData.password}
              placeholder="••••••••"
              data-testid="register-password-input"
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="register-location"
              className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Location (Town/City)
            </label>
            <input
              id="register-location"
              name="location"
              type="text"
              autoComplete="address-level2"
              required
              disabled={isSubmitting}
              value={formData.location}
              placeholder="e.g. Nakuru, Nairobi"
              data-testid="register-location-input"
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="register-role"
              className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Account Role
            </label>
            <select
              id="register-role"
              name="role"
              value={formData.role}
              disabled={isSubmitting}
              data-testid="register-role-select"
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all cursor-pointer"
            >
              <option value="farmer">
                Farmer (Sell Products & Track Logs)
              </option>
              <option value="buyer">Buyer (Order Fresh Farm Goods)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            data-testid="register-submit-button"
            className="w-full bg-green-600 hover:bg-green-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition shadow-md shadow-green-600/15 inline-flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Creating Account...
              </>
            ) : (
              "Register"
            )}
          </button>
        </form>

        <p className="mt-5 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Already registered?{" "}
          <Link
            to="/login"
            className="text-green-600 dark:text-emerald-400 font-bold hover:underline transition-all"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
