"use client"
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import SearchIcon from "../ui/search-icon";
import { useCallback, useEffect, useState } from "react";
import { Role } from "@/lib/types";
import { ChevronLeft, ChevronRight, ChevronsUpDown, EditIcon, Plus, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { deleleRole, getRoles } from "@/lib/api/role-permission";

export default function BrowseRole() {
  const router = useRouter();
  const [search, setSearch] = useState<string>("");
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isCheckedAll, setIsCheckedAll] = useState(false);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleIsCheckedAll = () => {
    setIsCheckedAll(!isCheckedAll);
    setRoles(roles.map(role => ({
      ...role,
      is_checked: !isCheckedAll
    })));
  }

  const handleCheckboxChange = (roleId: string, checked: boolean) => {
    setRoles(roles.map(role => 
      role.id === roleId ? { ...role, is_checked: checked } : role
    ));
  }

  const fetchRoles = useCallback(async () => {
    // Fetch roles
    getRoles(search || "", skip, limit)  // ensure search is never undefined
    .then((results) => {
     
      setRoles(results.roles);
      setSkip(results.skip);
      setLimit(results.limit);
      setSearch(results.search || "");  // ensure we never set undefined
      setTotal(results.total);
    })
    .catch((e) => {
      toast({
        title: "Lỗi",
        description: e instanceof Error ? e.message : "Đã có lỗi xảy ra",
        variant: "destructive",
      });
    });
  }, [search, skip, limit]);
  
  useEffect(() => {
      fetchRoles();
  }, [fetchRoles]);

  const handleDelete = async (id: number) => {
    const confirm = window.confirm("Bạn có chắc chắn muốn xoá role này không?");
    if(confirm){
      deleleRole(id)
      .then(() => {
        fetchRoles();
      })
      .catch((e) => {
        toast({
          title: "Lỗi",
          description: e instanceof Error ? e.message : "Đã có lỗi xảy ra",
          variant: "destructive",
        });
      });
    }
  }

  const sortByName = useCallback(() => {
    const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    setSortDirection(newDirection);
    
    setRoles([...roles].sort((a, b) => {
      if (newDirection === 'asc') {
        return a.name.localeCompare(b.name);
      } else {
        return b.name.localeCompare(a.name);
      }
    }));
  }, [roles, sortDirection]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center space-x-2">
          <SearchIcon search={search} setSearch={setSearch} />
          {
            // Show delete button if at least one checkbox is checked
            roles.some(role => role.is_checked) && (
              <Button variant="outline" size="sm" className="rounded-xl">
                <Trash2 size={20} color="red" />
              </Button>
            )
          }
        </div>
        
        <div>
          <Button size="sm" className="rounded-lg font-semibold" onClick={() => {
            router.push("/role/create")
          }}>
            <Plus size={20} />
            Thêm mới
          </Button>
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-100">
              <TableHead className="w-[50px]">
                <Checkbox 
                  checked={isCheckedAll}
                  onCheckedChange={() => handleIsCheckedAll()}
                />
              </TableHead>
              <TableHead 
              onClick={() => sortByName()}
              className="flex flex-row items-center space-x-1 font-semibold cursor-pointer">
                <span>Tên</span>
                <ChevronsUpDown size={12} className={`transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`}/>
              </TableHead>
              <TableHead className="font-semibold">Mô tả</TableHead>
              <TableHead className="flex flex-row items-center space-x-1 font-semibold">
                <span>Ngày tạo</span>
              </TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id} className="cursor-pointer">
                  <TableCell>
                    <Checkbox 
                    checked={role.is_checked}
                    onCheckedChange={(checked: boolean) => handleCheckboxChange(role.id, checked)}
                    />
                  </TableCell>
                  <TableCell>{role.name}</TableCell>
                  <TableCell>{role.description}</TableCell>
                  <TableCell>{role.created_at.toString()}</TableCell>
                  <TableCell className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" className="rounded-lg font-semibold"
                      onClick={() => router.push(`/role/${role.id}`)}
                    >
                      <EditIcon size={16} color="blue"/>
                      Sửa
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-lg font-semibold"
                      onClick={() => handleDelete(Number(role.id))}
                    >
                    <Trash2 size={16} color="red"/>
                      Xoá
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          Hiển thị từ {skip + 1} đến {skip + roles.length} trong tổng số {total}
        </div>
        <div className="space-x-2">
          <Button variant="outline" size="sm" 
            disabled={skip === 0}
            onClick={() => setSkip(skip - limit)}
            >
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="sm"
            disabled={skip + limit >= total}
            onClick={() => setSkip(skip + limit)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
