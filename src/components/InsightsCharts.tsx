/**
 * Insights charts (recharts). Lazy-loaded as its own chunk so the charting
 * library is only downloaded when the Insights dashboard opens.
 */

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const COLORS = ["#C4572F", "#1F6F6B", "#E0A526"];

export function ChangeTypeDonut({ distribution }: {
  distribution: { spelling: number; meaning: number; usage: number; totalChanges: number };
}) {
  const data = [
    { name: "Spelling", value: distribution.spelling },
    { name: "Meaning", value: distribution.meaning },
    { name: "Usage", value: distribution.usage },
  ];
  return (
    <div role="img" aria-label={`Change types: spelling ${distribution.spelling} percent, meaning ${distribution.meaning} percent, usage ${distribution.usage} percent`}>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      <div className="donut-legend">
        {data.map((d, i) => (
          <span key={d.name}>
            <i style={{ background: COLORS[i % COLORS.length] }} />{d.name} <b>{d.value}%</b>
          </span>
        ))}
      </div>
    </div>
  );
}

export function WordsPerPeriodBar({ rows }: {
  rows: Array<{ periodId: string; name: string; nameTa: string; count: number }>;
}) {
  const data = rows.map((r) => ({ name: r.name, count: r.count }));
  return (
    <div role="img" aria-label="Words indexed per historical period">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-18} dy={8} height={52} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="count" fill="#1F6F6B" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function InsightsChartsPanel({ data }: {
  data: {
    changeTypeDistribution: { spelling: number; meaning: number; usage: number; totalChanges: number };
    wordsPerPeriod: Array<{ periodId: string; name: string; nameTa: string; count: number }>;
    driftHeatmap: number[][];
  };
}) {
  const labels = data.wordsPerPeriod.map((p) => p.name);
  return (
    <>
      <div className="dash-card">
        <span className="kicker">CHANGE TYPES</span>
        <h3 className="ta">மாற்ற வகைகள்</h3>
        <ChangeTypeDonut distribution={data.changeTypeDistribution} />
      </div>
      <div className="dash-card wide">
        <div className="card-head">
          <div><span className="kicker">WORDS PER PERIOD</span><h3 className="ta">காலவாரியாகச் சொற்கள்</h3></div>
        </div>
        <WordsPerPeriodBar rows={data.wordsPerPeriod} />
      </div>
      <div className="dash-card heat-card">
        <span className="kicker">SEMANTIC DRIFT HEATMAP</span>
        <h3 className="ta">காலங்களுக்கிடையேயான பொருள் மாற்றம்</h3>
        <DriftHeatmap matrix={data.driftHeatmap} labels={labels} />
      </div>
    </>
  );
}

export function DriftHeatmap({ matrix, labels }: { matrix: number[][]; labels: string[] }) {
  const max = Math.max(1, ...matrix.flat());
  return (
    <div>
      <div className="heatmap-grid" style={{ gridTemplateColumns: `repeat(${labels.length}, 1fr)` }} role="img"
        aria-label="Semantic drift heatmap across periods">
        {matrix.map((row, r) =>
          row.map((v, c) => (
            <i key={`${r}-${c}`} title={`${labels[r]} → ${labels[c]}: ${v}`}
              style={{ opacity: 0.15 + (v / max) * 0.85 }} />
          ))
        )}
      </div>
      <div className="heat-label"><span>{labels[0]}</span><span>{labels[labels.length - 1]}</span></div>
    </div>
  );
}
