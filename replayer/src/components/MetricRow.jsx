export default function MetricRow({
  label,
  value,
  valueColor = "",
  className = "",
}) {
  return (
    <div
      className={`flex min-w-0 items-center justify-between gap-4 bg-background py-1 ${className}`}
    >
      <span className="shrink-0 text-xs font-medium uppercase text-muted-foreground/85">
        {label}
      </span>
      <span
        className={`min-w-0 truncate text-right text-sm font-medium leading-5 ${valueColor}`}
      >
        {value}
      </span>
    </div>
  );
}
