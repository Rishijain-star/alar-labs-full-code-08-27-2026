// src/hooks/usePermissionSync.js

import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { refreshPermissionData, getAllUserPermissions } from '../utils/permissions';
import { toast } from '@/lib/toast';

export function usePermissionSync() {
    const user = useSelector((state) => state.auth.user);
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

    useEffect(() => {
        if (!isAuthenticated || !user) return;

        // Sync permissions when user data changes
        refreshPermissionData();
        
        const currentPermissions = getAllUserPermissions();
        console.log('🔄 Permissions synced:', currentPermissions);

    }, [user, isAuthenticated]);

    return null;
}