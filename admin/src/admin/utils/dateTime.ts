export function toDateTimeLocalValue(value: string | null | undefined): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (part: number) => String(part).padStart(2, "0");

  return (
    [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join(
      "-",
    ) + `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export function toIsoDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Please enter a valid date and time.");
  }

  return date.toISOString();
}
