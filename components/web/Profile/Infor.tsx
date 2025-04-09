import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Mail, 
  Phone, 
  MapPin,  
  MoreVertical,
  Edit,
  RectangleEllipsis
} from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth-store';
import { Switch } from '@/components/ui/switch';

const InforProfile = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <Card className="w-full max-w-xl">
      <CardHeader className="relative">
        <div className="absolute right-4 top-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                Sửa thông tin
              </DropdownMenuItem>
              <DropdownMenuItem>
                <RectangleEllipsis className="mr-2 h-4 w-4"/>
                Đổi mật khẩu
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center space-x-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={'/images/profile.png'} alt={user?.full_name} />
            <AvatarFallback>{user?.full_name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold">{user?.full_name}</h2>
            <p className="text-gray-500 text-xs font-semibold">{user?.role_id}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-500">
              <MapPin className="mr-2 h-4 w-4" />
              {user?.address}
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <Mail className="mr-2 h-4 w-4" />
              {user?.email}
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <Phone className="mr-2 h-4 w-4" />
              {user?.phone}
            </div>
            <div className='flex items-center space-x-2'>
            <Switch id="airplane-mode" checked={user?.is_active}  />
              {
                user?.is_active ? (
                  <p className="text-sm font-semibold text-green-500">Kích hoạt</p>
                ) : (
                  <p className="text-sm font-semibold text-red-500">Tạm khoá</p>
                )
              }
           </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
};

export default InforProfile;