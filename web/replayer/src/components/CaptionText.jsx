export default function CaptionText({
  text,
  color = "text-gray-500",
  size = "text-lg",
  font = "font-light",
  className = "",
}) {
  return (
    <>
      <span className={`${color} ${size} ${font} ${className}`}>{text}</span>
    </>
  );
}
