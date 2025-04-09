
import DocumentsComponent from "@/components/web/Document/Documents";

export default async function Page(
    {
        params,
    }: {
        params: Promise<{ id: string[] }>
    }
) {
    const { id } = await params;
    
    return (
        <div className="container mx-auto p-6 max-w-7xl">
            <DocumentsComponent id={id[id.length - 1]} />
        </div>
    )
}