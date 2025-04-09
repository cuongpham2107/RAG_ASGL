"use client";
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
import { User } from "@/lib/types";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  EditIcon,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { deleteUser, getUsers } from "@/lib/api/user";
import { CreateAndUpdate } from "./CreateAndUpdate";

export default function BrowseRole() {
  const [search, setSearch] = useState<string>("");
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [isCheckedAll, setIsCheckedAll] = useState(false);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleIsCheckedAll = () => {
    setIsCheckedAll(!isCheckedAll);
    setUsers(
      users.map((user) => ({
        ...user,
        is_checked: !isCheckedAll,
      }))
    );
  };

  const handleCheckboxChange = (id: string, checked: boolean) => {
    setUsers(
      users.map((user) =>
        user.id === id ? { ...user, is_checked: checked } : user
      )
    );
  };

  const fetchUsers = useCallback(async () => {
    getUsers(search || "", skip, limit) // ensure search is never undefined
      .then(
        (results: {
          users: User[];
          skip: number;
          limit: number;
          search: string;
          total: number;
        }) => {
          setUsers(results.users);
          setSkip(results.skip);
          setLimit(results.limit);
          setSearch(results.search || ""); // ensure we never set undefined
          setTotal(results.total);
        }
      )
      .catch((e) => {
        toast({
          title: "Lỗi",
          description: e instanceof Error ? e.message : "Đã có lỗi xảy ra",
          variant: "destructive",
        });
      });
  }, [search, skip, limit]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = async (id: number) => {
    const confirm = window.confirm("Bạn có chắc chắn muốn xoá role này không?");
    if (confirm) {
      deleteUser(id)
        .then(() => {
          toast({
            title: "Thành công",
            description: "Xoá người dùng thành công",
          });
          fetchUsers();
        })
        .catch((e) => {
          toast({
            title: "Lỗi",
            description: e instanceof Error ? e.message : "Đã có lỗi xảy ra",
            variant: "destructive",
          });
        });
    }
  };

  const sortByName = useCallback(() => {
    const newDirection = sortDirection === "asc" ? "desc" : "asc";
    setSortDirection(newDirection);

    setUsers(
      [...users].sort((a, b) => {
        if (newDirection === "asc") {
          return a.username.localeCompare(b.username);
        } else {
          return b.username.localeCompare(a.username);
        }
      })
    );
  }, [users, sortDirection]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center space-x-2">
          <SearchIcon search={search} setSearch={setSearch} />
          {
            // Show delete button if at least one checkbox is checked
            users.some((user) => user.is_checked) && (
              <Button variant="outline" size="sm" className="rounded-xl">
                <Trash2 size={20} color="red" />
              </Button>
            )
          }
        </div>

        <div>
          <CreateAndUpdate
            isAddEdit="add"
            icon={<Plus size={16} />}
            title_button="Thêm mới"
            title_dialog="Thêm mới người dùng"
            description_dialog="Nhập thông tin người dùng để thêm mới"
            onSuccess={fetchUsers} // Thêm prop này để refresh data sau khi tạo thành công
          />
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-100">
              <TableHead className="w-[30px]">
                <Checkbox
                  checked={isCheckedAll}
                  onCheckedChange={() => handleIsCheckedAll()}
                />
              </TableHead>
              <TableHead className="font-semibold w-[150px]">
                Họ và tên
              </TableHead>
              <TableHead
                onClick={() => sortByName()}
                className="flex flex-row items-center space-x-1 font-semibold cursor-pointer"
              >
                <span>Tài khoản</span>
                <ChevronsUpDown
                  size={12}
                  className={`transform ${
                    sortDirection === "desc" ? "rotate-180" : ""
                  }`}
                />
              </TableHead>
              <TableHead className="font-semibold">Địa chỉ Email</TableHead>
              <TableHead className="font-semibold w-[120px]">
                Số điện thoại
              </TableHead>
              <TableHead className="font-semibold">Địa chỉ</TableHead>
              <TableHead className="font-semibold">Quyền</TableHead>
              <TableHead className="font-semibold w-[100px]">
                Trạng thái
              </TableHead>
              <TableHead className="font-semibold">
                <span>Ngày tạo</span>
              </TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} className="cursor-pointer">
                <TableCell>
                  <Checkbox
                    checked={user.is_checked}
                    onCheckedChange={(checked: boolean) =>
                      handleCheckboxChange(user.id, checked)
                    }
                  />
                </TableCell>
                <TableCell className="">
                  <span className="max-w-full">{user.full_name}</span>
                </TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.phone}</TableCell>
                <TableCell>{user.address}</TableCell>
                <TableCell>
                  <span className="border border-sky-300 rounded-xl bg-sky-100 text-purple-500 font-semibold px-1.5 py-0.5">
                    {user.role}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center my-auto">
                    {user.is_active ? (
                      <Check size={16} color="green" />
                    ) : (
                      <X size={16} color="red" />
                    )}
                  </div>
                </TableCell>
                <TableCell>{user?.created_at?.toString()}</TableCell>

                <TableCell>
                  <div className="flex items-center justify-center my-auto gap-2">
                    <CreateAndUpdate
                      isAddEdit="edit"
                      user={user}
                      icon={<EditIcon size={16} color="blue" />}
                      title_dialog="Sửa thông tin người dùng"
                      description_dialog="Nhập thông tin người dùng để sửa"
                      onSuccess={fetchUsers} // Thêm prop này để refresh data sau khi tạo thành công
                    />

                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg font-semibold"
                      onClick={() => handleDelete(Number(user.id))}
                    >
                      <Trash2 size={16} color="red" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          Hiển thị từ {skip + 1} đến {skip + users.length} trong tổng số {total}
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            disabled={skip === 0}
            onClick={() => setSkip(skip - limit)}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="sm"
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
