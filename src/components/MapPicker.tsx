"use client";

import { useState } from "react";
import { fromPercent, toPercent } from "@/lib/geo";

/** Tap the illustrated map to mark where the barrier is (optional). */
export function MapPicker({
  value,
  onChange,
}: {
  value: { lat: number; lon: number } | null;
  onChange: (v: { lat: number; lon: number } | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const pos = value ? toPercent(value.lat, value.lon) : null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="rounded-lg border-2 border-fern px-4 py-2 text-sm font-semibold text-fern hover:bg-fern/10"
      >
        {value ? "Spot marked on the map ✓ (change)" : "Mark the spot on the map (optional)"}
      </button>
      {open && (
        <div className="mt-3">
          <p className="text-sm text-moss">
            Tap (or click) where the barrier is. This works for Reston Town
            Center — elsewhere, the written location is all we need.
          </p>
          <div className="relative mt-2 overflow-hidden rounded-xl border border-moss/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/ART/rtc-basemap.svg"
              alt="Map of Reston Town Center. Activate a point to mark the barrier's location."
              className="block w-full cursor-crosshair select-none"
              draggable={false}
              onClick={(e) => {
                const rect = (e.target as HTMLImageElement).getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                onChange(fromPercent(x, y));
              }}
            />
            {pos && (
              <span
                aria-hidden="true"
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-fern shadow"
              />
            )}
          </div>
          {value && (
            <button type="button" onClick={() => onChange(null)}
              className="mt-2 text-sm font-semibold text-moss underline underline-offset-4">
              Remove the mark
            </button>
          )}
        </div>
      )}
    </div>
  );
}
