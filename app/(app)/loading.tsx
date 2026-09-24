/**
 * What a page looks like while its data is on the way.
 *
 * Every page here is dynamic and the database is a round trip away, so a tap on
 * a tab used to do nothing visible until the whole next page arrived — on a
 * phone, long enough to tap again. This is shown the instant the route
 * changes: the same skeleton every page opens with (a legend line, a title,
 * then panels), drawn in hairlines so it reads as the instrument warming up
 * rather than as a spinner.
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-10" aria-busy="true">
      <p role="status" className="sr-only">
        Loading
      </p>
      <div className="space-y-2.5" aria-hidden>
        <span className="skeleton block h-2.5 w-28" />
        <span className="skeleton block h-6 w-44" />
      </div>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          aria-hidden
          className="rounded-panel border border-line-soft bg-ink-850/40 p-4 pt-5"
        >
          <span className="skeleton block h-2.5 w-24" />
          <span className="skeleton mt-4 block h-3 w-full" />
          <span className="skeleton mt-2.5 block h-3 w-4/5" />
          {i === 0 && <span className="skeleton mt-2.5 block h-3 w-3/5" />}
        </div>
      ))}
    </div>
  );
}
