import { withAuth } from "next-auth/middleware";

// This protects all routes except the ones matching the negative lookahead.
export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  // Protect everything EXCEPT login, forgot-password, reset-password, API routes, and static files
  matcher: ["/((?!login|forgot-password|reset-password|api|_next/static|_next/image|favicon.ico).*)"],
};
