// ForgotPassword.tsx
// Three-stage flow: Request → Sent → Reset
// Matches Login.tsx exactly: white bg, slate-900 brand, yellow-400 accents, Tailwind
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { authAPI } from "../services/api";

// ── Icons (inline SVG — no extra deps) ────────────────────────────────────
const IconMail = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);
const IconArrowLeft = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 5l-7 7 7 7"/>
  </svg>
);
const IconLock = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const IconEye = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const IconEyeOff = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
const IconCheck = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconLoader = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    style={{ animation: "cx-spin 0.8s linear infinite" }}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);
const IconInbox = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
  </svg>
);
const IconShieldCheck = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>
);

// ── Types ─────────────────────────────────────────────────────────────────
type Stage = "request" | "sent" | "reset" | "done";

interface ForgotPasswordProps {
  onBack: () => void;
  // Now receives the fresh token + user so Login.tsx can log the user in directly
  onResetSuccess: (token: string, user: any) => void;
}

// ── Password strength ──────────────────────────────────────────────────────
function getStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Weak", color: "#EF4444" };
  if (score <= 2) return { score, label: "Fair", color: "#F97316" };
  if (score <= 3) return { score, label: "Good", color: "#EAB308" };
  return { score, label: "Strong", color: "#22C55E" };
}

