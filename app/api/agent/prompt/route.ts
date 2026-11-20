import { AGENT_PROMPT } from "@/lib/agentPrompt";

// Prints the system prompt to paste into the ElevenLabs agent.
export async function GET() {
  return new Response(AGENT_PROMPT, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
