"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Text input with an always-available suggestion dropdown. Unlike a native
 * datalist — whose suggestions filter against the current value and so
 * "disappear" once one is chosen — the arrow button always opens the full
 * list, and picking an option replaces the value. Free text stays allowed.
 */
export function SuggestInput({
  name,
  options,
  defaultValue = "",
  placeholder,
  ariaLabel,
  className = "",
}: {
  name: string;
  options: string[];
  defaultValue?: string;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(pointerEvent: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(pointerEvent.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const hasOptions = options.length > 0;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="flex">
        <input
          name={name}
          value={value}
          onChange={(changeEvent) => setValue(changeEvent.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className={`w-full min-w-0 border border-edge-strong bg-background px-3.5 py-2.5 text-sm font-semibold text-foreground placeholder:text-faint ${
            hasOptions ? "rounded-l-lg" : "rounded-lg"
          }`}
        />
        {hasOptions ? (
          <button
            type="button"
            onClick={() => setOpen((wasOpen) => !wasOpen)}
            aria-expanded={open}
            aria-label={`Show ${ariaLabel ?? name} options`}
            className="flex items-center rounded-r-lg border border-l-0 border-edge-strong bg-background px-2.5 text-muted transition-colors hover:text-white"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              aria-hidden
              className={open ? "rotate-180" : undefined}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        ) : null}
      </div>
      {open && hasOptions ? (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-edge-strong bg-surface-2 py-1 shadow-[0_12px_32px_rgba(0,0,0,0.5)]"
        >
          {options.map((option) => (
            <li key={option}>
              <button
                type="button"
                onClick={() => {
                  setValue(option);
                  setOpen(false);
                }}
                className={`w-full px-3.5 py-2 text-left text-sm font-semibold transition-colors hover:bg-edge ${
                  option === value ? "text-gold" : "text-foreground"
                }`}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
