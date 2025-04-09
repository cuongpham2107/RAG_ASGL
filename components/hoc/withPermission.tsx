"use client";

import { useAuthStore } from "@/lib/store/auth-store";
import { usePermissionStore } from "@/lib/store/permission-store";
import { useRouter } from "next/router";
import React, { ComponentType, useEffect, useState } from "react";
import dynamic from 'next/dynamic';

interface WithPermissionProps {
    requiredPermission?: string;
    requiredResourcePermission?: {
        resuorceType: 'files' | 'folders';
        resourceId: number | string;
        permissionType: 'can_read' | 'can_write' | 'can_delete';
    };
    fallbackPath?: string;
}


export const withPermission = <P extends object>(
    WrappedComponent: ComponentType<P>,
    {
        requiredPermission,
        requiredResourcePermission,
        fallbackPath = '/403'
    }: WithPermissionProps
) => {
    const WithPermissionComponent: React.FC<P> = (props) => {
        const router = useRouter();
        const { isAuthenticated } = useAuthStore();
        const { hasPermission, hasResourcePermission } = usePermissionStore();
        const [ hasAccess, setHasAccess ] = useState<boolean>(false);
        const [ isLoading, setIsLoading ] = useState<boolean>(true);

        useEffect(() => {

            // Check if user is authenticated
            if(!isAuthenticated) {
                router.push('/auth/login');
                return;
            }

            // Check role
            let access = true;
            if(requiredPermission) {
                access = access && hasPermission(requiredPermission);
            }


            // Check resource permission
            if(requiredResourcePermission){
                const { resuorceType, resourceId, permissionType } = requiredResourcePermission;
                access = access && hasResourcePermission(resuorceType, resourceId, permissionType);
            }
            
            setHasAccess(access);
            setIsLoading(false);

            //Chuyển hướng nếu không có quyền
            if(!access) {
                router.push(fallbackPath);
            }
        }, [isAuthenticated, hasPermission, hasResourcePermission, router]);

        if(isLoading) {
            return <div>Đang kiểm tra quyền ...</div>;
        }

        if(!hasAccess) {
            return <div>Không có quyền truy cập</div>;
        }

        return <WrappedComponent {...props as P} />;
    }

    return WithPermissionComponent;
}

// Compponent để ẩn hiện nội dung dựa trên quyền
export const PermissionGuard: React.FC<{
    permission?: string;
    resourcePermission?: {
        resuorceType: 'files' | 'folders';
        resourceId: number | string;
        permissionType: 'can_read' | 'can_write' | 'can_delete';
    };
    children: React.ReactNode;
    fallback?: React.ReactNode;
}> = ({ permission, resourcePermission, children, fallback = null}) => {
    const { hasPermission, hasResourcePermission } = usePermissionStore();

    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Only perform permission check on client side
    if (!isMounted) {
        // Return null or a loading placeholder during server-side rendering
        return null;
    }

    let hasAccess = true;

    if(permission) {
        hasAccess = hasAccess && hasPermission(permission);
    }

    if(resourcePermission) {
        const { resuorceType, resourceId, permissionType } = resourcePermission;
        hasAccess = hasAccess && hasResourcePermission(resuorceType, resourceId, permissionType);
    }

    return hasAccess ? <>{children}</> : <>{fallback}</>;
}

// Export a pre-configured dynamic import of PermissionGuard with SSR disabled
// This can be used directly in components to avoid hydration errors
export const ClientPermissionGuard = dynamic(
  () => Promise.resolve(PermissionGuard),
  { ssr: false }
);