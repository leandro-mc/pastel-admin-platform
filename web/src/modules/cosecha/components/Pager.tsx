import { Button } from "@/core/ui";
import { strings } from "../strings";

type Props = {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
};

export function Pager({ page, totalPages, onPage }: Props) {
  if (totalPages <= 1) return null;
  return (
    <nav
      aria-label="Paginación"
      className="flex flex-wrap items-center justify-between gap-3 px-1 py-3"
    >
      <Button
        variant="secondary"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        {strings.common.previousPage}
      </Button>
      <span className="text-sm text-muted">
        {strings.common.pageOf(page, totalPages)}
      </span>
      <Button
        variant="secondary"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        {strings.common.nextPage}
      </Button>
    </nav>
  );
}
