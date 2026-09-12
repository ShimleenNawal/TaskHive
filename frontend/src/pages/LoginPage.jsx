import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";
import AuthLayout from "@/components/AuthLayout";
import PasswordInput from "@/components/PasswordInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEBOUNCE_MS = 400;

export default function LoginPage() {
  const {
    register,
    handleSubmit,
    watch,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  const { login, resendVerification, checkEmail, forgotPassword } = useAuth();
  const navigate = useNavigate();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [emailStatusError, setEmailStatusError] = useState("");
  const [emailCheckOk, setEmailCheckOk] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const emailValue = watch("email");
  const checkSeq = useRef(0);
  const debounceRef = useRef(null);
  const lastCheckedEmail = useRef("");
  const checkEmailRef = useRef(checkEmail);
  checkEmailRef.current = checkEmail;

  const runEmailCheck = useCallback(async (rawEmail) => {
    const email = (rawEmail || "").trim();
    if (!EMAIL_SHAPE.test(email)) {
      lastCheckedEmail.current = "";
      setEmailStatusError("");
      setEmailCheckOk(false);
      return;
    }

    if (email === lastCheckedEmail.current) return;

    const seq = ++checkSeq.current;

    try {
      const result = await checkEmailRef.current(email);
      if (seq !== checkSeq.current) return;

      lastCheckedEmail.current = email;

      if (!result.exists) {
        setEmailStatusError("Email does not exist");
        setEmailCheckOk(false);
      } else if (!result.is_verified) {
        setEmailStatusError(
          "Please verify your account first. Use Forgot Password? below to get a new verification link.",
        );
        setEmailCheckOk(false);
      } else {
        setEmailStatusError("");
        setEmailCheckOk(true);
      }
    } catch (err) {
      if (seq !== checkSeq.current) return;
      lastCheckedEmail.current = "";
      setEmailStatusError(
        err.response?.data?.detail || "Could not check email. Try again.",
      );
      setEmailCheckOk(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const email = (emailValue || "").trim();
    if (!EMAIL_SHAPE.test(email)) {
      lastCheckedEmail.current = "";
      setEmailStatusError("");
      setEmailCheckOk(false);
      return undefined;
    }

    if (email === lastCheckedEmail.current) return undefined;

    debounceRef.current = setTimeout(() => {
      void runEmailCheck(email);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [emailValue, runEmailCheck]);

  const emailRegister = register("email");

  const onSubmit = async (data) => {
    setError("");
    setForgotMessage("");
    setNeedsVerification(false);
    setLoading(true);

    try {
      await login(data.email, data.password);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);

      if (err.response?.status === 403) {
        setNeedsVerification(true);
        setError(
          "Please verify your email before logging in. You can also use Forgot Password? for a new link.",
        );
      } else if (err.response?.status === 401) {
        setError(
          "Invalid email or password. Forgot Password? only emails a sign-in link — it does not change your password.",
        );
      } else {
        setError(err.response?.data?.detail || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const email = getValues("email");
    try {
      setError("");
      await resendVerification(email);
      setError("Verification email sent. Please check your inbox.");
    } catch (err) {
      setError(
        err.response?.data?.detail || "Failed to resend verification email",
      );
    }
  };

  const handleForgotPassword = async () => {
    const email = (getValues("email") || "").trim();
    setForgotMessage("");
    setError("");

    if (!EMAIL_SHAPE.test(email)) {
      setForgotMessage("Enter a valid email above first.");
      return;
    }

    setForgotLoading(true);
    try {
      const result = await forgotPassword(email);
      if (result?.status === "verification email sent") {
        setForgotMessage(
          "We sent a verification link to your email. Click it to verify and open your dashboard.",
        );
        // Unverified accounts still cannot password-login until they verify.
        lastCheckedEmail.current = email;
        setEmailStatusError(
          "Please verify your account first. Use the link we just emailed you.",
        );
        setEmailCheckOk(false);
      } else {
        // Magic sign-in email only — password is unchanged; allow password login.
        lastCheckedEmail.current = email;
        setEmailStatusError("");
        setEmailCheckOk(true);
        setForgotMessage(
          "We sent a one-time sign-in link to your email. You can ignore it and log in with your password if you remember it — your password was not changed.",
        );
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      setForgotMessage(
        typeof detail === "string" ? detail : "Failed to send email. Try again.",
      );
    } finally {
      setForgotLoading(false);
    }
  };

  const submitDisabled = loading || Boolean(emailStatusError) || !emailCheckOk;

  return (
    <AuthLayout title="Login">
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <p>{error}</p>

          {needsVerification && (
            <button
              type="button"
              onClick={handleResendVerification}
              className="mt-2 text-sm font-medium text-red-800 underline hover:no-underline"
            >
              Resend verification email
            </button>
          )}
        </div>
      )}

      {forgotMessage && (
        <div className="mb-4 rounded-lg bg-[#eef1e8] p-3 text-sm text-[#2F3329]">
          {forgotMessage}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label
            htmlFor="login-email"
            className="mb-1.5 block text-sm font-medium text-[#2F3329]"
          >
            Email <span className="auth-required">*</span>
          </label>
          <Input
            id="login-email"
            {...emailRegister}
            type="email"
            placeholder="Email"
            autoComplete="email"
            onBlur={(e) => {
              emailRegister.onBlur(e);
              void runEmailCheck(e.target.value);
            }}
          />

          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
          {!errors.email && emailStatusError && (
            <p className="mt-1 text-sm text-red-600">{emailStatusError}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="mb-1.5 block text-sm font-medium text-[#2F3329]"
          >
            Password <span className="auth-required">*</span>
          </label>
          <PasswordInput
            id="login-password"
            {...register("password")}
            placeholder="Password"
            autoComplete="current-password"
          />

          {errors.password && (
            <p className="mt-1 text-sm text-red-600">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            className="auth-forgot"
            onClick={handleForgotPassword}
            disabled={forgotLoading}
          >
            {forgotLoading ? "Sending…" : "Forgot Password?"}
          </button>
        </div>

        <Button
          type="submit"
          className="auth-submit w-full"
          disabled={submitDisabled}
        >
          {loading ? "Logging in..." : "Login"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-[#5c6356]">
        No account yet?{" "}
        <Link to="/signup" className="font-medium underline-offset-2 hover:underline">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
