import { Pie, PieChart } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

function renderPieLabel({ cx, cy, midAngle, outerRadius, name, value }) {
  const radius = outerRadius + 26;
  const radians = (Math.PI / 180) * -midAngle;
  const x = cx + radius * Math.cos(radians);
  const y = cy + radius * Math.sin(radians);

  return (
    <text
      className="fill-muted-foreground text-xs"
      dominantBaseline="central"
      textAnchor={x > cx ? "start" : "end"}
      x={x}
      y={y}
    >
      {name}
    </text>
  );
}

export default function PieChartCard({
  title = "",
  desc = "",
  chartData,
  chartConfig,
  className = "",
  chartClassName = "",
}) {
  return (
    <Card className={className}>
      <CardHeader className="gap-0.5">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <ChartContainer config={chartConfig} className={chartClassName}>
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  nameKey="name"
                  formatter={(value, name) => (
                    <>
                      <span className="text-muted-foreground">{name}</span>
                      <span className="ml-auto font-mono font-medium tabular-nums text-secondary-foreground">
                        {Number(value).toFixed(2)}%
                      </span>
                    </>
                  )}
                />
              }
            />
            <Pie
              data={chartData}
              dataKey="value"
              label={renderPieLabel}
              // labelLine={{ stroke: "var(--foreground)" }}
              nameKey="name"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