// ── Animated wrapper ───────────────────────────────────────────────────────
function FadeSlide({ children, visible }: { children: React.ReactNode; visible: boolean }) {
  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(10px)",
      transition: "opacity 320ms cubic-bezier(0.4,0,0.2,1), transform 320ms cubic-bezier(0.4,0,0.2,1)",
    }}>
      {children}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function ForgotPassword({ onBack, onResetSuccess }: ForgotPasswordProps) {
  const [stage, setStage] = useState<Stage>("request");
  const [visible, setVisible] = useState(false);

  // Stage: request
  const [email, setEmail] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState("");

  // Stage: sent
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Stage: reset
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");

  // Holds the fresh token + user returned from /reset-password
  // so the "done" screen button can log the user in immediately
  const resetResultRef = useRef<{ token: string; user: any } | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Resend cooldown timer
  const startCooldown = () => {
    setResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // ── Stage: Request ──────────────────────────────────────────────────────
  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestError("");
    if (!email.trim()) { setRequestError("Please enter your email address."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setRequestError("Please enter a valid email address."); return; }
    setRequestLoading(true);
    try {
      await authAPI.forgotPassword(email);
      startCooldown();
      setVisible(false);
      setTimeout(() => { setStage("sent"); setVisible(true); }, 320);
    } catch (err: any) {
      setRequestError(err.response?.data?.error || "Could not send reset email. Please try again.");
    } finally {
      setRequestLoading(false);
    }
  };

  // ── Stage: Resend ───────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await authAPI.forgotPassword(email);
      startCooldown();
    } catch {
      // silently fail
    }
  };

  // ── Stage: OTP input ────────────────────────────────────────────────────
  const handleCodeChange = (i: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[i] = digit;
    setCode(next);
    if (digit && i < 5) codeRefs.current[i + 1]?.focus();
  };

  const handleCodeKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[i] && i > 0) {
      codeRefs.current[i - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && i > 0) codeRefs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) codeRefs.current[i + 1]?.focus();
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    const next = [...code];
    digits.forEach((d, i) => { if (i < 6) next[i] = d; });
    setCode(next);
    const lastFilled = Math.min(digits.length, 5);
    codeRefs.current[lastFilled]?.focus();
  };

  const proceedToReset = () => {
    setVisible(false);
    setTimeout(() => { setStage("reset"); setVisible(true); }, 320);
  };

  // ── Stage: Reset ────────────────────────────────────────────────────────
  const strength = getStrength(newPassword);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    const otp = code.join("");
    if (otp.length < 6) { setResetError("Please enter the full 6-digit code."); return; }
    if (newPassword.length < 8) { setResetError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setResetError("Passwords do not match."); return; }
    setResetLoading(true);
    try {
      const data = await authAPI.resetPassword({ email, code: otp, password: newPassword });

      // ── KEY FIX ───────────────────────────────────────────────────────
      // The backend now returns { success, token, user }.
      // Store the fresh token in localStorage RIGHT NOW, before anything
      // else runs. This replaces any stale token so the response
      // interceptor won't fire a 401 redirect when the user navigates.
      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      // Save for the "done" screen button
      resetResultRef.current = { token: data.token, user: data.user };

      setVisible(false);
      setTimeout(() => { setStage("done"); setVisible(true); }, 320);
    } catch (err: any) {
      setResetError(err.response?.data?.error || "Invalid or expired code. Please try again.");
    } finally {
      setResetLoading(false);
    }
  };

  // ── Done: auto-login ────────────────────────────────────────────────────
  const handleDone = () => {
    const result = resetResultRef.current;
    if (result?.token && result?.user) {
      // Pass token + user up to Login.tsx / App.tsx to finish login
      onResetSuccess(result.token, result.user);
    } else {
      // Fallback: just go back to login screen (edge case)
      onBack();
    }
  };

  // ── Shared input class ──────────────────────────────────────────────────
  const inputCls = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-all duration-150";

  return (
    <>
      <style>{`
        @keyframes cx-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes cx-pop {
          0%   { transform: scale(0.8); opacity: 0; }
          60%  { transform: scale(1.08); }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes cx-pulse-ring {
          0%   { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(250,204,21,0.4); }
          70%  { transform: scale(1);   box-shadow: 0 0 0 10px rgba(250,204,21,0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(250,204,21,0); }
        }
      `}</style>

      <div className="min-h-screen bg-white flex items-center justify-center px-4"
        style={{ fontFamily: "Inter, system-ui, 'Segoe UI', Roboto, sans-serif" }}>
        <div className="w-full max-w-sm flex flex-col items-center">

          {/* Brand */}
          <div className="mb-4">
            <div className="bg-slate-900 text-white px-4 py-1.5 rounded-md text-sm font-semibold tracking-wide">
              CHEZAX <span className="text-yellow-400">MALAWI</span>
            </div>
          </div>

          {/* Card */}
          <FadeSlide visible={visible}>
            <div className="w-full bg-white rounded-xl shadow-md border border-gray-100 px-7 py-6">

              {/* ── STAGE: REQUEST ── */}
              {stage === "request" && (
                <>
                  <button
                    onClick={onBack}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-5 -ml-0.5"
                  >
                    <IconArrowLeft size={13} /> Back to sign in
                  </button>

                  <div className="flex justify-center mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-yellow-50 border border-yellow-100 flex items-center justify-center text-yellow-500"
                      style={{ animation: "cx-pop 400ms cubic-bezier(0.34,1.56,0.64,1) both" }}>
                      <IconMail size={26} />
                    </div>
                  </div>

                  <h1 className="text-xl font-semibold text-gray-900 text-center mb-1">
                    Forgot password?
                  </h1>
                  <p className="text-xs text-gray-500 text-center mb-5 leading-relaxed">
                    No worries. Enter your email and we'll send you a reset code.
                  </p>

                  {requestError && (
                    <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 flex items-start gap-2">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      {requestError}
                    </div>
                  )}

                  <form onSubmit={handleRequest} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Email address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        autoFocus
                        className={inputCls}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={requestLoading}
                      className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 disabled:cursor-not-allowed text-black font-semibold py-2 rounded-md transition flex items-center justify-center gap-2 text-sm"
                    >
                      {requestLoading
                        ? <><IconLoader size={15} /> Sending...</>
                        : <><IconMail size={15} /> Send Reset Code</>
                      }
                    </button>
                  </form>
                </>
              )}

              {/* ── STAGE: SENT ── */}
              {stage === "sent" && (
                <>
                  <div className="flex justify-center mb-5">
                    <div className="w-16 h-16 rounded-2xl bg-yellow-50 border border-yellow-100 flex items-center justify-center text-yellow-500"
                      style={{ animation: "cx-pulse-ring 2s ease-in-out infinite, cx-pop 400ms cubic-bezier(0.34,1.56,0.64,1) both" }}>
                      <IconInbox size={30} />
                    </div>
                  </div>

                  <h1 className="text-xl font-semibold text-gray-900 text-center mb-1">
                    Check your inbox
                  </h1>
                  <p className="text-xs text-gray-500 text-center mb-1 leading-relaxed">
                    We sent a 6-digit code to
                  </p>
                  <p className="text-sm font-semibold text-gray-800 text-center mb-5 truncate">
                    {email}
                  </p>

                  <div className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 mb-5 space-y-2">
                    {[
                      "Open your email app",
                      "Find the email from ChezaX Malawi",
                      "Copy the 6-digit code",
                      "Enter it on the next screen",
                    ].map((step, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-yellow-400 text-black text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-xs text-gray-600">{step}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={proceedToReset}
                    className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-2 rounded-md transition text-sm mb-3"
                  >
                    Enter Code
                  </button>

                  <div className="text-center">
                    <span className="text-xs text-gray-400">Didn't receive it? </span>
                    <button
                      onClick={handleResend}
                      disabled={resendCooldown > 0}
                      className="text-xs font-medium text-yellow-500 hover:text-yellow-600 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend email"}
                    </button>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                    <button onClick={onBack} className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1.5 mx-auto">
                      <IconArrowLeft size={12} /> Back to sign in
                    </button>
                  </div>
                </>
              )}

              {/* ── STAGE: RESET ── */}
              {stage === "reset" && (
                <>
                  <button
                    onClick={() => { setVisible(false); setTimeout(() => { setStage("sent"); setVisible(true); }, 320); }}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-5 -ml-0.5"
                  >
                    <IconArrowLeft size={13} /> Back
                  </button>

                  <div className="flex justify-center mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-yellow-50 border border-yellow-100 flex items-center justify-center text-yellow-500"
                      style={{ animation: "cx-pop 400ms cubic-bezier(0.34,1.56,0.64,1) both" }}>
                      <IconLock size={24} />
                    </div>
                  </div>

                  <h1 className="text-xl font-semibold text-gray-900 text-center mb-1">
                    Set new password
                  </h1>
                  <p className="text-xs text-gray-500 text-center mb-5 leading-relaxed">
                    Enter the code from your email and choose a new password.
                  </p>

                  {resetError && (
                    <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 flex items-start gap-2">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      {resetError}
                    </div>
                  )}

                  <form onSubmit={handleReset} className="space-y-4">

                    {/* OTP input */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">
                        6-digit verification code
                      </label>
                      <div className="flex gap-2 justify-between" onPaste={handleCodePaste}>
                        {code.map((digit, i) => (
                          <input
                            key={i}
                            ref={el => { codeRefs.current[i] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={e => handleCodeChange(i, e.target.value)}
                            onKeyDown={e => handleCodeKeyDown(i, e)}
                            className="w-10 h-11 text-center text-base font-bold rounded-lg border transition-all duration-150 outline-none"
                            style={{
                              borderColor: digit ? "#FACC15" : "#D1D5DB",
                              background: digit ? "#FEFCE8" : "#fff",
                              boxShadow: digit ? "0 0 0 2px rgba(250,204,21,0.2)" : "none",
                              color: "#111827",
                            }}
                            onFocus={e => { e.target.style.borderColor = "#FACC15"; e.target.style.boxShadow = "0 0 0 3px rgba(250,204,21,0.2)"; }}
                            onBlur={e => { e.target.style.borderColor = digit ? "#FACC15" : "#D1D5DB"; e.target.style.boxShadow = digit ? "0 0 0 2px rgba(250,204,21,0.2)" : "none"; }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* New password */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        New password
                      </label>
                      <div className="relative">
                        <input
                          type={showNew ? "text" : "password"}
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="Min. 8 characters"
                          className={inputCls + " pr-9"}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNew(!showNew)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showNew ? <IconEyeOff size={15} /> : <IconEye size={15} />}
                        </button>
                      </div>

                      {newPassword && (
                        <div className="mt-2">
                          <div className="flex gap-1 mb-1">
                            {[1, 2, 3, 4].map(n => (
                              <div key={n} className="h-1 flex-1 rounded-full transition-all duration-300"
                                style={{ background: n <= strength.score ? strength.color : "#E5E7EB" }} />
                            ))}
                          </div>
                          <p className="text-[10px] font-medium" style={{ color: strength.color }}>
                            {strength.label} password
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Confirm password */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Confirm password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirm ? "text" : "password"}
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          placeholder="Repeat your new password"
                          className={inputCls + " pr-9"}
                          style={{
                            borderColor: confirmPassword && confirmPassword !== newPassword ? "#FCA5A5" : undefined,
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showConfirm ? <IconEyeOff size={15} /> : <IconEye size={15} />}
                        </button>
                        {confirmPassword && confirmPassword === newPassword && (
                          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-green-500">
                            <IconCheck size={15} />
                          </div>
                        )}
                      </div>
                      {confirmPassword && confirmPassword !== newPassword && (
                        <p className="text-[10px] text-red-500 mt-1">Passwords do not match</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={resetLoading || code.join("").length < 6 || newPassword.length < 8 || newPassword !== confirmPassword}
                      className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-2 rounded-md transition flex items-center justify-center gap-2 text-sm"
                    >
                      {resetLoading
                        ? <><IconLoader size={15} /> Resetting...</>
                        : <><IconLock size={15} /> Reset Password</>
                      }
                    </button>
                  </form>
                </>
              )}

              {/* ── STAGE: DONE ── */}
              {stage === "done" && (
                <div className="text-center py-4">
                  <div className="flex justify-center mb-5">
                    <div className="w-16 h-16 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center text-green-500"
                      style={{ animation: "cx-pop 500ms cubic-bezier(0.34,1.56,0.64,1) both" }}>
                      <IconShieldCheck size={30} />
                    </div>
                  </div>

                  <h1 className="text-xl font-semibold text-gray-900 mb-1">
                    Password reset!
                  </h1>
                  <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                    Your password has been updated successfully.<br />
                    You're being signed in now.
                  </p>

                  <div className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 mb-6 space-y-2 text-left">
                    {[
                      "Password updated securely",
                      "Previous sessions invalidated",
                      "Account protected",
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-green-100 border border-green-200 flex items-center justify-center text-green-500 flex-shrink-0">
                          <IconCheck size={9} />
                        </div>
                        <span className="text-xs text-gray-600">{item}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleDone}
                    className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-2 rounded-md transition text-sm"
                  >
                    Continue to Chat
                  </button>
                </div>
              )}

            </div>
          </FadeSlide>

          {/* Footer */}
          <p className="text-[11px] text-gray-400 text-center mt-4">
            Powered by{" "}
            <span className="font-medium text-yellow-500">Rasta Kadema</span>{" "}
            — All rights reserved
          </p>
        </div>
      </div>
    </>
  );
}