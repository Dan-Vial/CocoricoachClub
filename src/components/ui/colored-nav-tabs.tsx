import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Define navigation color mappings
export const NAV_COLORS = {
  overview: {
    base: "hsl(220 80% 55%)",
    text: "text-[hsl(220_80%_55%)]",
    bg: "bg-[hsl(220_80%_55%)]",
    hover: "hover:bg-[hsl(220_80%_55%)/10]",
  },
  admin: {
    base: "hsl(280 70% 55%)",
    text: "text-[hsl(280_70%_55%)]",
    bg: "bg-[hsl(280_70%_55%)]",
    hover: "hover:bg-[hsl(280_70%_55%)/10]",
  },
  effectif: {
    base: "hsl(200 85% 50%)",
    text: "text-[hsl(200_85%_50%)]",
    bg: "bg-[hsl(200_85%_50%)]",
    hover: "hover:bg-[hsl(200_85%_50%)/10]",
  },
  planification: {
    base: "hsl(35 90% 55%)",
    text: "text-[hsl(35_90%_55%)]",
    bg: "bg-[hsl(35_90%_55%)]",
    hover: "hover:bg-[hsl(35_90%_55%)/10]",
  },
  programmation: {
    base: "hsl(260 70% 60%)",
    text: "text-[hsl(260_70%_60%)]",
    bg: "bg-[hsl(260_70%_60%)]",
    hover: "hover:bg-[hsl(260_70%_60%)/10]",
  },
  performance: {
    base: "hsl(320 75% 55%)",
    text: "text-[hsl(320_75%_55%)]",
    bg: "bg-[hsl(320_75%_55%)]",
    hover: "hover:bg-[hsl(320_75%_55%)/10]",
  },
  sante: {
    base: "hsl(160 65% 45%)",
    text: "text-[hsl(160_65%_45%)]",
    bg: "bg-[hsl(160_65%_45%)]",
    hover: "hover:bg-[hsl(160_65%_45%)/10]",
  },
  competition: {
    base: "hsl(45 95% 50%)",
    text: "text-[hsl(45_95%_48%)]",
    bg: "bg-[hsl(45_95%_50%)]",
    hover: "hover:bg-[hsl(45_95%_50%)/10]",
  },
  gps: {
    base: "hsl(190 80% 45%)",
    text: "text-[hsl(190_80%_45%)]",
    bg: "bg-[hsl(190_80%_45%)]",
    hover: "hover:bg-[hsl(190_80%_45%)/10]",
  },
  video: {
    base: "hsl(350 80% 60%)",
    text: "text-[hsl(350_80%_60%)]",
    bg: "bg-[hsl(350_80%_60%)]",
    hover: "hover:bg-[hsl(350_80%_60%)/10]",
  },
  communication: {
    base: "hsl(210 80% 55%)",
    text: "text-[hsl(210_80%_55%)]",
    bg: "bg-[hsl(210_80%_55%)]",
    hover: "hover:bg-[hsl(210_80%_55%)/10]",
  },
  academy: {
    base: "hsl(210 75% 55%)",
    text: "text-[hsl(210_75%_55%)]",
    bg: "bg-[hsl(210_75%_55%)]",
    hover: "hover:bg-[hsl(210_75%_55%)/10]",
  },
  settings: {
    base: "hsl(220 15% 50%)",
    text: "text-[hsl(220_15%_50%)]",
    bg: "bg-[hsl(220_15%_50%)]",
    hover: "hover:bg-[hsl(220_15%_50%)/10]",
  },
} as const;

export type NavColorKey = keyof typeof NAV_COLORS;

interface ColoredNavTabsListProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
  children: React.ReactNode;
}

const ColoredNavTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  ColoredNavTabsListProps
>(({ className, children, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex items-center gap-2 p-2 rounded-xl shadow-sm border border-border/50",
      "bg-white",
      "field-mode:bg-[hsl(215_25%_14%)] field-mode:border-[hsl(215_25%_25%)]",
      className
    )}
    {...props}
  >
    {children}
  </TabsPrimitive.List>
));
ColoredNavTabsList.displayName = "ColoredNavTabsList";

interface ColoredNavTabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  colorKey: NavColorKey;
  icon?: React.ReactNode;
}

const ColoredNavTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  ColoredNavTabsTriggerProps
>(({ className, colorKey, icon, children, ...props }, ref) => {
  const colors = NAV_COLORS[colorKey];
  
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "group relative inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm",
        "transition-all duration-200 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        colors.text,
        colors.hover,
        "data-[state=active]:text-white data-[state=active]:shadow-md",
        className
      )}
      style={{}}
      {...props}
    >
      <span 
        className="absolute inset-0 rounded-lg opacity-0 transition-opacity duration-200 data-[state=active]:opacity-100 -z-10"
        style={{ backgroundColor: colors.base }}
        data-state={props["data-state"]}
      />
      {icon && (
        <span className="shrink-0 transition-colors duration-200">
          {icon}
        </span>
      )}
      <span className="whitespace-nowrap">{children}</span>
    </TabsPrimitive.Trigger>
  );
});
ColoredNavTabsTrigger.displayName = "ColoredNavTabsTrigger";

// Wrapper component that handles the active state styling
interface ColoredTabTriggerProps extends Omit<ColoredNavTabsTriggerProps, "data-state"> {
  value: string;
  badge?: number;
  label?: string;
  shortLabel?: string;
  tooltip?: string;
}

const ColoredTabTrigger = React.forwardRef<
  HTMLButtonElement,
  ColoredTabTriggerProps
>(({ colorKey, icon, children, className, value, badge, label, shortLabel, tooltip, ...props }, ref) => {
  const colors = NAV_COLORS[colorKey];
  
  const trigger = (
    <TabsPrimitive.Trigger
      ref={ref}
      value={value}
      className={cn(
        "colored-tab-trigger relative inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm",
        "transition-all duration-200 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      style={{
        ["--tab-color" as string]: colors.base,
      }}
      {...props}
    >
      <span className="colored-tab-text relative z-10 flex items-center gap-2" style={{ color: 'var(--tab-color)' }}>
        {icon && <span className="shrink-0">{icon}</span>}
        <span className="whitespace-nowrap">
          {label ? (
            <>
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{shortLabel || label}</span>
            </>
          ) : children}
        </span>
        {badge != null && badge > 0 && (
          <span className="absolute -top-2 -right-3 h-4 min-w-[16px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
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
ColoredTabTrigger.displayName = "ColoredTabTrigger";

export { ColoredNavTabsList, ColoredNavTabsTrigger, ColoredTabTrigger };
