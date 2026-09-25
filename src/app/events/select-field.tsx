/**
 * Styled native select for fields restricted to defined options. The first
 * entry is blank so an optional choice can be cleared; with `required`, the
 * blank entry acts as a placeholder the form will not submit.
 */
export function SelectField({
  name,
  options,
  defaultValue = "",
  required = false,
  ariaLabel,
  blankLabel = "",
}: {
  name: string;
  options: string[];
  defaultValue?: string;
  required?: boolean;
  ariaLabel?: string;
  blankLabel?: string;
}) {
  return (
    <span className="relative block w-full">
      <select
        name={name}
        defaultValue={defaultValue}
        required={required}
        aria-label={ariaLabel}
        className="w-full appearance-none rounded-lg border border-edge-strong bg-background px-3.5 py-2.5 pr-9 text-sm font-semibold text-foreground"
      >
        <option value="">{blankLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </span>
  );
}
