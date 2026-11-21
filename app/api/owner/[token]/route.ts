import { handle } from "@/lib/auth";
import { approveOwnerOffer, ownerOfferView } from "@/lib/tools";

type Context = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Context) {
  const { token } = await params;
  return handle(async () => {
    const offer = await ownerOfferView(token);
    if (!offer) throw new Error("This approval link is no longer available.");
    return offer;
  });
}

export async function POST(_req: Request, { params }: Context) {
  const { token } = await params;
  return handle(() => approveOwnerOffer(token));
}
