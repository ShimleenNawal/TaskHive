import { cn } from "@/lib/utils";

/**
 * Shared shell for signup, login, verify, and email-login pages.
 * Warm stone → olive gradient with a centered elevated card.
 */
export default function AuthLayout({ children, title, className }) {
  return (
    <div className="auth-shell">
      <div className={cn("auth-card", className)}>
        {title ? (
          <h1 className="auth-title mb-6 text-center text-2xl font-bold tracking-tight text-[#2F3329]">
            {title}
          </h1>
        ) : null}
        {children}
      </div>
    </div>
  );
}
