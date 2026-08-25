export default function LabelChip({ name, color = "#6B7280" }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {name}
    </span>
  );
}
