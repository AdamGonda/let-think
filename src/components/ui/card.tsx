import * as React from "react"

import {
  CornerRippleBackdrop,
  type CornerRippleBackdropProps,
} from "@/components/ui/corner-ripple-backdrop"
import { cn } from "@/lib/utils"

type CardCornerRippleOptions = Omit<
  CornerRippleBackdropProps,
  "className"
>

function Card({
  className,
  size = "default",
  cornerRipple,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  size?: "default" | "sm"
  /** When set, renders a subtle animated ripple backdrop behind card content. */
  cornerRipple?: boolean | CardCornerRippleOptions
}) {
  const showRipple = Boolean(cornerRipple)
  const rippleProps: CardCornerRippleOptions =
    typeof cornerRipple === "object" ? cornerRipple : {}

  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card relative flex flex-col gap-4 overflow-hidden rounded-xl bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10 has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        showRipple &&
          "[&>[data-slot]]:relative [&>[data-slot]]:z-10 [&>*:not([data-corner-ripple]):not([data-slot])]:z-10",
        className
      )}
      {...props}
    >
      {showRipple && <CornerRippleBackdrop {...rippleProps} />}
      {children}
    </div>
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-4 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "text-base leading-snug font-medium",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-4", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
}
