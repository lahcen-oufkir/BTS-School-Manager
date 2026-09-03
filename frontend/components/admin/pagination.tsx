"use client";

import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  lastPage: number;
  total: number;
  onPageChange: (page: number) => void;
  pageLabel: string;
  totalLabel: string;
}

export function Pagination({ page, lastPage, total, onPageChange, pageLabel, totalLabel }: PaginationProps) {
  if (lastPage <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-5 py-3">
      <p className="text-xs text-slate-500">
        {total} {totalLabel} · {page} / {lastPage}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {pageLabel} →
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= lastPage}
          onClick={() => onPageChange(page + 1)}
        >
          ← {pageLabel}
        </Button>
      </div>
    </div>
  );
}