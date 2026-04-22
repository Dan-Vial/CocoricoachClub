import logoLight from "@/assets/logo-light.png";
import logoDark from "@/assets/logo-dark.png";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  /** Force a specific variant. By default, the logo adapts to the current theme. */
  variant?: "auto" | "light" | "dark";
  alt?: string;
}

/**
 * CocoriCoach Club brand logo.
 * - "light" image is designed for light backgrounds (shown by default)
 * - "dark" image is designed for dark backgrounds (shown in dark mode)
 */
export function BrandLogo({ className, variant = "auto", alt = "CocoriCoach Club" }: BrandLogoProps) {
  if (variant === "light") {
    return <img src={logoLight} alt={alt} className={cn("object-contain", className)} />;
  }
  if (variant === "dark") {
    return <img src={logoDark} alt={alt} className={cn("object-contain", className)} />;
  }
  return (
    <>
      <img
        src={logoLight}
        alt={alt}
        className={cn("object-contain block dark:hidden", className)}
      />
      <img
        src={logoDark}
        alt={alt}
        className={cn("object-contain hidden dark:block", className)}
      />
    </>
  );
}

export default BrandLogo;
