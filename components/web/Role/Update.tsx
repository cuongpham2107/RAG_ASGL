"use client";

import React, { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuthStore } from "@/lib/store/auth-store";
import ResourcePermissionsTable from "../ResourcePermission/ResourcePermissions";
import Link from "next/link";

import { Permission, FormDataUpdateResourcePermission } from "@/lib/types";
import { getRole, getPermissions, getRolePermissions } from "@/lib/api/role-permission";
import { usePermissionStore } from "@/lib/store/permission-store";

export default function UpdateRole({ id }: { id: number }) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL!;
  const token = useAuthStore((state) => state.token);

  const [formData, setFormData] = useState<FormDataUpdateResourcePermission>({
    name: "",
    description: "",
    items: [],
    resource_permissions: {
      id: "",
      role_id: null,
      resource_type: "files",
      resource_id: "",
      resource_name: "",
      can_read: false,
      can_write: false,
      can_delete: false,
      created_at: new Date(),
    },
  });

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [oldItems, setOldItems] = useState<string[]>([]);
  
  useEffect(() => {
    if (!token) return;
    
    const fetchAllData = async () => {
      try {
        const [roleData, rolePermissions, allPermissions] = await Promise.all([
          getRole(id),
          getRolePermissions(id), 
          getPermissions()
        ]);
        
        setFormData(prev => ({
          ...prev,
          name: roleData.name,
          description: roleData.description,
          items: rolePermissions.map(p => p.id.toString())
        }));
        setOldItems(rolePermissions.map(p => p.id.toString()));
        setPermissions(allPermissions);
      } catch (e) {
        setError(`Không lấy được quyền: ${e instanceof Error ? e.message : "Unknown error"}`);
      }
    };
  
    fetchAllData();
  }, [id, token]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      items: checked
        ? [...prev.items, permissionId]
        : prev.items.filter((id) => id !== permissionId),
    }));
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      // Update role details
      const roleFormData = new FormData();
      roleFormData.append("name", formData.name);
      roleFormData.append("description", formData.description);

      const roleRes = await fetch(`${apiUrl}/roles/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: roleFormData,
      });

      if (!roleRes.ok) throw new Error("Cập nhập quyền không thành công");

      // Handle permission changes
      const itemsToAdd = formData.items.filter(
        (item) => !oldItems.includes(item)
      );
      const itemsToRemove = oldItems.filter(
        (item) => !formData.items.includes(item)
      );

      const permissionPromises = [
        ...itemsToAdd.map((permissionId) =>
          fetch(`${apiUrl}/roles/${id}/permissions/${permissionId}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          })
        ),
        ...itemsToRemove.map((permissionId) =>
          fetch(`${apiUrl}/roles/${id}/permissions/${permissionId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          })
        ),
      ];

      await Promise.all(permissionPromises);
      await usePermissionStore.getState().refreshPermissions();
      setSuccess("Quyền đã được cập nhập");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đã có lỗi xảy ra");
    }
  };

  const [refreshTableKey, setRefreshTableKey] = useState(0);

 
  return (
    <div className="w-full max-w-5xl mx-auto p-4">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="mb-4">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Cập nhập</h2>
          <div className="flex flex-row items-center space-x-4">
            <Button type="submit" className="font-semibold">
              Cập nhập
            </Button>
            <Link
              href={"/role"}
              className="bg-red-400 hover:bg-red-500 font-semibold text-white rounded-md px-4 py-2 text-sm"
            >
              Huỷ
            </Link>
          </div>
        </div>
        <div className="flex flex-row space-x-6">
          <div className="flex-1 space-y-6 border border-gray-200 rounded-md p-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Role name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Role description"
                rows={7}
              />
            </div>
          </div>

          <div className="w-1/3 border border-gray-200 rounded-md p-4">
            <h3 className="text-base font-medium mb-2">Permissions</h3>
            <div className="border border-gray-200 rounded-md p-4 space-y-4">
              {permissions.map((permission) => (
                <div key={permission.id} className="flex items-start space-x-3">
                  <Checkbox
                    checked={formData.items.includes(permission.id.toString())}
                    onCheckedChange={(checked) =>
                      handlePermissionChange(
                        permission.id.toString(),
                        checked as boolean
                      )
                    }
                  />
                  <label className="text-sm">{permission.description}</label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </form>
      
      {/* <CreateAndUpdateResourcePermission formData={formData} id={id} setFormData={setFormData} actionSetRefreshTableKey={setRefreshTableKey} /> */}
      <ResourcePermissionsTable
      key={refreshTableKey} 
      actionSetRefreshTableKey={setRefreshTableKey}
      formData={formData}
      setFormData={setFormData}
      roleId={id} />
    </div>
  );
}
