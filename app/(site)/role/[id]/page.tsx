import UpdateRole from "@/components/web/Role/Update";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <UpdateRole id={Number(id)}/>
    </div>
  );
}
