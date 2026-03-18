import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

function ShadCNPagination({
  className,
  ...props
}: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={cn("flex w-full justify-center", className)}
      {...props}
    />
  );
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cn("flex flex-row items-center gap-1.5", className)}
      {...props}
    />
  );
}

function PaginationItem({
  onClick,
  children,
  className,
  ...props
}: React.ComponentProps<"li"> & { onClick?: () => void }) {
  const content = onClick ? (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center"
    >
      {children}
    </button>
  ) : (
    children
  );
  return (
    <li className={cn(className)} {...props}>
      {content}
    </li>
  );
}

type PaginationLinkProps = React.ComponentProps<"span"> & {
  isActive?: boolean;
};

function PaginationLink({
  className,
  isActive,
  children,
  ...props
}: PaginationLinkProps) {
  return (
    <span
      role="tab"
      aria-current={isActive ? "page" : undefined}
      aria-selected={isActive}
      className={cn(
        "inline-flex h-9 min-w-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors cursor-pointer",
        "border border-zinc-300 dark:border-zinc-600",
        "focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#16171d]",
        isActive
          ? "bg-red-500 border-red-500 text-white hover:bg-red-600"
          : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

function PaginationPrevious({
  className,
  onClick,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-label="Go to previous page"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm font-medium transition-colors",
        "border border-zinc-300 dark:border-zinc-600",
        "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700",
        "focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#16171d]",
        "cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    >
      <ChevronLeft className="h-4 w-4" />
    </button>
  );
}

function PaginationNext({
  className,
  onClick,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-label="Go to next page"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm font-medium transition-colors",
        "border border-zinc-300 dark:border-zinc-600",
        "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700",
        "focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#16171d]",
        "cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    >
      <ChevronRight className="h-4 w-4" />
    </button>
  );
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center text-zinc-500",
        className
      )}
      {...props}
    >
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">More pages</span>
    </span>
  );
}

const START_OF_THE_WINDOW_OFFSET = 2;
const END_OF_THE_WINDOW_OFFSET = 2;

export function Pagination({
  pageCount,
  pageNumber,
  onPageClick,
  onNextClick,
  onPreviousClick,
  className = "",
}: {
  pageCount: number;
  pageNumber: number;
  onPageClick: (pageNumber: number) => () => void;
  onNextClick: (pageNumber: number) => void;
  onPreviousClick: (pageNumber: number) => void;
  className?: string;
}) {
  const previousAllowed = pageNumber > 1;
  const nextAllowed = pageNumber < pageCount;

  const startOfTheWindow = pageNumber - START_OF_THE_WINDOW_OFFSET;
  const endOfTheWindow = pageNumber + END_OF_THE_WINDOW_OFFSET;
  const showFirstEllipsis = startOfTheWindow - 1 > 1;
  const showLastEllipsis = pageCount - endOfTheWindow > 1;

  const showFirstPageNumber = pageCount >= 1;
  const showLastPageNumber = pageCount >= 2;

  const skipRender = (currentPage: number) => {
    return (
      currentPage === 1 ||
      currentPage === pageCount ||
      currentPage > endOfTheWindow ||
      currentPage < startOfTheWindow
    );
  };

  function handlePreviousClick() {
    if (previousAllowed) {
      onPreviousClick(pageNumber);
    }
  }

  function handleNextClick() {
    if (nextAllowed) {
      onNextClick(pageNumber);
    }
  }

  const disabledStyle = "cursor-not-allowed opacity-25";

  if (pageCount === 0) return null;

  return (
    <>
      {/* DESKTOP VERSION */}
      <div className="hidden md:flex md:items-center md:justify-center">
        <ShadCNPagination className={className}>
          <PaginationContent className="list-none p-0 m-0">
            <PaginationItem>
              <PaginationPrevious
                className={!previousAllowed ? disabledStyle : ""}
                onClick={handlePreviousClick}
              />
            </PaginationItem>

            {showFirstPageNumber && (
              <PaginationItem onClick={onPageClick(1)}>
                <PaginationLink isActive={pageNumber === 1}>1</PaginationLink>
              </PaginationItem>
            )}

            {showFirstEllipsis && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            {Array.from({ length: pageCount }, (_, index) => {
              const currentPage = index + 1;
              const isActive = currentPage === (pageNumber ?? 1);

              if (skipRender(currentPage)) {
                return null;
              }

              return (
                <PaginationItem
                  key={currentPage}
                  onClick={onPageClick(currentPage)}
                >
                  <PaginationLink isActive={isActive}>{currentPage}</PaginationLink>
                </PaginationItem>
              );
            })}

            {showLastEllipsis && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            {showLastPageNumber && (
              <PaginationItem onClick={onPageClick(pageCount)}>
                <PaginationLink isActive={pageNumber === pageCount}>
                  {pageCount}
                </PaginationLink>
              </PaginationItem>
            )}

            <PaginationItem>
              <PaginationNext
                className={!nextAllowed ? disabledStyle : ""}
                onClick={handleNextClick}
              />
            </PaginationItem>
          </PaginationContent>
        </ShadCNPagination>
      </div>

      {/* MOBILE VERSION */}
      <div className="flex md:hidden items-center justify-center gap-2">
        <ShadCNPagination className={className}>
          <PaginationContent className="list-none p-0 m-0">
            <PaginationItem>
              <PaginationPrevious
                className={!previousAllowed ? disabledStyle : ""}
                onClick={handlePreviousClick}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="px-2 text-sm text-zinc-600 dark:text-zinc-400">
                {pageNumber} / {pageCount}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                className={!nextAllowed ? disabledStyle : ""}
                onClick={handleNextClick}
              />
            </PaginationItem>
          </PaginationContent>
        </ShadCNPagination>
      </div>
    </>
  );
}

export {
  ShadCNPagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
