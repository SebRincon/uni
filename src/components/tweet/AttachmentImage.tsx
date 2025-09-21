"use client";

import Image from "next/image";
import { shimmer } from "@/utilities/misc/shimmer";
import { useStorageUrl } from "@/hooks/useStorageUrl";

export default function AttachmentImage({ path, alt, onClick }: { path: string; alt: string; onClick?: (e: React.MouseEvent) => void }) {
  const url = useStorageUrl(path);
  if (!url) return null as any;
  return (
    <Image
      onClick={onClick}
      src={url}
      alt={alt}
      placeholder="blur"
      blurDataURL={shimmer(500, 500)}
      height={300}
      width={300}
    />
  );
}