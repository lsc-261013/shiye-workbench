export function isTextInteraction(
  target: EventTarget | null,
  composing = false,
) {
  if (composing) return true;
  const element = target as HTMLElement | null;
  return Boolean(
    element?.closest?.(
      "input,textarea,select,[contenteditable]:not([contenteditable='false']),[role='textbox']",
    ),
  );
}
