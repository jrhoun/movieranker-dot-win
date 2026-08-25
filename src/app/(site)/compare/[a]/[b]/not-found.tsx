import Link from "next/link";

export default function CompareNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 py-20 text-center">
      <p aria-hidden="true" className="font-mono text-5xl font-bold text-accent">
        404
      </p>
      <h1 className="text-xl font-bold">This versus isn&apos;t on the bill.</h1>
      <p className="max-w-xs text-sm text-muted">
        One of these rankings doesn&apos;t exist, was never finished, or is
        private. Both lists must be finished and visible for a face-off.
      </p>
      <Link
        href="/"
        className="mt-3 flex min-h-11 items-center rounded bg-accent px-6 font-semibold text-bg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]"
      >
        Rank your own
      </Link>
    </main>
  );
}
