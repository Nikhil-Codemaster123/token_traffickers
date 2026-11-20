import { Portal } from "@/components/Portal";

export default async function PortalPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  return <Portal caseId={caseId} />;
}
