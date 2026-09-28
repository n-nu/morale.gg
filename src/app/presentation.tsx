import Link from "next/link";
import type { ReactNode } from "react";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function PageShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-[1280px] flex-1 px-6 pb-16 md:px-10 ${className}`}>
      {children}
    </div>
  );
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="pt-5 text-[13px] text-muted">
      <ol className="flex flex-wrap items-center gap-y-1">
        {items.map((item, index) => (
          <li key={`${item.href ?? item.label}-${index}`} className="inline-flex items-center">
            {index > 0 ? <span aria-hidden="true" className="mx-2 text-[#3e434b]">/</span> : null}
            {item.href ? (
              <Link href={item.href} className="text-muted transition-colors hover:text-foreground">
                {item.label}
              </Link>
            ) : (
              <span aria-current={index === items.length - 1 ? "page" : undefined} className={index === items.length - 1 ? "text-foreground" : undefined}>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeader({
  category,
  title,
  count,
  description,
  actions,
}: {
  category: string;
  title: string;
  count?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mt-5 flex flex-wrap items-end justify-between gap-4 border-b border-edge pb-5">
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-faint">{category}</p>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <h1 className="break-words text-[36px] font-extrabold leading-none tracking-tight text-white sm:text-[44px]">{title}</h1>
          {count !== undefined ? <span className="border border-edge-strong bg-surface-2 px-2.5 py-1 text-sm font-bold tabular-nums text-foreground">{count}</span> : null}
        </div>
        {description ? <div className="max-w-3xl text-sm leading-relaxed text-muted">{description}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}

export function SectionHeading({
  id,
  title,
  detail,
  level = 2,
}: {
  id?: string;
  title: string;
  detail?: ReactNode;
  level?: 2 | 3;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 border-b border-edge pb-2">
      <Heading id={id} className="text-base font-extrabold text-white">{title}</Heading>
      {detail ? <div className="text-xs text-muted">{detail}</div> : null}
    </div>
  );
}

export function PageEmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="border-y border-edge py-7">
      <h2 className="font-bold text-white">{title}</h2>
      {children ? <div className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted">{children}</div> : null}
    </div>
  );
}