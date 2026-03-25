export const revalidate = 60;

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { RedditChannelForm } from "@/components/admin/RedditChannelForm";

async function getData(id: string) {
  if (id === "new") {
    const [categories, tags] = await Promise.all([
      db.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      db.tag.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    ]);
    return { channel: null, categories, tags };
  }

  const [channel, categories, tags] = await Promise.all([
    db.redditChannel.findUnique({
      where: { id },
      include: {
        redditChannelTags: { select: { tagId: true } },
        redditChannelCategories: { select: { categoryId: true } },
      },
    }),
    db.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.tag.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  if (!channel) notFound();
  return {
    channel: {
      ...channel,
      tagIds: channel.redditChannelTags.map((t) => t.tagId),
      categoryIds: channel.redditChannelCategories.map((c) => c.categoryId),
    },
    categories,
    tags,
  };
}

export default async function RedditChannelEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { channel, categories, tags } = await getData(id);

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-white border-b border-border-gray px-6 py-4">
        <h1 className="text-lg font-semibold text-navy">
          {channel ? "Edit Subreddit" : "Add Subreddit"}
        </h1>
      </div>
      <div className="flex-1 p-6 max-w-2xl">
        <RedditChannelForm
          channel={channel}
          categories={categories}
          tags={tags}
        />
      </div>
    </div>
  );
}
