import React from "react";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Page numbers with ellipsis.
 * - total <= 5: show every page
 * - total > 5: window of ±3 around current
 * - total > 100: window of ±10 around current
 */
export function getPages(current, total) {
    if (total <= 5) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    const delta = total > 100 ? 10 : 3;
    const pages = [1];

    let start = Math.max(2, current - delta);
    let end = Math.min(total - 1, current + delta);

    if (current <= 1 + delta) {
        start = 2;
        end = Math.min(total - 1, 1 + delta * 2 + 1);
    } else if (current >= total - delta) {
        end = total - 1;
        start = Math.max(2, total - delta * 2 - 1);
    }

    if (start > 2) {
        pages.push("...");
    }

    for (let i = start; i <= end; i++) {
        pages.push(i);
    }

    if (end < total - 1) {
        pages.push("...");
    }

    if (total > 1) {
        pages.push(total);
    }

    return pages;
}

function resolvePerPageOptions(itemsPerPage, itemsPerPageOptions) {
    return itemsPerPageOptions.includes(itemsPerPage)
        ? itemsPerPageOptions
        : [...new Set([...itemsPerPageOptions, itemsPerPage])].sort((a, b) => a - b);
}

function usePaginationState({
    page,
    totalPages,
    totalItems,
    itemsPerPage,
}) {
    const current = Number(page);
    const total = Math.max(1, Number(totalPages));
    const pages = getPages(current, total);
    const startItem = totalItems ? (current - 1) * itemsPerPage + 1 : null;
    const endItem = totalItems ? Math.min(current * itemsPerPage, totalItems) : null;

    return { current, total, pages, startItem, endItem };
}

/**
 * @param {string} mode - 'toolbar' (above cards) | 'nav' (below cards) | 'full' (both in one panel)
 */
export default function GlobalPagination({
    page = 1,
    totalPages = 1,
    onPageChange,
    totalItems,
    itemsPerPage = 10,
    onItemsPerPageChange,
    showFirstLast = false,
    showItemsPerPage = false,
    itemsPerPageOptions = [10, 20, 50, 100],
    showInfo = true,
    variant = "default",
    mode = "full",
}) {
    const { current, total, pages, startItem, endItem } = usePaginationState({
        page,
        totalPages,
        totalItems,
        itemsPerPage,
    });

    const perPageOptions = resolvePerPageOptions(itemsPerPage, itemsPerPageOptions);

    const hasToolbar = (showInfo && totalItems != null) || (showItemsPerPage && onItemsPerPageChange);

    if (mode === "toolbar") {
        if (!totalItems || !hasToolbar) return null;
    }

    if (mode === "nav") {
        if (!totalItems) return null;
    }

    if (mode === "full" && total <= 1 && !showItemsPerPage) {
        return null;
    }

    // Compact variant
    if (variant === "compact") {
        return (
            <div className="flex items-center space-between gap-4 py-4">
                {showInfo && totalItems && (
                    <p className="text-sm text-muted-foreground">
                        {startItem}-{endItem} of {totalItems}
                    </p>
                )}
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(current - 1)}
                        disabled={current === 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium px-2">
                        {current} / {total}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(current + 1)}
                        disabled={current === total}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        );
    }

    // Minimal variant
    if (variant === "minimal") {
        return (
            <div className="flex items-center justify-center gap-2 py-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onPageChange(current - 1)}
                    disabled={current === 1}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground min-w-[80px] text-center">
                    Page {current} of {total}
                </span>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onPageChange(current + 1)}
                    disabled={current === total}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        );
    }

    const perPageSelect =
        showItemsPerPage && onItemsPerPageChange ? (
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Per page</span>
                <Select
                    value={String(itemsPerPage)}
                    onValueChange={(value) => onItemsPerPageChange(Number(value))}
                >
                    <SelectTrigger className="h-9 w-20 bg-background">
                        <SelectValue placeholder={String(itemsPerPage)} />
                    </SelectTrigger>
                    <SelectContent side="bottom" align="start" position="popper">
                        {perPageOptions.map((option) => (
                            <SelectItem key={option} value={String(option)}>
                                {option}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        ) : null;

    const toolbar = hasToolbar ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-6 sm:gap-y-2">
            {showInfo && totalItems != null && (
                <p className="text-sm text-muted-foreground">
                    Showing{" "}
                    <span className="font-medium text-foreground">{startItem}</span>
                    {" – "}
                    <span className="font-medium text-foreground">{endItem}</span>
                    {" of "}
                    <span className="font-medium text-foreground">{totalItems}</span>
                </p>
            )}
            {perPageSelect}
        </div>
    ) : null;

    const pageControls = (
        <Pagination className="mx-0 w-auto justify-center sm:justify-end">
            <PaginationContent>
                {showFirstLast && (
                    <PaginationItem>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => onPageChange(1)}
                            disabled={current === 1}
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                    </PaginationItem>
                )}
                <PaginationItem>
                    <PaginationPrevious
                        onClick={() => current > 1 && onPageChange(current - 1)}
                        className={current === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                </PaginationItem>
                {pages.map((p, index) => (
                    <PaginationItem key={index} className="hidden sm:block">
                        {p === "..." ? (
                            <span className="flex h-9 w-9 items-center justify-center text-muted-foreground">…</span>
                        ) : (
                            <PaginationLink
                                isActive={current === p}
                                onClick={() => onPageChange(p)}
                                className="cursor-pointer"
                            >
                                {p}
                            </PaginationLink>
                        )}
                    </PaginationItem>
                ))}
                <PaginationItem className="sm:hidden">
                    <span className="flex h-9 px-3 items-center text-sm font-medium">
                        {current} / {total}
                    </span>
                </PaginationItem>
                <PaginationItem>
                    <PaginationNext
                        onClick={() => current < total && onPageChange(current + 1)}
                        className={current === total ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                </PaginationItem>
                {showFirstLast && (
                    <PaginationItem>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => onPageChange(total)}
                            disabled={current === total}
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </PaginationItem>
                )}
            </PaginationContent>
        </Pagination>
    );

    if (mode === "toolbar") {
        return (
            <div className="rounded-xl border bg-muted/40 px-4 py-3 sm:px-5">
                {toolbar}
            </div>
        );
    }

    if (mode === "nav") {
        return (
            <div className="rounded-xl border bg-muted/40 px-4 py-4 sm:px-6">
                <div className="flex justify-center sm:justify-end">{pageControls}</div>
            </div>
        );
    }

    // full — single panel (admin tables without split layout)
    if (variant === "split" || variant === "default") {
        return (
            <div className="rounded-xl border bg-muted/40 px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-4">
                    {toolbar}
                    <div
                        className={
                            toolbar
                                ? "flex justify-center border-t border-border/50 pt-4 sm:justify-end"
                                : "flex justify-center sm:justify-end"
                        }
                    >
                        {pageControls}
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
