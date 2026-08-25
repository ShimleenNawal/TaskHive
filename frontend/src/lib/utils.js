import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getApiError(error, fallback = "Something went wrong") {
  const detail =
    error?.response?.data?.detail ?? error?.detail ?? error?.message;

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

/* Format an ISO timestamp for `<input type="datetime-local">` (local wall clock). */
export function toDatetimeLocalValue(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/* Convert a datetime-local input value to ISO UTC for the API. */
export function datetimeLocalToIso(localString) {
  if (!localString) return null;
  return new Date(localString).toISOString();
}
