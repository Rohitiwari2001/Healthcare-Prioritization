import { redirect } from "next/navigation";

export default async function ReceptionistCatchAll({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  redirect(`/reception/${slug.join("/")}`);
}
