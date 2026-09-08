import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Password field with a right-edge show/hide toggle.
 * Forwards react-hook-form register props + ref to the input.
 */
const PasswordInput = forwardRef(function PasswordInput(
  { className, id, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        ref={ref}
        type={visible ? "text" : "password"}
        className={cn("pr-9", className)}
        {...props}
      />
      <button
        type="button"
        className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-[#5c6356] hover:text-[#2F3329] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3d4536]/40"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-controls={id}
        tabIndex={-1}
      >
        {visible ? (
          <EyeOff className="size-4" aria-hidden />
        ) : (
          <Eye className="size-4" aria-hidden />
        )}
      </button>
    </div>
  );
});

export default PasswordInput;
