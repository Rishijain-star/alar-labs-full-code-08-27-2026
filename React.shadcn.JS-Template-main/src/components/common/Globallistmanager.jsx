import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Search,
    RefreshCw,
    Download,
    Plus,
    Lock,
} from "lucide-react";
import { hasPermission } from "@/utils/permissions"; // Your exist ing permission system

/**
 * GlobalListManager - A reusable component for managing lists with filters and actions
 * Now integrated with your existing RBAC permission system
 * 
 * @param {Object} props
 * @param {string} props.title - Main title (e.g., "User Management")
 * @param {string} props.description - Subtitle description
 * @param {string} props.addButtonText - Text for add button (e.g., "Add User")
 * @param {Function} props.onAdd - Callback when add button is clicked
 * @param {Function} props.onExport - Callback when export button is clicked
 * @param {Function} props.onRefresh - Callback when refresh button is clicked
 * @param {boolean} props.isRefreshing - Loading state for refresh button
 * @param {Array} props.filters - Array of filter configurations
 * @param {ReactNode} props.children - Content to render (typically a table)
 * @param {Object} props.searchConfig - Search configuration
 * @param {Object} props.permissions - Permission configuration for actions
 */
const GlobalListManager = ({
    // Header props
    title,
    description,

    // Action buttons
    addButtonText = "Add New",
    addButtonIcon: AddIcon = Plus,
    onAdd,
    onExport,
    onRefresh,
    isRefreshing = false,
    showAddButton = true,
    showExportButton = true,
    showRefreshButton = true,

    // Search configuration
    searchConfig = {},

    // Filter configuration
    filters = [],

    // Content
    children,

    // Additional custom actions
    customActions,

    // ✅ Permission configuration
    permissions = {
        checkPermissions: false, // Enable/disable permission checking
        resource: null, // Resource name for better UX messages (e.g., "users", "courses")
        actions: {
            create: null, // Permission ID for create action (e.g., "users_create", "courses_create")
            export: null, // Permission ID for export action (e.g., "users_export")
            refresh: null, // Permission ID for refresh (usually not restricted)
        },
        showLockedButtons: true, // Show disabled buttons with lock icon when no permission
    },
}) => {
    // ✅ Check permissions using your existing system
    const canCreate = permissions.checkPermissions && permissions.actions.create
        ? hasPermission(permissions.actions.create)
        : true;

    const canExport = permissions.checkPermissions && permissions.actions.export
        ? hasPermission(permissions.actions.export)
        : true;

    const canRefresh = permissions.checkPermissions && permissions.actions.refresh
        ? hasPermission(permissions.actions.refresh)
        : true;

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* Title Section */}
                    <div>
                        <CardTitle className="text-2xl font-bold">
                            {title}
                        </CardTitle>
                        {description && (
                            <p className="mt-1 text-sm text-muted-foreground">
                                {description}
                            </p>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        {customActions}

                        {/* Refresh Button */}
                        {showRefreshButton && onRefresh && (
                            <>
                                {canRefresh ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onRefresh}
                                        disabled={isRefreshing}
                                    >
                                        <RefreshCw
                                            className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                                        />
                                        Refresh
                                    </Button>
                                ) : permissions.showLockedButtons ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled
                                        title={`You don't have permission to refresh ${permissions.resource || 'this resource'}`}
                                        className="cursor-not-allowed opacity-60"
                                    >
                                        <Lock className="mr-2 h-4 w-4" />
                                        Refresh
                                    </Button>
                                ) : null}
                            </>
                        )}

                        {/* Export Button */}
                        {showExportButton && onExport && (
                            <>
                                {canExport ? (
                                    <Button variant="outline" size="sm" onClick={onExport}>
                                        <Download className="mr-2 h-4 w-4" />
                                        Export
                                    </Button>
                                ) : permissions.showLockedButtons ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled
                                        title={`You don't have permission to export ${permissions.resource || 'this data'}`}
                                        className="cursor-not-allowed opacity-60"
                                    >
                                        <Lock className="mr-2 h-4 w-4" />
                                        Export
                                    </Button>
                                ) : null}
                            </>
                        )}

                        {/* Add Button */}
                        {showAddButton && onAdd && (
                            <>
                                {canCreate ? (
                                    <Button size="sm" onClick={onAdd}>
                                        <AddIcon className="mr-2 h-4 w-4" />
                                        {addButtonText}
                                    </Button>
                                ) : permissions.showLockedButtons ? (
                                    <Button
                                        size="sm"
                                        disabled
                                        variant="default"
                                        title={`You don't have permission to add ${permissions.resource || 'items'}`}
                                        className="cursor-not-allowed opacity-60"
                                    >
                                        <Lock className="mr-2 h-4 w-4" />
                                        {addButtonText}
                                    </Button>
                                ) : null}
                            </>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                {/* Search and Filters Row */}
                {(searchConfig.value !== undefined || filters.length > 0) && (
                    <div className="mb-6 flex flex-col gap-4 sm:flex-row">
                        {/* Search Input */}
                        {searchConfig.value !== undefined && (
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder={searchConfig.placeholder || "Search..."}
                                    className="pl-10"
                                    value={searchConfig.value}
                                    onChange={(e) => {
                                        searchConfig.onChange(e.target.value);
                                        if (searchConfig.onPageReset) {
                                            searchConfig.onPageReset();
                                        }
                                    }}
                                />
                            </div>
                        )}

                        {/* Dynamic Filters */}
                        {filters.map((filter, index) => (
                            <Select
                                key={index}
                                value={filter.value}
                                onValueChange={(value) => {
                                    filter.onChange(value);
                                    if (filter.onPageReset) {
                                        filter.onPageReset();
                                    }
                                }}
                            >
                                <SelectTrigger className={filter.width || "w-48"}>
                                    <SelectValue placeholder={filter.placeholder} />
                                </SelectTrigger>
                                <SelectContent>
                                    {filter.showAllOption !== false && (
                                        <SelectItem value="all">
                                            {filter.allOptionText || `All ${filter.placeholder}`}
                                        </SelectItem>
                                    )}
                                    {filter.options.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ))}
                    </div>
                )}

                {/* Main Content */}
                {children}
            </CardContent>
        </Card>
    );
};

export default GlobalListManager;