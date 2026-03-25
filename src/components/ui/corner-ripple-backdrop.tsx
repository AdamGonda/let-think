import * as React from "react"

import { cn } from "@/lib/utils"

export type CornerRippleCorner = "tl" | "tr" | "bl" | "br"

export type CornerRippleBackdropProps = {
  /**
   * Pool to choose from; **each loop** picks a new corner (random, not the same
   * as the previous when the pool has more than one corner).
   */
  corners?: CornerRippleCorner[]
  /**
   * How many rings are offset in time. More than one draws several arcs at once
   * and reads as a wide band — default is **1** (a single hairline ripple).
   */
  ringCount?: number
  /** Duration of one full ripple cycle in seconds (default: 10). */
  durationSec?: number
  /** Hairline stroke in CSS px (default: 0.5; non-scaling). */
  strokeWidth?: number
  /** Opacity of the stroke only (default: 0.45). */
  strokeOpacity?: number
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

function pickDifferentCorner(
  pool: CornerRippleCorner[],
  previous: CornerRippleCorner,
): CornerRippleCorner {
  if (pool.length <= 1) return pool[0]!
  const others = pool.filter((c) => c !== previous)
  return others[Math.floor(Math.random() * others.length)]!
}

export function CornerRippleBackdrop({
  corners,
  ringCount = 1,
  durationSec = 10,
  strokeWidth = 0.5,
  strokeOpacity = 0.45,
  className,
  ...props
}: CornerRippleBackdropProps &
  Omit<React.ComponentProps<"div">, keyof CornerRippleBackdropProps>) {
  const pool = React.useMemo((): CornerRippleCorner[] => {
    if (corners != null && corners.length > 0) return corners
    return ["tl", "tr", "bl", "br"]
  }, [corners])

  const [activeCorner, setActiveCorner] = React.useState(() =>
    pickRandomCorner(pool),
  )

  const onRippleLoop = React.useCallback(() => {
    setActiveCorner((prev) => pickDifferentCorner(pool, prev))
  }, [pool])

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
            key={activeCorner}
            transform={CORNER_TRANSFORMS[activeCorner](w, h)}
          >
            {Array.from({ length: nRings }, (_, i) => (
              <circle
                key={i}
                cx={0}
                cy={0}
                r={1}
                fill="none"
                stroke="var(--color-muted-foreground)"
                strokeOpacity={strokeOpacity}
                strokeWidth={strokeWidth}
                vectorEffect="nonScalingStroke"
                pointerEvents="none"
                className="pointer-events-none animate-corner-ripple"
                style={{
                  transformOrigin: "0px 0px",
                  animationDelay: `${(i * staggerMs) / 1000}s`,
                }}
                onAnimationIteration={
                  i === 0 && nRings === 1 ? onRippleLoop : undefined
                }
              />
            ))}
          </g>
        </svg>
      )}
    </div>
  )
}
