import { SubNav } from "@/components/instrument/sub-nav";
import { DESK_PAGES } from "@/lib/routes";

/** Desk: the work that is not a unit — projects, the career lane, aptitude. */
export default function DeskLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SubNav label="Desk" items={DESK_PAGES} />
      {children}
    </>
  );
}
