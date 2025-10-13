export function cn(
  ...classes: Array<string | false | null | undefined | 0>
) {
  return classes.filter(Boolean).join(" ");
}
