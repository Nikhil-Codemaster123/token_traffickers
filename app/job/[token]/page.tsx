import { JobCard } from "@/components/JobCard";

export default async function JobPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <JobCard token={token} />;
}
