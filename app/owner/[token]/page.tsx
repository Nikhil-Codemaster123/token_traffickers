import { OwnerOffer } from "@/components/OwnerOffer";

export default async function OwnerPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <OwnerOffer token={token} />;
}
