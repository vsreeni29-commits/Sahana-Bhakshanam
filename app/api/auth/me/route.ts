import { getSession } from "../../../../lib/auth";

export async function GET(request: Request) {
  const session = await getSession(request);
  return session
    ? Response.json({ authenticated: true, user: session })
    : Response.json({ authenticated: false }, { status: 401 });
}
