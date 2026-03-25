import * as React from "react"

import { cn } from "@/lib/utils"

export type CornerRippleCorner = "tl" | "tr" | "bl" | "br"

export type CornerRippleBackdropProps = {
  /**
   * Pool of corners to choose from; **one corner is picked at random** when the
   * component mounts and stays fixed for its lifetime. Defaults to all four corners.
   */
  corners?: CornerRippleCorner[]
  /**
   * How many rings are offset in time. More than one draws several arcs at once
   * and reads as a wide band — default is **1** (a single hairline ripple).
   */
  ringCount?: number
  /** Duration of one ring cycle in seconds (default: 5). */
  durationSec?: number
  /** Hairline stroke in CSS px (default: 0.5; non-scaling). */
  strokeWidth?: number
  className?: string
}

const CORNER_TRANSFORMS: Record<
  CornerRippleCorner,
  (w: number, h: number) => string
> = {
  tl: () => "translate(0, 0)",
  tr: (w) => `translate(${w}, 0)`,
  bl: (_, h) => `translate(0, ${h})`,
  br: (w, h) => `translate(${w}, ${h})`,
}

function pickRandomCorner(pool: CornerRippleCorner[]): CornerRippleCorner {
  return pool[Math.floor(Math.random() * pool.length)]!
}

export function CornerRippleBackdrop({
  corners,
  ringCount = 1,
  durationSec = 5,
  strokeWidth = 0.5,
  className,
  ...props
}: CornerRippleBackdropProps &
  Omit<React.ComponentProps<"div">, keyof CornerRippleBackdropProps>) {
  const pool: CornerRippleCorner[] =
    corners != null && corners.length > 0
      ? corners
      : ["tl", "tr", "bl", "br"]

  const [activeCorner] = React.useState(() => pickRandomCorner(pool))

  const containerRef = React.useRef<HTMLDivElement>(null)
  const [size, setSize] = React.useState({ w: 0, h: 0 })

  React.useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return

    const update = () => {
      const { width, height } = el.getBoundingClientRect()
      setSize({ w: width, h: height })
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { w, h } = size
  const maxScale = w > 0 && h > 0 ? Math.hypot(w, h) * 1.05 : 1
  const durationMs = durationSec * 1000
  const nRings = Math.max(1, ringCount)
  const staggerMs = durationMs / nRings

  return (
    <div
      ref={containerRef}
      data-corner-ripple
      aria-hidden
      className={cn(
        "corner-ripple-backdrop pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]",
        className
      )}
      {...props}
    >
      {w > 0 && h > 0 && (
        <svg
          className="pointer-events-none"
          width="100%"
          height="100%"
          viewBox={`0 0 ${w} ${h}`}
          shapeRendering="geometricPrecision"
          pointerEvents="none"
          style={
            {
              ["--corner-ripple-max-scale" as string]: String(maxScale),
              ["--corner-ripple-duration" as string]: `${durationSec}s`,
            } as React.CSSProperties
          }
        >
          <g
            transform={CORNER_TRANSFORMS[activeCorner](w, h)}
            className="text-current"
          >
            {Array.from({ length: nRings }, (_, i) => (
              <circle
                key={i}
                cx={0}
                cy={0}
                r={1}
                fill="none"
                stroke="var(--color-muted-foreground)"
                strokeOpacity={0.4}
                strokeWidth={strokeWidth}
                vectorEffect="nonScalingStroke"
                pointerEvents="none"
                className="pointer-events-none animate-corner-ripple"
                style={{
                  transformOrigin: "0px 0px",
                  animationDelay: `${(i * staggerMs) / 1000}s`,
                }}
              />
            ))}
          </g>
        </svg>
      )}
    </div>
  )
}
