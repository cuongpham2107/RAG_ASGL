
import { FileIcon } from "lucide-react";
import Image from "next/image";
 
 export const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
    switch (extension) {
      case "pdf":
        return (
          <Image src={"/images/pdf.png"} alt="pdf" width="45" height="45" className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-[45px] lg:h-[45px]" />
        );
      case "docx":
        return (
          <Image src={"/images/doc.png"} alt="pdf" width="45" height="45" className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-[45px] lg:h-[45px]" />
        );
      default:
        return <FileIcon size={45} strokeWidth={1} />;
    }
  };