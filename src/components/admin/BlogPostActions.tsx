"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface BlogPostActionsProps {
  id: string;
  slug: string;
  status: string;
}

export function BlogPostActions({ id, slug, status }: BlogPostActionsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this article?")) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to delete article");
        return;
      }

      toast.success("Article deleted");
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-3 text-xs font-medium">
      {status === "published" ? (
        <Link
          href={`/blog/${slug}`}
          target="_blank"
          rel="noreferrer"
          className="text-gray-500 hover:text-[#465FFF] hover:underline"
        >
          View ↗
        </Link>
      ) : (
        <span className="cursor-not-allowed text-gray-300">View</span>
      )}

      <Link href={`/admin/blog/${id}`} className="text-[#465FFF] hover:underline">
        Edit →
      </Link>

      <button
        type="button"
        onClick={() => void handleDelete()}
        disabled={isDeleting}
        className="text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </button>
    </div>
  );
}
