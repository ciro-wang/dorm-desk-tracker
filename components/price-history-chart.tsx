"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartRow } from "@/lib/chart";

const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
const STORE_COLOURS = ["var(--stone-400)", "var(--sage-500)", "var(--clay-500)", "#7d6a58", "#9c8b6e"];

export function PriceHistoryChart({
  data,
  stores,
  targetDollars,
  msrpDollars,
}: {
  data: ChartRow[];
  stores: { slug: string; name: string }[];
  targetDollars: number;
  msrpDollars: number;
}) {
  if (data.length < 2) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        Not enough history yet. The chart fills in as prices are checked each day.
      </p>
    );
  }
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="var(--walnut-600)" strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: "var(--stone-400)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--walnut-600)" }} minTickGap={24} />
          <YAxis
            tickFormatter={(v: number) => cad.format(v)}
            tick={{ fill: "var(--stone-400)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={72}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{ background: "var(--walnut-800)", border: "1px solid var(--walnut-600)", borderRadius: 8, color: "var(--rice-100)" }}
            formatter={(v) => cad.format(Number(v))}
          />
          <ReferenceLine y={targetDollars} ifOverflow="extendDomain" stroke="var(--sage-500)" strokeDasharray="4 4" label={{ value: "Target", fill: "var(--sage-500)", fontSize: 11, position: "insideTopLeft" }} />
          <ReferenceLine y={msrpDollars} ifOverflow="extendDomain" stroke="var(--stone-400)" strokeDasharray="4 4" label={{ value: "MSRP", fill: "var(--stone-400)", fontSize: 11, position: "insideTopLeft" }} />
          {stores.map((s, i) => (
            <Line key={s.slug} type="stepAfter" dataKey={s.slug} name={s.name} stroke={STORE_COLOURS[i % STORE_COLOURS.length]} strokeWidth={1} dot={false} connectNulls />
          ))}
          <Line type="stepAfter" dataKey="best" name="Best price" stroke="var(--oak-500)" strokeWidth={3} dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
