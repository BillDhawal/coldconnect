"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "destructive";
  }
>(({ className, variant = "default", ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(
      "relative w-full rounded-lg border p-4",
      {
        "bg-red-500 text-white": variant === "destructive",
        "bg-gray-100 text-gray-900": variant === "default",
      },
      className
    )}
    {...props}
  />
));

Alert.displayName = "Alert";

export { Alert };
