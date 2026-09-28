type OptionCardProps = {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export default function OptionCard({
  title,
  description,
  checked,
  onChange,
}: OptionCardProps) {
  return (
    <label
      className={`mb-0 flex cursor-pointer items-start gap-3 rounded-md border p-4 transition-colors ${
        checked
          ? "border-primary bg-primary-light dark:border-primary dark:bg-primary-dark-light"
          : "border-white-light bg-white hover:border-primary/50 dark:border-[#1b2e4b] dark:bg-black"
      }`}
    >
      <input
        type="checkbox"
        className="form-checkbox mt-0.5 shrink-0"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="flex flex-col gap-1">
        <span className="font-semibold text-black dark:text-white-light">
          {title}
        </span>
        <span className="text-xs font-normal text-white-dark">
          {description}
        </span>
      </span>
    </label>
  );
}
