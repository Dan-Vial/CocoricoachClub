import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
import { NAV_COLORS, NavColorKey } from "./colored-nav-tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Colored SubTabs for consistent sub-navigation styling
interface ColoredSubTabsListProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
  colorKey: NavColorKey;
}

const ColoredSubTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  ColoredSubTabsListProps
>(({ className, colorKey, ...props }, ref) => {
  const colors = NAV_COLORS[colorKey];
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        "flex w-full overflow-x-auto no-scrollbar gap-1 h-auto flex-wrap md:flex-nowrap p-1 rounded-lg",
        className
      )}
      style={{ 
        backgroundColor: `${colors.base}15`,
        borderColor: colors.base,
        borderWidth: "1px"
      }}
      {...props}
    />
  );
});
ColoredSubTabsList.displayName = "ColoredSubTabsList";

interface ColoredSubTabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  colorKey: NavColorKey;
  icon?: React.ReactNode;
  tooltip?: string;
}

const ColoredSubTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  ColoredSubTabsTriggerProps
>(({ className, colorKey, icon, children, tooltip, ...props }, ref) => {
  const colors = NAV_COLORS[colorKey];

  const trigger = (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "colored-tab-trigger group relative inline-flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-md font-medium text-xs sm:text-sm",
        "transition-all duration-200 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "data-[state=active]:shadow-md",
        className
      )}
      style={{
        ["--tab-color" as string]: colors.base,
      }}
      {...props}
    >
      <span 
        className="colored-tab-bg pointer-events-none absolute inset-0 rounded-md transition-all duration-200 opacity-0 scale-95 group-data-[state=active]:opacity-100 group-data-[state=active]:scale-100"
        style={{ backgroundColor: colors.base }}
      />
      <span className="colored-tab-text relative z-10 flex items-center gap-1.5 transition-colors duration-200" style={{ color: 'var(--tab-color)' }}>
        {icon && <span className="shrink-0 h-4 w-4">{icon}</span>}
        {children}
      </span>
    </TabsPrimitive.Trigger>
  );

  if (!tooltip) return trigger;

  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{trigger}</span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs bg-background/95 backdrop-blur-sm border shadow-lg">
          <p className="text-[11px] leading-relaxed text-muted-foreground">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});
ColoredSubTabsTrigger.displayName = "ColoredSubTabsTrigger";

// Colored Card wrapper for content
interface ColoredContentCardProps extends React.HTMLAttributes<HTMLDivElement> {
  colorKey: NavColorKey;
}

const ColoredContentCard = React.forwardRef<HTMLDivElement, ColoredContentCardProps>(
  ({ className, colorKey, children, ...props }, ref) => {
    const colors = NAV_COLORS[colorKey];
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border-2 bg-card shadow-sm",
          className
        )}
        style={{ 
          borderColor: `${colors.base}40`,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);
ColoredContentCard.displayName = "ColoredContentCard";

// Colored Card Header
interface ColoredCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  colorKey: NavColorKey;
}

const ColoredCardHeader = React.forwardRef<HTMLDivElement, ColoredCardHeaderProps>(
  ({ className, colorKey, children, ...props }, ref) => {
    const colors = NAV_COLORS[colorKey];
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-2 p-4 border-b",
          className
        )}
        style={{ 
          borderColor: `${colors.base}30`,
          background: `linear-gradient(135deg, ${colors.base}10 0%, transparent 100%)`
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);
ColoredCardHeader.displayName = "ColoredCardHeader";

// Colored Title
interface ColoredTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  colorKey: NavColorKey;
}

const ColoredTitle = React.forwardRef<HTMLHeadingElement, ColoredTitleProps>(
  ({ className, colorKey, children, ...props }, ref) => {
    const colors = NAV_COLORS[colorKey];
    return (
      <h3
        ref={ref}
        className={cn("text-lg font-semibold flex items-center gap-2", className)}
        style={{ color: colors.base }}
        {...props}
      >
        {children}
      </h3>
    );
  }
);
ColoredTitle.displayName = "ColoredTitle";

export { 
  ColoredSubTabsList, 
  ColoredSubTabsTrigger, 
  ColoredContentCard,
  ColoredCardHeader,
  ColoredTitle
};
