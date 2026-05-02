"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const spring = { ease: [0.22, 1, 0.36, 1] as const };

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
    }
  }

  async function handleOAuth(provider: "google" | "github") {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  }

  const canSubmit = email.length > 0 && password.length >= 8;

  return (
    <main className="min-h-dvh bg-aos-bg relative flex flex-col overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[10%] left-[20%] w-80 h-80"
          style={{
            background: "radial-gradient(circle, rgba(61,184,122,0.15) 0%, transparent 60%)",
            filter: "blur(40px)",
          }}
        />
        <motion.div
          animate={{ x: [0, -30, 40, 0], y: [0, 40, -10, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[40%] right-0 w-72 h-72"
          style={{
            background: "radial-gradient(circle, rgba(212,165,116,0.10) 0%, transparent 60%)",
            filter: "blur(40px)",
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col flex-1 px-6 pt-20 pb-10 max-w-sm mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ...spring }}
        >
          <a href="/" className="inline-block">
            <div className="font-serif text-4xl text-aos-text tracking-[-0.04em] leading-none">
              AOS
            </div>
          </a>
          <div className="font-serif text-xl text-aos-secondary italic mt-1.5 tracking-[-0.01em]">
            Build with conviction.
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div
              key="sent"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ...spring }}
              className="mt-14"
            >
              <div
                className="p-7 rounded-[22px] text-center"
                style={{ background: "#15151A", border: "1px solid var(--aos-border)" }}
              >
                <div className="w-12 h-12 rounded-full bg-aos-accent flex items-center justify-center mx-auto mb-4">
                  <Mail size={20} color="#000" strokeWidth={2} />
                </div>
                <div className="font-serif text-2xl text-aos-text tracking-[-0.02em] mb-2">
                  Check your email.
                </div>
                <div className="text-aos-secondary text-sm leading-relaxed font-serif italic">
                  We sent a confirmation link to{" "}
                  <span className="text-aos-text not-italic font-medium">{email}</span>.
                  Click it to activate your account.
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15, ...spring }}
              className="mt-14"
            >
              <div className="text-xs text-aos-tertiary uppercase tracking-[0.12em] font-medium mb-6">
                Create your account
              </div>

              <form onSubmit={handleSignup} className="flex flex-col gap-3">
                <AuthInput
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={setEmail}
                  autoComplete="email"
                />
                <AuthInput
                  type="password"
                  placeholder="Password (min 8 chars)"
                  value={password}
                  onChange={setPassword}
                  autoComplete="new-password"
                />

                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-red-400 text-sm px-1"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <motion.button
                  type="submit"
                  disabled={loading || !canSubmit}
                  whileTap={canSubmit ? { scale: 0.98 } : {}}
                  className="mt-1 flex items-center justify-center gap-2 w-full py-[16px] rounded-[14px] text-base font-semibold tracking-[-0.01em] transition-all duration-300"
                  style={{
                    background: !canSubmit || loading ? "#1C1C22" : "#F5F2ED",
                    color: !canSubmit || loading ? "#5A5650" : "#0A0A0C",
                    cursor: !canSubmit || loading ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? (
                    "Creating account…"
                  ) : (
                    <>
                      Create account <ArrowRight size={17} strokeWidth={2.5} />
                    </>
                  )}
                </motion.button>
              </form>

              <Divider />

              <div className="flex flex-col gap-2.5">
                <OAuthButton provider="google" onClick={() => handleOAuth("google")} />
                <OAuthButton provider="github" onClick={() => handleOAuth("github")} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1" />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-center mt-8 text-sm"
        >
          <span className="text-aos-tertiary">Already have an account? </span>
          <a
            href="/auth/login"
            className="text-aos-text font-medium hover:opacity-70 transition-opacity"
          >
            Sign in
          </a>
        </motion.p>
      </div>
    </main>
  );
}

function AuthInput({
  type,
  placeholder,
  value,
  onChange,
  autoComplete,
}: {
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete={autoComplete}
      className="w-full px-4 py-[15px] rounded-[14px] text-aos-text text-base outline-none placeholder:text-aos-tertiary"
      style={{
        background: "#15151A",
        border: "1px solid var(--aos-border)",
        transition: "border-color 0.2s",
      }}
      onFocus={(e) => {
        e.target.style.borderColor = "rgba(245,242,237,0.2)";
      }}
      onBlur={(e) => {
        e.target.style.borderColor = "var(--aos-border)";
      }}
    />
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px" style={{ background: "var(--aos-border)" }} />
      <span className="text-xs text-aos-tertiary tracking-[0.06em]">or</span>
      <div className="flex-1 h-px" style={{ background: "var(--aos-border)" }} />
    </div>
  );
}

function OAuthButton({
  provider,
  onClick,
}: {
  provider: "google" | "github";
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className="flex items-center justify-center gap-2.5 w-full py-[14px] rounded-[14px] text-sm font-medium text-aos-text transition-all duration-300"
      style={{ background: "#15151A", border: "1px solid var(--aos-border)" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor =
          "rgba(245,242,237,0.12)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor =
          "var(--aos-border)";
      }}
    >
      {provider === "google" ? <GoogleIcon /> : <GitHubIcon />}
      Continue with {provider === "google" ? "Google" : "GitHub"}
    </motion.button>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M15.68 8.18c0-.57-.05-1.11-.14-1.64H8v3.1h4.3a3.67 3.67 0 0 1-1.59 2.41v2h2.57C14.78 12.6 15.68 10.56 15.68 8.18z"
        fill="#4285F4"
      />
      <path
        d="M8 16c2.16 0 3.97-.72 5.29-1.94l-2.57-2a4.77 4.77 0 0 1-2.72.76C5.91 12.82 4.14 11.41 3.51 9.51H.86v2.07A8 8 0 0 0 8 16z"
        fill="#34A853"
      />
      <path
        d="M3.51 9.51A4.84 4.84 0 0 1 3.26 8c0-.52.09-1.03.25-1.51V4.42H.86A8.01 8.01 0 0 0 0 8c0 1.29.31 2.51.86 3.58l2.65-2.07z"
        fill="#FBBC05"
      />
      <path
        d="M8 3.18c1.18 0 2.23.4 3.06 1.2l2.29-2.3A8 8 0 0 0 8 0C4.9 0 2.17 1.83.86 4.42l2.65 2.07C4.14 4.59 5.91 3.18 8 3.18z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}
