import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import AuthLayout from "@/components/AuthLayout";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const startedTokens = new Set();

function formatErrorDetail(detail) {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item.msg === "string") return item.msg;
        return null;
      })
      .filter(Boolean);
    if (messages.length > 0) return messages.join(" ");
  }
  return null;
}

export default function EmailLoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { emailLogin } = useAuth();

  const [status, setStatus] = useState("signing-in");
  const [message, setMessage] = useState("");

  const token = searchParams.get("token");

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Sign-in link is missing.");
        return;
      }

      if (startedTokens.has(token)) return;
      startedTokens.add(token);

      try {
        await emailLogin(token);
        setStatus("success");
        setMessage("Signed in. Opening your dashboard…");
        navigate("/dashboard", { replace: true });
      } catch (error) {
        startedTokens.delete(token);
        const detail = formatErrorDetail(error.response?.data?.detail);
        setStatus("error");
        setMessage(
          detail || error.message || "Sign-in link is invalid or expired.",
        );
      }
    };

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per token
  }, [token]);

  return (
    <AuthLayout>
      <div className="text-center">
        {status === "signing-in" && (
          <>
            <h1 className="text-2xl font-bold text-[#2F3329]">Signing you in…</h1>
            <p className="mt-3 text-sm text-[#5c6356]">
              Please wait while we complete your secure sign-in.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <h1 className="text-2xl font-bold text-[#3d4536]">Welcome back</h1>
            <p className="mt-3 text-sm text-[#5c6356]">{message}</p>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="text-2xl font-bold text-red-700">Sign-in failed</h1>
            <p className="mt-3 text-sm text-[#5c6356]">{message}</p>

            <Button
              type="button"
              className="auth-submit mt-6"
              onClick={() => navigate("/login")}
            >
              Back to Login
            </Button>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
