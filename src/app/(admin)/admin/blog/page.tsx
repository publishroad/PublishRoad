// Cache blog list for 60 seconds — admin view, changes are infrequent
export const revalidate = 60;
import { db } from "@/lib/db";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { AppHeader } from "@/components/dashboard/AppHeader";

export default async function AdminBlogPage() {
  const posts = await db.blogPost.findMany({ orderBy: { createdAt: "desc" }, take: 50 });

  return (
    <>
      <AppHeader
        title="Blog Posts"
        rightSlot={
          <Link href="/admin/blog/new" className="h-9 px-4 rounded-xl bg-[#465FFF] text-white text-sm font-medium hover:bg-[#3d55e8] flex items-center gap-1.5 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Post
          </Link>
        }
      />
      <div className="flex-1 p-6">
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Published</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {posts.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-16 text-gray-400 text-sm">No posts yet. Create your first post.</td></tr>
                ) : posts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-900">{post.title}</p>
                      <p className="text-xs text-gray-400">/blog/{post.slug}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${post.status === "published" ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"}`}>{post.status}</span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400">{post.publishDate ? formatDate(post.publishDate) : "—"}</td>
                    <td className="px-5 py-4 text-right"><Link href={`/admin/blog/${post.id}`} className="text-xs font-medium text-[#465FFF] hover:underline">Edit →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
