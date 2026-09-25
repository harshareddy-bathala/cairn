import { SubNav } from "@/components/instrument/sub-nav";
import { PROGRESS_PAGES } from "@/lib/routes";

/** Progress: the numbers, the certificates, and everyone else's cairn. */
export default function ProgressLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SubNav label="Progress" items={PROGRESS_PAGES} />
      {children}
    </>
  );
}
