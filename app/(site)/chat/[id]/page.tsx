import OldChatUi from "@/components/web/Chat/OldChatUi";

export default async function OldChatPage({
    params,
  }: {
    params: Promise<{ id: string }>
  }) {
    const id = (await params).id;
    return (
        <div className="container mx-auto h-[100%]">
            <OldChatUi id={id}/>
        </div>
    );
  }
  