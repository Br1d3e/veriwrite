import {
  Line,
  LineChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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

export default function LineChartCard({
  title = "",
  desc = "",
  chartData,
  xLabel = "",
  yLabel = "",
  normalizedGraph,
  setNormalizedGraph,
  scaleDomain = false,
  className = "",
  chartClassName = "",
}) {
  const showBarLabels = chartData.length <= 8;
  const chartConfig = {
    desktop: {
      label: yLabel,
      color: "var(--chart-6)",
    },
    fit: {
      label: "Fit",
      color: "var(--destructive)",
    },
  };
  return (
    <Card className={className}>
      <CardHeader className="gap-0.5">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{title}</CardTitle>
          {typeof normalizedGraph === "boolean" && setNormalizedGraph ? (
            <div className="flex items-center gap-2">
              <Checkbox
                id="normalized-graph-toggle"
                checked={normalizedGraph}
                onCheckedChange={(checked) =>
                  setNormalizedGraph(checked === true)
                }
              />
              <Label
                htmlFor="normalized-graph-toggle"
                className="text-sm text-muted-foreground"
              >
                Normalized
              </Label>
            </div>
          ) : null}
        </div>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <ChartContainer config={chartConfig} className={chartClassName}>
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{ top: 15, right: 10, bottom: 25, left: 16 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              label={{
                value: xLabel,
                position: "insideBottom",
                dy: 28,
              }}
              dataKey={"x"}
              type="number"
              domain={normalizedGraph ? [0, 1] : ["dataMin", "dataMax"]}
              tickFormatter={(value) =>
                normalizedGraph ? value.toFixed(2) : value.toFixed(0)
              }
              tickLine={true}
              tickMargin={8}
              tickCount={6}
              axisLine={true}
            />
            <YAxis
              width={68}
              label={{
                value: yLabel,
                position: "insideLeft",
                dx: -10,
                dy: 24,
                angle: -90,
              }}
              domain={
                scaleDomain
                  ? normalizedGraph
                    ? [0, 1]
                    : ["dataMin", "dataMax"]
                  : null
              }
              tickMargin={8}
            ></YAxis>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Line
              dataKey={"desktop"}
              type={"linear"}
              stroke="var(--color-desktop)"
              strokeWidth={1.25}
              dot={false}
            >
              {showBarLabels ? (
                <LabelList
                  position="top"
                  offset={8}
                  className="fill-foreground"
                  fontSize={11}
                />
              ) : null}
            </Line>
            {normalizedGraph ? (
              <Line
                dataKey={"fit"}
                type={"linear"}
                stroke="var(--color-fit)"
                strokeDasharray="5 5"
                strokeWidth={1.5}
                dot={false}
              />
            ) : null}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
