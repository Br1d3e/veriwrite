export function MetricBox({ label, value, description }) {
  return (
    <div className="flex flex-col relative border-l border-secondary p-2">
      <span className="block uppercase text-sm font-light text-muted-foreground">
        {label}
      </span>
      <div className="text-sm font-sans">{value}</div>
    </div>
  );
}
