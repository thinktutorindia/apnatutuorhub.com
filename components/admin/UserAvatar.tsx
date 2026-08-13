"use client";

import React, { useState } from "react";

interface UserAvatarProps {
  image?: string | null;
  name?: string | null;
  email: string;
  avatarGrad: string;
  sizeCls?: string;
}

export function UserAvatar({
  image,
  name,
  email,
  avatarGrad,
  sizeCls = "h-10 w-10 text-xs font-800 rounded-2xl",
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const initial = (name || email).charAt(0).toUpperCase();

  if (image && !imgError) {
    return (
      <img
        src={image}
        alt={name || email}
        className={`${sizeCls} shrink-0 object-cover border border-slate-200 shadow-xs`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center ${sizeCls} ${avatarGrad}`}
    >
      {initial}
    </div>
  );
}
