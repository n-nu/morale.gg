import Link from "next/link";

export default function UnitNotFound() {
  return (
    <>
      <h1 className="text-3xl font-semibold">Unit not found</h1>
      <p className="mt-3 text-neutral-400">This unit does not exist or is no longer available.</p>
      <Link href="/units" className="mt-5 inline-block py-2 text-white underline">Browse all units</Link>
    </>
  );
}
