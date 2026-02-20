import { redirect } from "next/navigation";

type Params = Record<string, string | string[] | undefined>;

export default function CalabogieHotelPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const sp = searchParams;
  const qs = new URLSearchParams();

  for (const [key, value] of Object.entries(sp || {})) {
    if (Array.isArray(value)) {
      if (value[0]) qs.set(key, value[0]);
      continue;
    }
    if (typeof value === "string" && value.length > 0) {
      qs.set(key, value);
    }
  }

  // Force Calabogie context.
  qs.set("hotelId", "CBE");
  qs.set("hotelNo", "CBE");

  redirect(`/hotelcalabogie/CBE?${qs.toString()}`);
}
