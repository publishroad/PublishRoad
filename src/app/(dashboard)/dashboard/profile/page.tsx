"use client";
// Client component — session data from context, no server-side dynamic needed

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: session?.user?.name ?? "" },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onUpdateProfile(data: ProfileFormData) {
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to update profile");
      return;
    }
    await update({ name: data.name });
    toast.success("Profile updated");
  }

  async function onChangePassword(data: PasswordFormData) {
    const res = await fetch("/api/user/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to change password");
      return;
    }
    toast.success("Password changed successfully");
    passwordForm.reset();
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== "DELETE") {
      toast.error('Type "DELETE" to confirm');
      return;
    }
    setIsDeleting(true);
    const res = await fetch("/api/user/account", { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete account. Please try again.");
      setIsDeleting(false);
      return;
    }
    router.push("/");
  }

  return (
    <>
      <AppHeader title="Profile" />
      <div className="flex-1 p-6 max-w-2xl mx-auto w-full space-y-6">
        {/* Personal Information */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Personal Information</h2>
          <form onSubmit={profileForm.handleSubmit(onUpdateProfile)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...profileForm.register("name")} placeholder="Your name" />
              {profileForm.formState.errors.name && (
                <p className="text-xs text-red-500">{profileForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={session?.user?.email ?? ""} disabled className="bg-gray-50 cursor-not-allowed" />
              <p className="text-xs text-gray-400">Email cannot be changed.</p>
            </div>
            <button
              type="submit"
              disabled={profileForm.formState.isSubmitting}
              className="h-9 px-5 rounded-xl bg-[#465FFF] text-white text-sm font-medium hover:bg-[#3d55e8] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {profileForm.formState.isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Change Password</h2>
          <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input id="currentPassword" type="password" {...passwordForm.register("currentPassword")} placeholder="Enter current password" />
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-xs text-red-500">{passwordForm.formState.errors.currentPassword.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" type="password" {...passwordForm.register("newPassword")} placeholder="At least 8 characters" />
              {passwordForm.formState.errors.newPassword && (
                <p className="text-xs text-red-500">{passwordForm.formState.errors.newPassword.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input id="confirmPassword" type="password" {...passwordForm.register("confirmPassword")} placeholder="Repeat new password" />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="text-xs text-red-500">{passwordForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={passwordForm.formState.isSubmitting}
              className="h-9 px-5 rounded-xl bg-[#465FFF] text-white text-sm font-medium hover:bg-[#3d55e8] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {passwordForm.formState.isSubmitting ? "Changing..." : "Change Password"}
            </button>
          </form>
        </div>

        {/* Danger Zone */}
        <div className="bg-white border border-red-200 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-red-600 mb-2">Danger Zone</h2>
          <p className="text-sm text-gray-500 mb-4">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="deleteConfirm">
                Type <span className="font-mono font-bold">DELETE</span> to confirm
              </Label>
              <Input
                id="deleteConfirm"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                className="border-red-200 focus-visible:ring-red-400"
              />
            </div>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={isDeleting || deleteConfirm !== "DELETE"}
              className="h-9 px-5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isDeleting ? "Deleting..." : "Delete Account"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
