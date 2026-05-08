import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  type ChartOptions,
  type TooltipItem,
  Tooltip
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { formatCurrency } from "../lib/format";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

const lineOptions: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context: TooltipItem<"line">) => formatCurrency.format(context.parsed.y ?? 0)
      }
    }
  },
  scales: {
    x: { grid: { display: false } },
    y: {
      ticks: {
        callback: (value: string | number) => formatCurrency.format(Number(value))
      }
    }
  }
};

const barOptions: ChartOptions<"bar"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context: TooltipItem<"bar">) => formatCurrency.format(context.parsed.y ?? 0)
      }
    }
  },
  scales: {
    x: { grid: { display: false } },
    y: {
      ticks: {
        callback: (value) => formatCurrency.format(Number(value))
      }
    }
  }
};

export function LineChart({ title, values, color }: { title: string; values: number[]; color: string }) {
  return (
    <section className="chart-panel">
      <h3>{title}</h3>
      <div className="chart-box">
        <Line
          options={lineOptions}
          data={{
            labels: values.map((_, index) => String(index)),
            datasets: [
              {
                data: values,
                borderColor: color,
                backgroundColor: `${color}22`,
                fill: true,
                tension: 0.32,
                pointRadius: 3
              }
            ]
          }}
        />
      </div>
    </section>
  );
}

export function BarChart({
  title,
  labels,
  values,
  colors
}: {
  title: string;
  labels: string[];
  values: number[];
  colors: string[];
}) {
  return (
    <section className="chart-panel">
      <h3>{title}</h3>
      <div className="chart-box">
        <Bar
          options={barOptions}
          data={{
            labels,
            datasets: [
              {
                data: values,
                backgroundColor: colors,
                borderRadius: 8
              }
            ]
          }}
        />
      </div>
    </section>
  );
}

export function MultiLineChart({
  title,
  labels,
  series
}: {
  title: string;
  labels: string[];
  series: Array<{ label: string; values: number[]; color: string }>;
}) {
  return (
    <section className="chart-panel">
      <h3>{title}</h3>
      <div className="chart-box">
        <Line
          options={{
            ...lineOptions,
            plugins: { ...lineOptions.plugins, legend: { display: true, position: "top" as const } }
          }}
          data={{
            labels,
            datasets: series.map((item) => ({
              label: item.label,
              data: item.values,
              borderColor: item.color,
              backgroundColor: `${item.color}20`,
              fill: false,
              tension: 0.32
            }))
          }}
        />
      </div>
    </section>
  );
}
