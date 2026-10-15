import { forwardToSorkalamHandler } from "../../../../adapter";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  return forwardToSorkalamHandler(request, resolved);
}
