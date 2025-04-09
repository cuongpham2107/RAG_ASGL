import { useEffect, useState } from "react";
import { usePermissionStore, checkResourcePermission } from "@/lib/store/permission-store";


// Hook kiểm tra quyền của người dùng
export const usePermission = (permissionName?: string) => {
    const { hasPermission } = usePermissionStore();

    if(!permissionName) return true;

    return hasPermission(permissionName);
}

// Hook kiểm tra quyền đối với tài nguyên
export const useResourcePermission = (
    resourceType: "files" | "folders",
    resourceId: number | string,
    permissionName: "can_read" | "can_write" | "can_delete"
) => {
    const { hasResourcePermission } = usePermissionStore();

    return hasResourcePermission(resourceType, resourceId, permissionName);
}


// Hook kiểm tra quyền đối với tài nguyên( truc tiep tu API )
export const useResourcePermissionAPI = (
    resourceType: "files" | "folders",
    resourceId: number | string,
    permissionName: "can_read" | "can_write" | "can_delete"
) => {
    const [hasPermission, setHasPermission] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    
    useEffect(() => {
        const checkPermission = async () => {
            try {
                setIsLoading(true);
                const result = await checkResourcePermission(resourceType, resourceId, permissionName);
                setHasPermission(result);
            } catch (error) {
                console.error("Error checking resource permission:", error);
                setHasPermission(false);
            }
            finally {
                setIsLoading(false);
            }
            
        }
        checkPermission();
    }, [resourceType, resourceId, permissionName]);

    return { hasPermission, isLoading };
}