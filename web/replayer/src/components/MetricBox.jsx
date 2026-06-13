export function MetricBox({
  label,
  value,
  description,
  valueColor = "",
  className = "",
}) {
  return (
    <div
      className={`relative flex min-w-0 flex-col gap-1 my-1 bg-background p-1 ${className}`}
    >
      <span className="block truncate text-xs font-medium uppercase text-muted-foreground/85">
        {label}
      </span>
      <div className={`min-w-0 text-sm font-medium leading-5 ${valueColor}`}>
        {value}
      </div>
      {description ? (
        <div className="text-xs leading-4 text-muted-foreground">
          {description}
        </div>
      ) : null}
    </div>
  );
}
