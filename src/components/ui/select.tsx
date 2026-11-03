import { ChevronDown } from "lucide-react";
import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => <span className="relative block min-w-0">
  <select ref={ref} {...props} className={cn("block h-11 w-full min-w-0 appearance-none rounded-lg border border-border bg-background py-0 pl-3 pr-10 text-base leading-[2.625rem] outline-none focus:ring-2 focus:ring-primary disabled:bg-muted/30 disabled:text-muted-foreground", className)}>{children}</select>
  <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
</span>);
Select.displayName = "Select";
