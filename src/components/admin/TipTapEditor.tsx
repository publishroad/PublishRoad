"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Image } from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";
import { useEffect, useRef, useState } from "react";
import { uploadBlogImage } from "@/lib/blog-image-upload";

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export default function TipTapEditor({ content, onChange }: TipTapEditorProps) {
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const lastEditorHtmlRef = useRef(content);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({ openOnClick: false }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastEditorHtmlRef.current = html;
      onChange(html);
    },
  });

  // Sync if content changes externally
  useEffect(() => {
    if (!editor) return;

    // Sync only external updates and avoid touching content while user is typing.
    if (content === lastEditorHtmlRef.current || editor.isFocused) {
      return;
    }

    editor.commands.setContent(content, { emitUpdate: false });
    lastEditorHtmlRef.current = content;
  }, [content, editor]);

  async function uploadImageFromComputer(file: File) {
    if (!editor) return;

    setIsUploadingImage(true);
    try {
      const imageUrl = await uploadBlogImage(file);
      editor.chain().focus().setImage({ src: imageUrl, alt: file.name }).run();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Image upload failed";
      window.alert(message);
    } finally {
      setIsUploadingImage(false);
    }
  }

  if (!editor) return null;

  const ToolbarButton = ({
    onClick,
    active,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 rounded text-sm transition-colors ${
        active
          ? "bg-navy text-white"
          : "text-dark-gray hover:bg-ice-blue"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="border border-border-gray rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 border-b border-border-gray bg-ice-blue/50 p-2">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
        >
          H3
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
        >
          • List
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
        >
          1. List
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
        >
          Quote
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive("code")}
        >
          Code
        </ToolbarButton>
        <ToolbarButton
          onClick={() => {
            const url = prompt("Enter URL:");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          active={editor.isActive("link")}
        >
          Link
        </ToolbarButton>
        <ToolbarButton
          onClick={() => {
            const url = prompt("Image URL:");
            if (url) editor.chain().focus().setImage({ src: url }).run();
          }}
        >
          Image
        </ToolbarButton>
        <ToolbarButton
          onClick={() => imageInputRef.current?.click()}
        >
          {isUploadingImage ? "Uploading..." : "Upload Image"}
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHardBreak().run()}
        >
          New Line
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
        >
          ↩
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
        >
          ↪
        </ToolbarButton>
      </div>

      {/* Editor Content */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-4 min-h-[300px] focus:outline-none"
      />

      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void uploadImageFromComputer(file);
          }
          event.target.value = "";
        }}
      />
    </div>
  );
}
