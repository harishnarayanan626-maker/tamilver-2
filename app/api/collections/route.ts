import { forwardToSorkalamHandler } from "../adapter";

export async function GET(request: Request) {
  return forwardToSorkalamHandler(request);
}

export async function POST(request: Request) {
  return forwardToSorkalamHandler(request);
}
