import * as React from "react";
import { TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";

interface DisabledTabTriggerProps extends React.ComponentProps<typeof TabsTrigger> {
  isDisabled?: boolean;
  children: React.ReactNode;
}

/**
 * A TabsTrigger that can be visually disabled (grayed out) in viewer mode.
 * When disabled, it shows a lock icon and prevents interaction.
 */
export function DisabledTabTrigger({
  isDisabled = false,
  children,
  className,
  value,
  ...props
}: DisabledTabTriggerProps) {
  if (isDisabled) {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap",
          "rounded-md bg-muted/50 text-muted-foreground/50 cursor-not-allowed",
          "border border-dashed border-muted-foreground/20",
          className
        )}
        title="Accès restreint en mode lecture"
      >
        {children}
        <Lock className="h-3 w-3 ml-1 shrink-0" />
      </div>
    );
  }

  return (
    <TabsTrigger value={value} className={className} {...props}>
      {children}
    </TabsTrigger>
  );
}
