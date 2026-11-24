import type { SVGProps } from "react";

/** App-native bus mark: wide windshield, route display and rounded chassis. */
export function BusLogo({
  size = 28,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <rect x="8" y="5" width="24" height="29" rx="8" fill="currentColor" />
      <rect
        x="12"
        y="9"
        width="16"
        height="3"
        rx="1.5"
        fill="var(--logo-window, #eafff1)"
      />
      <rect
        x="11.5"
        y="15"
        width="17"
        height="9"
        rx="2.5"
        fill="var(--logo-window, #eafff1)"
      />
      <path d="M20 15v9" stroke="currentColor" strokeWidth="1.5" />
      <rect x="5" y="16" width="3" height="7" rx="1.5" fill="currentColor" />
      <rect x="32" y="16" width="3" height="7" rx="1.5" fill="currentColor" />
      <circle cx="13.5" cy="28.5" r="2" fill="var(--logo-window, #eafff1)" />
      <circle cx="26.5" cy="28.5" r="2" fill="var(--logo-window, #eafff1)" />
      <rect x="11" y="32" width="5" height="5" rx="2" fill="currentColor" />
      <rect x="24" y="32" width="5" height="5" rx="2" fill="currentColor" />
    </svg>
  );
}
