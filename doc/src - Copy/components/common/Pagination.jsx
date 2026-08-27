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
 * Generate page numbers with intelligent ellipsis
 */
function getPages(current, total) {
    const pages = [];

    // If total pages <= 7, show all pages
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    // Always show first page
    pages.push(1);

    // Calculate range around current page
    let start = Math.max(2, current - 1);
    let end = Math.min(total - 1, current + 1);

    // Adjust range if near start or end
    if (current <= 3) {
        end = 4;
    } else if (current >= total - 2) {
        start = total - 3;
    }

    // Add ellipsis after first page if needed
    if (start > 2) {
        pages.push("...");
    }

    // Add range pages
    for (let i = start; i <= end; i++) {
        pages.push(i);
    }

    // Add ellipsis before last page if needed
    if (end < total - 1) {
        pages.push("...");
    }

    // Always show last page
    pages.push(total);

    return pages;
}

/**
 * Enhanced Pagination Component
 * 
 * @param {number} page - Current page (1-indexed)
 * @param {number} totalPages - Total number of pages
 * @param {function} onPageChange - Callback when page changes
 * @param {number} totalItems - Total items (optional, for display)
 * @param {number} itemsPerPage - Items per page (optional)
 * @param {function} onItemsPerPageChange - Callback when items per page changes
 * @param {boolean} showFirstLast - Show first/last page buttons (default: false)
 * @param {boolean} showItemsPerPage - Show items per page selector (default: false)
 * @param {array} itemsPerPageOptions - Options for items per page (default: [10, 20, 50, 100])
 * @param {boolean} showInfo - Show page info text (default: true)
 * @param {string} variant - 'default' | 'compact' | 'minimal' | 'split' (default: 'default')
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
}) {
    const current = Number(page);
    const total = Number(totalPages);

    // Don't render if only one page and no items per page selector
    if (total <= 1 && !showItemsPerPage) return null;

    const pages = getPages(current, total);

    // Calculate item range for display
    const startItem = totalItems ? (current - 1) * itemsPerPage + 1 : null;
    const endItem = totalItems ? Math.min(current * itemsPerPage, totalItems) : null;

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

    // Split variant - Info left, Pagination right (like Labs page)
    if (variant === "split") {
        return (
            <div className="flex items-center justify-between gap-4 py-4 border-t">
                {/* Left: Info text */}
                {showInfo && totalItems ? (
                    <p className="text-sm text-muted-foreground">
                        Showing {startItem} to {endItem} of {totalItems} results
                    </p>
                ) : (
                    <div />
                )}

                {/* Right: Pagination */}
                <Pagination className=" ">
                    <PaginationContent>
                        {/* First Page */}
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

                        {/* Previous */}
                        <PaginationItem>
                            <PaginationPrevious
                                onClick={() => current > 1 && onPageChange(current - 1)}
                                className={current === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>

                        {/* Page Numbers */}
                        {pages.map((p, index) => (
                            <PaginationItem key={index} className="hidden sm:block">
                                {p === "..." ? (
                                    <span className="flex h-9 w-9 items-center justify-center text-muted-foreground">
                                        …
                                    </span>
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

                        {/* Mobile: Current page indicator */}
                        <PaginationItem className="sm:hidden">
                            <span className="flex h-9 px-4 items-center justify-center text-sm font-medium">
                                {current} / {total}
                            </span>
                        </PaginationItem>

                        {/* Next */}
                        <PaginationItem>
                            <PaginationNext
                                onClick={() => current < total && onPageChange(current + 1)}
                                className={current === total ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>

                        {/* Last Page */}
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
            </div>
        );
    }

    // Default variant - Stacked layout (info top, pagination center)
    return (

        <div className=" flex items-center justify-between">
            {/* Top row: Info text (left-aligned) */}
            {showInfo && totalItems && (
                <div className="">
                    <p className="text-sm text-muted-foreground">
                        Showing <span className="font-medium">{startItem}</span> to{" "}
                        <span className="font-medium">{endItem}</span> of{" "}
                        <span className="font-medium">{totalItems}</span> results
                    </p>
                </div>
            )}

            {/* Bottom row: Pagination controls (center) + Items per page (right) */}
            <div className=" ">
                {/* Spacer for alignment */}
                <div className="flex-1" />

                {/* Center: Pagination */}
                <Pagination className="mx-0 w-auto">
                    <PaginationContent>
                        {/* First Page */}
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

                        {/* Previous */}
                        <PaginationItem>
                            <PaginationPrevious
                                onClick={() => current > 1 && onPageChange(current - 1)}
                                className={current === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>

                        {/* Page Numbers */}
                        {pages.map((p, index) => (
                            <PaginationItem key={index} className="hidden sm:block">
                                {p === "..." ? (
                                    <span className="flex h-9 w-9 items-center justify-center text-muted-foreground">
                                        …
                                    </span>
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

                        {/* Mobile: Current page indicator */}
                        <PaginationItem className="sm:hidden">
                            <span className="flex h-9 px-4 items-center justify-center text-sm font-medium">
                                {current} / {total}
                            </span>
                        </PaginationItem>

                        {/* Next */}
                        <PaginationItem>
                            <PaginationNext
                                onClick={() => current < total && onPageChange(current + 1)}
                                className={current === total ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>

                        {/* Last Page */}
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

                {/* Right: Items per page selector */}
                {showItemsPerPage && onItemsPerPageChange ? (
                    <div className="flex items-center gap-2 flex-1 justify-end">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                            Rows per page:
                        </span>
                        <Select
                            value={String(itemsPerPage)}
                            onValueChange={(value) => onItemsPerPageChange(Number(value))}
                        >
                            <SelectTrigger className="h-9 w-[70px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {itemsPerPageOptions.map((option) => (
                                    <SelectItem key={option} value={String(option)}>
                                        {option}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                ) : (
                    <div className="flex-1" />
                )}
            </div>
        </div>


    );
}