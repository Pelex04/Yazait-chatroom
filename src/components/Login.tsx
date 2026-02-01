/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { authAPI } from "../services/api";
import { LogIn, UserPlus } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaFacebookF } from "react-icons/fa";

interface LoginProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role] = useState<"student" | "teacher">("student");
  const [subscription] = useState<"basic" | "premium">("premium");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = isRegister
        ? await authAPI.register({ email, password, name, role, subscription })
        : await authAPI.login(email, password);

      localStorage.setItem("token", result.token);
      onLoginSuccess(result.token, result.user);
    } catch (err: any) {
      setError(err.response?.data?.error || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-[Inter,system-ui,Segoe_UI,Roboto] flex items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Logo */}
        <div className="mb-4">
          <div className="bg-slate-900 text-white px-4 py-1.5 rounded-md text-sm font-semibold tracking-wide">
            CHEZAX <span className="text-yellow-400">MALAWI</span>
          </div>
        </div>

        {/* Card */}
        <div className="w-full bg-white rounded-xl shadow-md border border-gray-100 px-7 py-6">
          <h1 className="text-xl font-semibold text-gray-900 text-center mb-0.5">
            {isRegister ? "Create Account" : "Sign In"}
          </h1>
          <p className="text-xs text-gray-500 text-center mb-4">
            Welcome back! Please enter your details
          </p>

          {error && (
            <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-400 outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Email or Phone
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-400 outline-none"
              />
              {!isRegister && (
                <div className="text-right mt-0.5">
                  <button
                    type="button"
                    className="text-[11px] text-yellow-500 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-2 rounded-md transition flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <span className="animate-pulse">Please wait...</span>
              ) : (
                <>
                  {isRegister ? <UserPlus size={16} /> : <LogIn size={16} />}
                  <span>{isRegister ? "Create Account" : "Login"}</span>
                </>
              )}
            </button>
          </form>

          {/* Social */}
          {!isRegister && (
            <>
              <div className="my-4 flex items-center gap-2">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-[11px] text-gray-400">
                  or continue with
                </span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button className="flex items-center justify-center gap-2 border border-gray-300 rounded-md py-1.5 text-xs hover:bg-gray-50">
                  <FcGoogle size={16} />
                  Google
                </button>
                <button className="flex items-center justify-center gap-2 border border-gray-300 rounded-md py-1.5 text-xs hover:bg-gray-50 text-blue-600">
                  <FaFacebookF size={14} />
                  Facebook
                </button>
              </div>
            </>
          )}

          <div className="text-center mt-4">
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-xs text-gray-600 hover:underline"
            >
              {isRegister
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up now"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-[11px] text-gray-400 text-center mt-4">
          Powered by{" "}
          <span className="font-medium text-yellow-500">Rasta Kadema</span> —
          All rights reserved
        </p>
      </div>
    </div>
  );
}
