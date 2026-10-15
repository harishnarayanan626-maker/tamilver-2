import { forwardToSorkalamHandler } from "../../adapter";

export async function POST(request: Request) {
  return forwardToSorkalamHandler(request);
}
