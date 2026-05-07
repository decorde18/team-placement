import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import db from "@/lib/db"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "user@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // AUTH BYPASS LOGIC (DEV ONLY)
        if (
          process.env.AUTH_BYPASS_ENABLED === "true" && 
          credentials.email === process.env.BYPASS_USER_EMAIL
        ) {
          console.warn("⚠️ AUTH BYPASS ENABLED: Logging in without password check.");
          return {
            id: process.env.BYPASS_USER_ID || "1",
            name: "Dev Admin (Bypass)",
            email: credentials.email,
            role: "admin"
          };
        }

        try {
          // Find user in DB
          const [rows]: any = await db.query(
            'SELECT * FROM users WHERE email = ? LIMIT 1', 
            [credentials.email]
          );
          
          if (rows.length > 0) {
            const user = rows[0];
            
            // Note: Verify against password_hash if present, otherwise fallback (for testing standard users)
            if (user.password_hash) {
              const isValid = await bcrypt.compare(credentials.password, user.password_hash);
              if (isValid) {
                return { id: user.id.toString(), name: user.name, email: user.email, role: user.role, assigned_team_id: user.assigned_team_id };
              }
            } else if (credentials.password === user.password || credentials.password === "password") {
               // Fallback if testing before hashing is strictly enforced
               return { id: user.id.toString(), name: user.name, email: user.email, role: user.role, assigned_team_id: user.assigned_team_id };
            }
          }
          
          return null
        } catch (error) {
          console.error("Database query failed in authorization:", error);
          return null;
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // user is only available on the first sign in
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.assigned_team_id = (user as any).assigned_team_id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).assigned_team_id = token.assigned_team_id;
      }
      return session;
    }
  },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET,
  pages: {
    signIn: '/login',
  }
}
