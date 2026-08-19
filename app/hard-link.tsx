import type { AnchorHTMLAttributes, ReactNode } from "react";

export type HardLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
};

/**
 * Uses the browser's native navigation. The current vinext Link runtime throws
 * during client-side transitions on Cloudflare, while a normal document
 * navigation is reliable and preserves modifier-click behavior.
 */
export function HardLink({ children, ...props }: HardLinkProps) {
  return <a {...props}>{children}</a>;
}
