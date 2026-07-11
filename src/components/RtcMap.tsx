"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toPercent } from "@/lib/geo";
import HOVER from "@/data/hover_shapes.json";

/**
 * The Town Center map. Rules:
 *  - No dots for places. Hovering (or keyboard-focusing) any named/addressed
 *    building shows its name/street number; clicking it starts a barrier
 *    report there.
 *  - The ONLY markers are barriers: numbered navy pins for documented
 *    barriers, red dots for community reports.
 *  - The whole area loads in view; + / − zoom in when needed.
 */

export type MapBarrier = {
  id: string; label: string; status: string;
  lat: number | null; lon: number | null; x: number | null; y: number | null;
};
export type MapReport = { id: string; snippet: string; lat: number | null; lon: number | null };
export type MapPlace = { name: string; addr: string | null; lat: number; lon: number };

type Shape = { label: string; d?: string; circle?: [number, number, number]; cx: number; cy: number; lat: number; lon: number };
const SHAPES = (HOVER as { vw: number; vh: number; shapes: Shape[] });

const STATUS_TEXT: Record<string, string> = {
  documented: "Documented", contacted: "Letter sent",
  awaiting: "Awaiting response", resolved: "Resolved",
};

export function RtcMap({ barriers, reports = [], onPlacePick }: {
  barriers: MapBarrier[]; reports?: MapReport[];
  onPlacePick?: (p: MapPlace) => void;
}) {
  const router = useRouter();
  const [zoom, setZoom] = useState(1);
  const [hover, setHover] = useState<Shape | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const pins = barriers
    .map((b, i) => {
      const pos = b.lat != null && b.lon != null ? toPercent(b.lat, b.lon)
        : b.x != null && b.y != null ? { x: b.x, y: b.y } : null;
      return pos ? { ...b, n: i + 1, ...pos } : null;
    })
    .filter((p): p is NonNullable<typeof p> => p !== null && p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100);

  const dots = reports
    .filter((r): r is MapReport & { lat: number; lon: number } => r.lat != null && r.lon != null)
    .map((r) => ({ ...r, ...toPercent(r.lat, r.lon) }))
    .filter((r) => r.x >= 0 && r.x <= 100 && r.y >= 0 && r.y <= 100);

  function pick(s: Shape) {
    const [name, addr] = s.label.includes(" · ") ? s.label.split(" · ") : [s.label, null];
    onPlacePick?.({ name, addr, lat: s.lat, lon: s.lon });
  }

  function setZoomKeepCenter(next: number) {
    const el = scroller.current;
    if (!el) return setZoom(next);
    const cx = (el.scrollLeft + el.clientWidth / 2) / (el.scrollWidth || 1);
    const cy = (el.scrollTop + el.clientHeight / 2) / (el.scrollHeight || 1);
    setZoom(next);
    requestAnimationFrame(() => {
      el.scrollLeft = cx * el.scrollWidth - el.clientWidth / 2;
      el.scrollTop = cy * el.scrollHeight - el.clientHeight / 2;
    });
  }

  return (
    <section aria-label="Map of Reston Town Center barriers" className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-moss">
          Hover any building for its name or address — click it to report a
          barrier there. Navy pins: documented barriers. Red dots: community
          reports. <a href="#add" className="font-semibold text-fern underline underline-offset-4">Skip past the map</a>
        </p>
        <div className="flex gap-2" role="group" aria-label="Map zoom">
          <button type="button" onClick={() => setZoomKeepCenter(Math.max(1, +(zoom - 0.5).toFixed(1)))} disabled={zoom <= 1} aria-label="Zoom out"
            className="h-11 w-11 rounded-lg border-2 border-fern bg-paper text-xl font-bold text-fern hover:bg-fern/10 disabled:opacity-40">−</button>
          <button type="button" onClick={() => setZoomKeepCenter(Math.min(4, +(zoom + 0.5).toFixed(1)))} disabled={zoom >= 4} aria-label="Zoom in"
            className="h-11 w-11 rounded-lg border-2 border-fern bg-paper text-xl font-bold text-fern hover:bg-fern/10 disabled:opacity-40">+</button>
        </div>
      </div>

      <div
        ref={scroller}
        tabIndex={0}
        role="region"
        aria-label={`Illustrated map, zoom ${zoom} of 4. The full Town Center is shown; zoom in for detail. Barrier markers and building hover targets follow.`}
        onKeyDown={(e) => {
          if (e.key === "+" || e.key === "=") { e.preventDefault(); setZoomKeepCenter(Math.min(4, zoom + 0.5)); }
          if (e.key === "-") { e.preventDefault(); setZoomKeepCenter(Math.max(1, zoom - 0.5)); }
        }}
        className={`mt-3 rounded-xl border border-moss/30 bg-[#eef2ed] ${zoom > 1 ? "max-h-[78vh] overflow-auto" : "overflow-hidden"}`}
      >
        <div className="relative" style={{ width: `${zoom * 100}%` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ART/rtc-basemap.svg" alt="" className="block w-full select-none" draggable={false} />

          {/* invisible hover/click layer: real building footprints */}
          {onPlacePick && (
            <svg viewBox={`0 0 ${SHAPES.vw} ${SHAPES.vh}`} className="absolute inset-0 h-full w-full" aria-label="Buildings and businesses — activate one to report a barrier there" role="group">
              {SHAPES.shapes.map((s, i) =>
                s.d ? (
                  <path key={i} d={s.d} fill="transparent" stroke="none" tabIndex={0} role="button"
                    aria-label={`Report a barrier at ${s.label}`}
                    className="cursor-pointer outline-none hover:fill-fern/20 focus-visible:fill-fern/25 focus-visible:stroke-fern focus-visible:stroke-[3px]"
                    onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(s)} onBlur={() => setHover(null)}
                    onClick={() => pick(s)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(s); } }} />
                ) : (
                  <circle key={i} cx={s.circle![0]} cy={s.circle![1]} r={s.circle![2]} fill="transparent" tabIndex={0} role="button"
                    aria-label={`Report a barrier at ${s.label}`}
                    className="cursor-pointer outline-none hover:fill-fern/25 focus-visible:fill-fern/30 focus-visible:stroke-fern focus-visible:stroke-[3px]"
                    onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(s)} onBlur={() => setHover(null)}
                    onClick={() => pick(s)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(s); } }} />
                )
              )}
            </svg>
          )}

          {/* the hover label */}
          {hover && (
            <div aria-hidden="true"
              style={{ left: `${(hover.cx / SHAPES.vw) * 100}%`, top: `${(hover.cy / SHAPES.vh) * 100}%` }}
              className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[130%] whitespace-nowrap rounded-md bg-pine px-2.5 py-1 font-body text-xs font-semibold text-white shadow">
              {hover.label}
            </div>
          )}

          {/* RED DOTS: community-reported barriers */}
          {dots.map((r) => (
            <button key={r.id} type="button"
              onClick={() => {
                const el = document.getElementById(`report-${r.id}`);
                el?.scrollIntoView({ behavior: "smooth", block: "center" });
                (el as HTMLElement | null)?.focus();
              }}
              style={{ left: `${r.x}%`, top: `${r.y}%` }}
              className="group absolute z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#C62828] ring-2 ring-white shadow hover:h-5 hover:w-5 focus-visible:h-5 focus-visible:w-5">
              <span className="sr-only">Reported barrier: {r.snippet}. Jump to it on the board.</span>
              <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-pine px-2 py-0.5 font-body text-xs font-semibold text-white group-hover:block group-focus-visible:block">
                {r.snippet}
              </span>
            </button>
          ))}

          {/* NAVY NUMBERED PINS: documented barriers */}
          {pins.map((p) => (
            <button key={p.id} type="button" onClick={() => router.push(`/barrier?id=${p.id}`)}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              className="group absolute z-10 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pine font-display text-base font-bold text-white shadow-md ring-2 ring-white hover:bg-fern focus-visible:bg-fern">
              {p.n}
              <span className="sr-only">: {p.label} — {STATUS_TEXT[p.status] ?? p.status}. Open the paper trail.</span>
              <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-pine px-2.5 py-1 font-body text-xs font-semibold text-white group-hover:block group-focus-visible:block">
                {p.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
