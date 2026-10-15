import { forwardToSorkalamHandler } from "../../../adapter";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  return forwardToSorkalamHandler(request, resolved);
}
