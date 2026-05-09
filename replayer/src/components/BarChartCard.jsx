import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export function BarChartCard({
  title = "",
  desc = "",
  chartData,
  xLabel = "",
  yLabel = "",
  className = "",
  chartClassName = "",
}) {
  const showBarLabels = chartData.length <= 8;
  const chartConfig = {
    desktop: {
      label: yLabel,
      color: "var(--chart-6)",
    },
  };
  return (
    <Card className={className}>
      <CardHeader className="gap-0.5">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
      <CardContent className="pb-8">
        <ChartContainer config={chartConfig} className={chartClassName}>
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{ top: 28, right: 10, bottom: 34, left: 16 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              label={{
                value: xLabel,
                position: "insideBottom",
                dy: 28,
              }}
              dataKey={"name"}
              tickLine={true}
              tickMargin={8}
              axisLine={true}
            />
            <YAxis
              width={68}
              label={{
                value: yLabel,
                position: "insideLeft",
                dx: -52,
                dy: 24,
                angle: -90,
              }}
              tickMargin={8}
            ></YAxis>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey={"desktop"} fill="var(--color-desktop)" radius={8}>
              {showBarLabels ? (
                <LabelList
                  position="top"
                  offset={8}
                  className="fill-foreground"
                  fontSize={11}
                />
              ) : null}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
