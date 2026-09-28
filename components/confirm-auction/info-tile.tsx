export default function InfoTile({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-white-light bg-[#f9fafb] p-4 dark:border-[#1b2e4b] dark:bg-[#0e1726]">
      <div className="text-xs text-white-dark">{label}</div>
      <div className="mt-1 break-words font-semibold text-black dark:text-white-light">
        {value || "—"}
      </div>
    </div>
  );
}
