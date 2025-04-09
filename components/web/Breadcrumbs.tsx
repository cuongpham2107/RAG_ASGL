"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";
import { usePathname } from "next/navigation";
export default function Breadcrumbs() {
  const url = usePathname();
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:block">
          <BreadcrumbLink href="#">
          {
            url.split("/")[1] === "role" && url.split("/")[2] === "create" ? "Tạo mới quyền" :
            url.split("/")[1] === "role" && !isNaN(Number(url.split("/")[2])) ? "Chi tiết quyền" : null
          }
          </BreadcrumbLink>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}