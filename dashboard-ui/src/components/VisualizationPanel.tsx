import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardData } from '../types/dashboard';

interface VisualizationPanelProps {
  data: DashboardData['visualizations'];
}

const COLORS = ['#22c55e', '#38bdf8', '#f59e0b', '#f43f5e'];

export function VisualizationPanel({ data }: VisualizationPanelProps) {
  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 shadow-[0_18px_36px_rgba(2,10,26,0.32)]">
        <h2 className="mb-4 text-lg font-semibold text-slate-100">Execution Trend</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.testTrend}>
              <CartesianGrid strokeDasharray="4 4" stroke="#334155" />
              <XAxis dataKey="run" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                cursor={{ fill: 'rgba(15, 23, 42, 0.45)' }}
                contentStyle={{ background: '#0f172a', border: '1px solid #334155' }}
              />
              <Legend />
              <Bar dataKey="passed" fill="#22c55e" radius={[8, 8, 0, 0]} />
              <Bar dataKey="failed" fill="#f43f5e" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 shadow-[0_18px_36px_rgba(2,10,26,0.32)]">
        <h2 className="mb-4 text-lg font-semibold text-slate-100">Event Distribution</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #334155' }}
                formatter={value => [`${value}`, 'Count']}
              />
              <Legend />
              <Pie
                data={data.eventDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label
              >
                {data.eventDistribution.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </article>
    </section>
  );
}
