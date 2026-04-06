"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { slugify } from "@/lib/utils";

interface Item {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  extra?: string;
}

interface LookupManagerProps {
  type: string;
  items: Item[];
  extraLabel?: string;
}

export function LookupManager({ type, items, extraLabel }: LookupManagerProps) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newExtra, setNewExtra] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editExtra, setEditExtra] = useState("");
  const [isEditingSave, setIsEditingSave] = useState(false);
  const isCategoryLookup = type === "categories";

  async function handleAdd() {
    if (!newName.trim()) return;
    setIsSaving(true);

    const res = await fetch(`/api/admin/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        slug: slugify(newName.trim()),
        ...(extraLabel ? { flagEmoji: newExtra } : {}),
      }),
    });

    setIsSaving(false);
    if (!res.ok) {
      toast.error("Failed to create");
      return;
    }

    toast.success("Created successfully");
    setNewName("");
    setNewExtra("");
    setIsAdding(false);
    router.refresh();
  }

  async function handleToggle(item: Item) {
    const res = await fetch(`/api/admin/${type}/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !item.isActive }),
    });

    if (!res.ok) { toast.error("Failed to update"); return; }
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this item?")) return;
    const res = await fetch(`/api/admin/${type}/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to delete"); return; }
    toast.success("Deleted");
    router.refresh();
  }

  function startEdit(item: Item) {
    setEditingId(item.id);
    setEditName(item.name);
    setEditSlug(item.slug);
    setEditExtra(item.extra ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditSlug("");
    setEditExtra("");
  }

  async function handleEditSave(item: Item) {
    if (!editName.trim() || !editSlug.trim()) {
      toast.error("Name and slug are required");
      return;
    }

    setIsEditingSave(true);
    const res = await fetch(`/api/admin/${type}/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName.trim(),
        slug: editSlug.trim(),
        ...(extraLabel ? { flagEmoji: editExtra.trim() } : {}),
      }),
    });
    setIsEditingSave(false);

    if (!res.ok) {
      toast.error("Failed to update");
      return;
    }

    toast.success("Updated successfully");
    cancelEdit();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          className="bg-navy hover:bg-blue"
          onClick={() => setIsAdding(true)}
        >
          Add New
        </Button>
      </div>

      {isAdding && (
        <div className="bg-white rounded-xl border border-border-gray p-4 space-y-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New item name"
              autoFocus
            />
          </div>
          {extraLabel && (
            <div className="space-y-1.5">
              <Label>{extraLabel}</Label>
              <Input
                value={newExtra}
                onChange={(e) => setNewExtra(e.target.value)}
                placeholder="🇺🇸"
              />
            </div>
          )}
          <div className="flex gap-2">
            <Button
              className="bg-navy hover:bg-blue"
              onClick={handleAdd}
              disabled={isSaving || !newName.trim()}
            >
              {isSaving ? "Creating..." : "Create"}
            </Button>
            <Button variant="outline" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border-gray overflow-hidden">
        {items.length === 0 ? (
          <p className="text-center py-12 text-medium-gray text-sm">
            No items yet.
          </p>
        ) : (
          <div className="divide-y divide-border-gray">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-ice-blue/30"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {editingId === item.id ? (
                    <div className="w-full max-w-xl space-y-2">
                      <Input
                        value={editName}
                        onChange={(e) => {
                          const nextName = e.target.value;
                          setEditName(nextName);
                          setEditSlug(slugify(nextName));
                        }}
                        placeholder="Name"
                      />
                      <Input
                        value={editSlug}
                        onChange={(e) => setEditSlug(e.target.value)}
                        placeholder="Slug"
                      />
                      {extraLabel && (
                        <Input
                          value={editExtra}
                          onChange={(e) => setEditExtra(e.target.value)}
                          placeholder={extraLabel}
                        />
                      )}
                    </div>
                  ) : (
                    <>
                      {item.extra && (
                        <span className="text-lg">{item.extra}</span>
                      )}
                      <div>
                        <p className="text-sm font-medium text-navy">{item.name}</p>
                        <p className="text-xs text-medium-gray font-mono">{item.slug}</p>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {editingId === item.id ? (
                    <>
                      <button
                        onClick={() => void handleEditSave(item)}
                        disabled={isEditingSave || !editName.trim() || !editSlug.trim()}
                        className="text-xs text-[#465FFF] hover:text-[#3647D6] disabled:opacity-50"
                      >
                        {isEditingSave ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-xs text-medium-gray hover:text-navy transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(item)}
                        className="text-xs text-medium-gray hover:text-[#465FFF] transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggle(item)}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs transition-colors hover:bg-slate-50"
                        title={item.isActive ? "Set inactive" : "Set active"}
                      >
                        <span
                          className={`relative h-4 w-7 rounded-full transition-colors ${
                            item.isActive ? "bg-green-500" : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${
                              item.isActive ? "translate-x-3.5" : "translate-x-0.5"
                            }`}
                          />
                        </span>
                        <span className={item.isActive ? "text-green-700" : "text-slate-500"}>
                          {isCategoryLookup
                            ? item.isActive
                              ? "Live"
                              : "Hidden"
                            : item.isActive
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-xs text-medium-gray hover:text-error transition-colors"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
