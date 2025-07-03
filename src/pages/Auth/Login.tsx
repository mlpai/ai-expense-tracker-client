import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { authAPI } from "../../lib/api";
import AuthLayout from "../../layouts/AuthLayout";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/dashboard";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError("");
    setIsLoading(true);

    try {
      const res = await authAPI.login(data);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Login failed. Please check your credentials."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="email" className="label">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="input"
              {...register("email")}
              placeholder="Enter your email"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-danger-600">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="input pr-10"
                {...register("password")}
                placeholder="Enter your password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-danger-600">
                {errors.password.message}
              </p>
            )}
          </div>

          {error && (
            <div className="bg-danger-50 border border-danger-200 text-danger-600 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary w-full flex justify-center items-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">
                Don't have an account?
              </span>
            </div>
          </div>

          <div className="mt-6">
            <Link
              to="/register"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Create new account
            </Link>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
