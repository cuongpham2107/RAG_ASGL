import { create } from "zustand";
import { Permission, ResourcePermissions } from "../types";
import { persist } from "zustand/middleware";

interface PermissionState {
  // Lưu trữ các quyền chung
  permissions: Permission[];

  // Lưu trữ các quyền của từng tài nguyên theo loại tài nguyên và ID
  resourcePermissions: ResourcePermissions[];

  // Khởi tạo danh sách quyền
  initPermissions: (roleId: number) => Promise<void>;

  // Kiểm tra quyền
  hasPermission: (permissionName: string) => boolean;

  //Kiểm tra quyền đối với tài nguyên
  hasResourcePermission: (
    resourceType: "files" | "folders",
    resourceId: number | string,
    permissionName: "can_read" | "can_write" | "can_delete"
  ) => boolean;

  // làm mới lại dữ liệu quyền
  refreshPermissions: () => Promise<void>;

  //Reset state khi logout
  resetPermissions: () => void;
}

export const usePermissionStore = create<PermissionState>()(
  persist(
    (set, get) => ({
      permissions: [],
      resourcePermissions: [],

      initPermissions: async (roleId: number) => {
        try {
          const api_url = process.env.NEXT_PUBLIC_API_URL!;
          
          // Khắc phục: phân tích lưu trữ auth và trích xuất mã thông báo thực tế
          const authStorage = JSON.parse(localStorage.getItem("auth-storage") || "{}");
          const token = authStorage?.state?.token || "";
          
          // Lấy tất cả permissions của role
          const rolePermissionsResponse = await fetch(
            `${api_url}/roles/${roleId}/permissions`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (!rolePermissionsResponse.ok) {
            throw new Error("Failed to fetch role permissions");
          }

          const rolePermissionsData = await rolePermissionsResponse.json();

          // Lấy tất cả resource permissions của role
          const resourcePermissionsResponse = await fetch(
            `${api_url}/roles/${roleId}/resource-permissions`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (!resourcePermissionsResponse.ok) {
            throw new Error("Failed to fetch resource permissions");
          }

          const resourcePermissionsData =
            await resourcePermissionsResponse.json();

          set({
            permissions: rolePermissionsData.data || [],
            resourcePermissions: resourcePermissionsData.data || [],
          });
        } catch (error) {
          console.error("Error initializing permissions:", error);
          throw new Error(`Error initializing permissions: ${error}`);
        }
      },

      // Kiểm tra quyền VD: hasPermission('view_users') | hasPermission('edit_users') | hasPermission('delete_users')
      hasPermission: (permissionName: string) => {
        const { permissions } = get();
        return permissions.some(
          (permission) => permission.name === permissionName
        );
      },

      hasResourcePermission: (
        resourceType: "files" | "folders",
        resourceId: number | string,
        permissionType: "can_read" | "can_write" | "can_delete"
      ) => {
        const { resourcePermissions } = get();

        const permission = resourcePermissions.find(
          (p) =>
            p.resource_type === resourceType &&
            p.resource_id.toString() === resourceId.toString()
        );
        if (!permission) return false;

        switch (permissionType) {
          case "can_read":
            return permission.can_read;
          case "can_write":
            return permission.can_write;
          case "can_delete":
            return permission.can_delete;
          default:
            return false;
        }
      },

      refreshPermissions: async () => {
        try {
          const authStorage = JSON.parse(
            localStorage.getItem("auth-storage") || "{}"
          );
          const roleId = authStorage?.state?.user?.role_id;

          if (roleId) {
            await get().initPermissions(roleId);
          }
        } catch (error) {
          console.error("Error refreshing permissions:", error);
          throw new Error(`Error refreshing permissions: ${error}`);
        }
      },

      resetPermissions: () => {
        set({ permissions: [], resourcePermissions: [] });
      },
    }),
    {
      name: "permission-storage",
    }
  )
);


export const checkResourcePermission = async (
  resourceType: "files" | "folders",
  resourceId: number | string,
  permissionType: "can_read" | "can_write" | "can_delete"
) => {
  try{
    const api_url = process.env.NEXT_PUBLIC_API_URL!;
    const token = localStorage.getItem("auth-storage") || "";

    const reponse = await fetch(
      `${api_url}/roles/check-resource-permissions?resource_type=${resourceType}&resource_id=${resourceId}&permission_type=${permissionType}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if(!reponse.ok){
      return false;
    }

    const data = await reponse.json();
    return data.has_permission;

  }
  catch(error){
    console.error("Error checking resource permission:", error);
    return false;
  } 
}
