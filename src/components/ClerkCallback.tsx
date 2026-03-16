/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useClerk, useSession } from "@clerk/clerk-react";
import { MessageCircle, AlertCircle } from "lucide-react";

interface ClerkCallbackProps {
  onLoginSuccess: (token: string, user: any) => void;
}

const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "https://chatroom-h46w.onrender.com/api";

export default function ClerkCallback({ onLoginSuccess }: ClerkCallbackProps) {
  const { handleRedirectCallback } = useClerk();
  const { session, isLoaded } = useSession();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Completing sign in...");
  const handshakeDone = useRef(false);
  const exchangeDone = useRef(false);

  // Step 1: trigger the OAuth handshake once on mount
  useEffect(() => {
    if (handshakeDone.current) return;
    handshakeDone.current = true;
    console.log("[ClerkCallback] Starting handshake...");

    handleRedirectCallback({
      signInFallbackRedirectUrl: "/sso-callback",
      signUpFallbackRedirectUrl: "/sso-callback",
      signUpForceRedirectUrl: "/sso-callback",
      signInForceRedirectUrl: "/sso-callback",
    }).catch((err: any) => {
      console.log("[ClerkCallback] Handshake error:", err?.errors?.[0]?.code, err?.message);
    });
  }, []); // eslint-disable-line

  // Step 2: react when Clerk session becomes available
  useEffect(() => {
    console.log("[ClerkCallback] Session effect fired — isLoaded:", isLoaded, "| session:", !!session);
    if (!isLoaded) return;
    if (!session) return;
    if (exchangeDone.current) return;
    exchangeDone.current = true;

    const exchange = async () => {
      try {
        setStatus("Verifying your account...");

        const clerkToken = await session.getToken();
        console.log("[ClerkCallback] Got clerk token:", !!clerkToken);
        if (!clerkToken) throw new Error("Could not retrieve session token.");

        setStatus("Setting up your profile...");

        const response = await fetch(`${API_URL}/auth/clerk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clerkToken }),
        });

        console.log("[ClerkCallback] Backend response status:", response.status);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Authentication failed");
        }

        const data = await response.json();
        console.log("[ClerkCallback] Backend response data:", data);

        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        console.log("[ClerkCallback] Calling onLoginSuccess...");
        onLoginSuccess(data.token, data.user);
        console.log("[ClerkCallback] Navigating to /...");
        navigate("/");
      } catch (err: any) {
        console.error("[ClerkCallback] Exchange error:", err);
        setError(err.message || "Authentication failed. Please try again.");
        setTimeout(() => navigate("/"), 4000);
      }
    };

    exchange();
  }, [isLoaded, session]); // eslint-disable-line

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top Bar */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-semibold text-gray-900 tracking-tight">
            ChezaX
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center space-y-8">
          {!error ? (
            <>
              <div className="flex justify-center">
                <div className="w-16 h-16 relative">
                  <div className="absolute inset-0 border-4 border-gray-100 rounded-full" />
                  <div className="absolute inset-0 border-4 border-gray-900 rounded-full border-t-transparent animate-spin" />
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                  {status}
                </h1>
                <p className="text-sm text-gray-500">
                  This will only take a moment
                </p>
              </div>
              <div className="flex justify-center gap-1.5">
                <div
                  className="w-1.5 h-1.5 bg-gray-900 rounded-full animate-pulse"
                  style={{ animationDelay: "0ms" }}
                />
                <div
                  className="w-1.5 h-1.5 bg-gray-900 rounded-full animate-pulse"
                  style={{ animationDelay: "150ms" }}
                />
                <div
                  className="w-1.5 h-1.5 bg-gray-900 rounded-full animate-pulse"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-9 h-9 text-red-600" strokeWidth={2} />
                </div>
              </div>
              <div className="space-y-3">
                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                  Sign in failed
                </h1>
                <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                  <p className="text-sm text-red-900">{error}</p>
                </div>
                <p className="text-sm text-gray-500">Redirecting you back...</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <p className="text-center text-xs text-gray-500">
            Powered by{" "}
            <span className="font-medium text-yellow-500">Rasta Kadema</span>
          </p>
        </div>
      </div>
    </div>
  );
}