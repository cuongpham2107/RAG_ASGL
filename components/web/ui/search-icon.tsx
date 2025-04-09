import { PencilLine, Search } from "lucide-react";
import { useState } from "react";

interface SearchIconProps {
    search: string;
    setSearch: (search: string) => void;
}

export default function SearchIcon( { search, setSearch }: SearchIconProps ) {
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    return (
        <div
            className="flex items-center h-8 w-full md:w-[200px] pl-2 text-sm  rounded-xl 
            border border-gray-200 
            ring-offset-background transition-all
            focus-within:ring-2 focus-within:ring-blue-200 
            hover:border-blue-400 hover:ring-2 hover:ring-blue-200
            "
        >
            {isSearchFocused ? (
            <PencilLine className="w-5 h-5 text-blue-400" />
            ) : (
            <Search className="w-5 h-5 text-gray-400" />
            )}
            <input
            type="text"
            placeholder={isSearchFocused ? "" : "Tìm kiếm..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="w-full p-1 focus:outline-none rounded-xl bg-transparent"
            />
        </div>
    )
}