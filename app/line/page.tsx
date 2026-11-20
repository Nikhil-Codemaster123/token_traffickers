import { CallLine } from "@/components/CallLine";

export default function LinePage() {
  return <CallLine agentId={process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || undefined} />;
}
