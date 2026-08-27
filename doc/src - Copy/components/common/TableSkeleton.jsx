import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * TableSkeleton - Loading skeleton for tables
 * 
 * @param {number} rows - Number of skeleton rows to display (default: 5)
 * @param {number} columns - Number of columns (default: 5)
 * @param {boolean} showHeader - Show header skeleton (default: true)
 * @param {boolean} showActions - Show action column (default: true)
 * @param {boolean} showCheckbox - Show checkbox column (default: false)
 */
export const TableSkeleton = ({
  rows = 5,
  columns = 5,
  showHeader = true,
  showActions = true,
  showCheckbox = false
}) => {
  const totalColumns = columns + (showActions ? 1 : 0) + (showCheckbox ? 1 : 0);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-9 w-36 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search bar skeleton */}
        <div className="h-10 max-w-md bg-gray-200 rounded animate-pulse"></div>

        <div className="w-full overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Table Header Skeleton */}
              {showHeader && (
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {showCheckbox && (
                      <th className="w-12 px-4 py-3">
                        <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                      </th>
                    )}
                    {Array.from({ length: columns }).map((_, i) => (
                      <th key={`header-${i}`} className="px-6 py-3 text-left">
                        <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                      </th>
                    ))}
                    {showActions && (
                      <th className="px-6 py-3 text-right">
                        <div className="h-4 bg-gray-200 rounded w-16 ml-auto animate-pulse"></div>
                      </th>
                    )}
                  </tr>
                </thead>
              )}

              {/* Table Body Skeleton */}
              <tbody className="divide-y divide-gray-200">
                {Array.from({ length: rows }).map((_, rowIndex) => (
                  <tr key={`row-${rowIndex}`} className="hover:bg-gray-50">
                    {showCheckbox && (
                      <td className="w-12 px-4 py-4">
                        <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                      </td>
                    )}
                    {Array.from({ length: columns }).map((_, colIndex) => (
                      <td key={`cell-${rowIndex}-${colIndex}`} className="px-6 py-4">
                        <div
                          className="h-4 bg-gray-200 rounded animate-pulse"
                          style={{
                            width: `${Math.random() * 40 + 60}%`,
                            animationDelay: `${(rowIndex * columns + colIndex) * 50}ms`
                          }}
                        ></div>
                      </td>
                    ))}
                    {showActions && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* Pagination skeleton */}
        <div className="flex items-center justify-between pt-2">
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-9 w-9 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * CardTableSkeleton - Card-style table skeleton
 */
export const CardTableSkeleton = ({ rows = 3 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={`card-${index}`}
          className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-8 w-24 bg-gray-200 rounded"></div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * DataTableSkeleton - Advanced skeleton with search and filters
 */
export const DataTableSkeleton = ({
  rows = 5,
  columns = 5,
  showSearch = true,
  showFilters = true,
  showPagination = true
}) => {
  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      {(showSearch || showFilters) && (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {showSearch && (
            <div className="h-10 bg-gray-200 rounded w-full sm:w-80 animate-pulse"></div>
          )}
          {showFilters && (
            <div className="flex gap-2">
              <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <TableSkeleton rows={rows} columns={columns} />

      {/* Pagination */}
      {showPagination && (
        <div className="flex items-center justify-between pt-4">
          <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * CompactTableSkeleton - Minimal skeleton for small tables
 */
export const CompactTableSkeleton = ({ rows = 3, columns = 3 }) => {
  return (
    <div className="w-full">
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={`compact-row-${rowIndex}`}
            className="flex gap-4 p-3 bg-gray-50 rounded-lg"
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div
                key={`compact-cell-${rowIndex}-${colIndex}`}
                className="h-4 bg-gray-200 rounded flex-1 animate-pulse"
                style={{ animationDelay: `${(rowIndex * columns + colIndex) * 30}ms` }}
              ></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableSkeleton;