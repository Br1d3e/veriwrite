export default function Title({
  title = "VeriWrite Record Replayer",
  className = "",
}) {
  return (
    <>
      <h1 className={`text-3xl font-bold justify-self-center ${className}`}>
        {title}
      </h1>
    </>
  );
}
