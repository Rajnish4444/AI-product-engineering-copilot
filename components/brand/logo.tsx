import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
  /** Include the wordmark to the right of the mark. */
  wordmark?: boolean;
  /** Aria label for the whole logo — defaults to "BuildPilot". */
  label?: string;
}

/**
 * BuildPilot brand mark: two chevrons pointing at each other with a dot at
 * their meeting point — visualizes the PM ↔ Eng seam the product bridges.
 *
 * Inherits color from `currentColor` so it themes with parent text color.
 */
export function Logo({
  className,
  size = 24,
  wordmark = false,
  label = "BuildPilot",
}: LogoProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      role="img"
      aria-label={label}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 6 L11 12 L5 18" />
        <path d="M19 6 L13 12 L19 18" />
        <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
      </svg>
      {wordmark && (
        <span className="font-semibold tracking-tight">BuildPilot</span>
      )}
    </span>
  );
}
