

import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BadgePlus, Check, EditIcon, Plus, Trash2, X } from 'lucide-react';
import { FormDataUpdateResourcePermission, ResourcePermissions } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { createAndUpdateFullRoleAccess, getResourcePermissions, removeResourcePermission } from '@/lib/api/role-permission';
import { toast } from '@/hooks/use-toast';
import CreateAndUpdateResourcePermission from './CreateAndUpdateResourcePermission';
interface ResourcePermissionsTableProps{
  key: number;
  actionSetRefreshTableKey: (key: number) => void;
  formData: FormDataUpdateResourcePermission;
  setFormData: (data: FormDataUpdateResourcePermission) => void;
  roleId: number;
}


const ResourcePermissionsTable = (
  { roleId, formData, setFormData, actionSetRefreshTableKey }: ResourcePermissionsTableProps
) => {
  const [resourcePermissions, setResourcePermissions] = useState<ResourcePermissions[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    getResourcePermissions(roleId).then((data) => {
      setResourcePermissions(data);
      setLoading(false);
    }
    ).catch((err) => {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    });
  }, [ roleId]);

  if (loading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  function handleDelete(id: string): void {
    removeResourcePermission(Number(id)).then(() => {
      setResourcePermissions((prev) => prev.filter((resourcePermissions) => resourcePermissions.id !== id));
      toast({
        title: 'Thành công',
        description: 'Đã xóa quyền truy cập tài nguyên',
      })
    }
    ).catch((err) => {
      setError(err instanceof Error ? err.message : 'An error occurred');
    });
    getResourcePermissions(roleId).then((data) => {
      setResourcePermissions(data);
      setLoading(false);
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    });
  }


  async function handleCreateFullAccess(): Promise<void> {
    await createAndUpdateFullRoleAccess(roleId).then(() => {
      actionSetRefreshTableKey(roleId + 1);
      toast({
        title: 'Thành công',
        description: 'Đã tạo full quyền truy cập',
      });
    }
    ).catch((err) => {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
    );
  }

  return (
   <div className="rounded-md border mt-8 p-4">
     <div className='flex justify-between'> 
     <CreateAndUpdateResourcePermission 
      isAddEidt={'add'}
      icon={<Plus size={16} />}
      title_button="Thêm quyền"
      title_dialog="Thêm quyền truy cập"
      description="Thêm quyền truy cập tài nguyên cho vai trò"
      formData={formData}
      id={roleId}
      setFormData={setFormData}
      actionSetRefreshTableKey={actionSetRefreshTableKey}
     />
      <Button
        variant="outline"
        className="rounded-lg font-semibold text-white bg-blue-500"
        onClick={() => handleCreateFullAccess()}
      >
        <BadgePlus size={20} />
        Tạo full quyền
      </Button>
     </div>

    <div className="rounded-md border my-4">
     
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Resource Type</TableHead>
            <TableHead>Resource ID</TableHead>
            <TableHead className="text-center">Can Read</TableHead>
            <TableHead className="text-center">Can Write</TableHead>
            <TableHead className="text-center">Can Delete</TableHead>
            <TableHead>Ngày tạo</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {resourcePermissions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No resource permissions found
              </TableCell>
            </TableRow>
          ) : (
            resourcePermissions.map((resourcePermission, index) => (
              <TableRow key={index}>
               <TableCell className="font-medium">
                {typeof resourcePermission.resource_type === "string"
                    ? resourcePermission.resource_type.charAt(0).toUpperCase() + resourcePermission.resource_type.slice(1)
                    : "N/A"}
                </TableCell>
                <TableCell>{resourcePermission.resource_name}</TableCell>
                <TableCell className="text-center">
                  {resourcePermission.can_read ? (
                    <Check className="mx-auto h-4 w-4 text-green-500" />
                  ) : (
                    <X className="mx-auto h-4 w-4 text-red-500" />
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {resourcePermission.can_write ? (
                    <Check className="mx-auto h-4 w-4 text-green-500" />
                  ) : (
                    <X className="mx-auto h-4 w-4 text-red-500" />
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {resourcePermission.can_delete ? (
                    <Check className="mx-auto h-4 w-4 text-green-500" />
                  ) : (
                    <X className="mx-auto h-4 w-4 text-red-500" />
                  )}
                </TableCell>
                <TableCell>
                  {new Date(resourcePermission.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                    <div className="flex space-x-2 justify-end">
                        <CreateAndUpdateResourcePermission 
                          isAddEidt={'edit'}
                          resourcePermission={resourcePermission}
                          icon={<EditIcon size={16} color="blue" />}
                          title_dialog="Sửa quyền truy cập"
                          description="Sửa quyền truy cập tài nguyên cho vai trò"
                          formData={formData}
                          id={roleId}
                          setFormData={setFormData}
                          actionSetRefreshTableKey={actionSetRefreshTableKey}
                          />
                        <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg font-semibold"
                        onClick={() => handleDelete(resourcePermission.id)}
                        >
                        <Trash2 size={16} color="red" />
                        </Button>

                    </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
   </div>
  );
};

export default ResourcePermissionsTable;