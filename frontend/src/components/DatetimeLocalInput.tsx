import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";

/** Native datetime-local: blur after change so the picker closes without an extra click. */
export function DatetimeLocalInput({ onChange, ...props }: ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      type="datetime-local"
      onChange={(e) => {
        onChange?.(e);
        e.currentTarget.blur();
      }}
    />
  );
}
