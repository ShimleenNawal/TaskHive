import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";
import AuthLayout from "@/components/AuthLayout";
import PasswordInput from "@/components/PasswordInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const signupSchema = z.object({
  name: z.string().min(2, "Name required"),
  email: z.string().email("Invalid email"),
  password: z
    .string()
    .min(8, "Min 8 characters")
    .regex(/[A-Za-z]/, "Must contain a letter")
    .regex(/[0-9]/, "Must contain a digit"),
});

export default function SignupPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signupSchema),
  });

  const { signup } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const onSubmit = async (data) => {
    setError("");
    setLoading(true);

    try {
      await signup(data.name, data.email, data.password);
      setSignupSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title={signupSuccess ? undefined : "Sign Up"}>
      {signupSuccess ? (
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#3d4536]">Check your email.</h1>

          <p className="mt-3 text-sm text-[#5c6356]">
            We sent a verification link to your email address. Please verify
            your email before logging in.
          </p>

          <Button
            type="button"
            className="auth-submit mt-6 w-full"
            onClick={() => navigate("/login")}
          >
            Go to Login
          </Button>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label
                htmlFor="signup-name"
                className="mb-1.5 block text-sm font-medium text-[#2F3329]"
              >
                Name <span className="auth-required">*</span>
              </label>
              <Input
                id="signup-name"
                {...register("name")}
                type="text"
                placeholder="Full Name"
                autoComplete="name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="signup-email"
                className="mb-1.5 block text-sm font-medium text-[#2F3329]"
              >
                Email <span className="auth-required">*</span>
              </label>
              <Input
                id="signup-email"
                {...register("email")}
                type="email"
                placeholder="Email"
                autoComplete="email"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="signup-password"
                className="mb-1.5 block text-sm font-medium text-[#2F3329]"
              >
                Password <span className="auth-required">*</span>
              </label>
              <PasswordInput
                id="signup-password"
                {...register("password")}
                placeholder="Password"
                autoComplete="new-password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            <p className="auth-hint text-center">
              Password must contain at least 8 characters, 1 letter &amp; 1 digit
            </p>

            <Button
              type="submit"
              className="auth-submit w-full"
              disabled={loading}
            >
              {loading ? "Signing up..." : "Sign Up"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-[#5c6356]">
            Already have an account?{" "}
            <Link to="/login" className="font-medium underline-offset-2 hover:underline">
              Log in
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
