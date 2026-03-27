"use client";

import { useParams } from "next/navigation";
import { DocumentEditor } from "@/components/editor/document-editor";

export default function DocumentPage() {
  const params = useParams<{ id: string }>();

  return <DocumentEditor documentId={params.id} />;
}
