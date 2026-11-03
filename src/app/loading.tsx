export default function Loading() {
  return <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6" aria-busy="true">
    <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent motion-reduce:animate-none" /> Loading page…</p>
    <div aria-hidden="true" className="mt-8 space-y-5">
      <div className="h-10 w-56 rounded-lg bg-muted" />
      <div className="h-5 w-72 max-w-full rounded bg-muted" />
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {[0, 1, 2, 3].map((row) => <div key={row} className="border-b border-border p-6 last:border-0"><div className="h-5 w-2/3 rounded bg-muted" /></div>)}
      </div>
    </div>
  </main>;
}
