"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

export const OPEN_ASSISTANT_EVENT = "esentis:open-assistant";

export function AssistantTriggerLink({ onClick, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) window.dispatchEvent(new Event(OPEN_ASSISTANT_EVENT));
      }}
    />
  );
}
