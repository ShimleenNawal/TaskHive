import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

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

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("");

  const token = searchParams.get("token");
  const verifying = useRef(false);

  useEffect(() => {
    const verifyEmail = async () => {
      if (verifying.current) return;
      verifying.current = true;

      if (!token) {
        setStatus("error");
        setMessage("Verification token is missing.");
        return;
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/auth/verify?token=${encodeURIComponent(token)}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          },
        );

        const bodyText = await response.text();
        const contentType = response.headers.get("content-type") || "";
        const isJson = contentType.includes("application/json");

        let data = null;
        if (isJson && bodyText) {
          try {
            data = JSON.parse(bodyText);
          } catch {
            data = null;
          }
        }

        if (!response.ok) {
          const detailMessage = formatErrorDetail(data?.detail);
          throw new Error(
            detailMessage || "Email verification failed. Please try again.",
          );
        }

        if (!isJson || data === null) {
          throw new Error(
            "Unexpected response from the server. Please try again.",
          );
        }

        setStatus("success");
        setMessage("Your email has been verified successfully.");

        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } catch (error) {
        setStatus("error");
        setMessage(error.message || "Email verification failed.");
      }
    };

    verifyEmail();
  }, [token, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 text-black dark:bg-gray-950 dark:text-white">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-gray-50 p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {status === "verifying" && (
          <>
            <h1 className="text-2xl font-bold">Verifying your email...</h1>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              Please wait while we verify your email address.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <h1 className="text-2xl font-bold text-green-600">
              Email Verified!
            </h1>
            <p className="mt-3 text-gray-600 dark:text-gray-400">{message}</p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Redirecting you to login...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="text-2xl font-bold text-red-600">
              Verification Failed
            </h1>
            <p className="mt-3 text-gray-600 dark:text-gray-400">{message}</p>

            <button
              type="button"
              onClick={() => navigate("/login")}
              className="mt-6 rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
            >
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
