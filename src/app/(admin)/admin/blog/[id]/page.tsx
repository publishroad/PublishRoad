// Cache blog editor for 300 seconds — changes are saved to database
export const revalidate = 300;
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { BlogEditor } from "@/components/admin/BlogEditor";

export default async function AdminBlogEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (id === "new") {
    return (
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-border-gray px-6 py-4">
          <h1 className="text-lg font-semibold text-navy">New Blog Post</h1>
        </div>
        <div className="flex-1 p-6">
          <BlogEditor post={null} />
        </div>
      </div>
    );
  }

  const post = await db.blogPost.findUnique({ where: { id } });
  if (!post) notFound();

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-white border-b border-border-gray px-6 py-4">
        <h1 className="text-lg font-semibold text-navy">Edit Post</h1>
      </div>
      <div className="flex-1 p-6">
        <BlogEditor post={post} />
      </div>
    </div>
  );
}
