import NextAuth from "next-auth";

import { authOptions } from "@/lib/auth";

// NextAuth's catch-all handler serves every /api/auth/* endpoint (sign in,
// callback, session, csrf, sign out) for both GET and POST.
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
