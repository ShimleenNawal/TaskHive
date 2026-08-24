import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getApiError(error, fallback = "Something went wrong") {
  const detail = error?.response?.data?.detail ?? error?.detail ?? error?.message;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => item?.msg || item?.message || String(item))
      .filter(Boolean);

    if (messages.length) {
      return messages.join(", ");
    }
  }

  return fallback;
}

export function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString();
}

export function formatDateShort(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString();
}
