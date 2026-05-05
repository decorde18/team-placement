import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import db from "@/lib/db"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    // Configure Credentials Provider for manual DB queries
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "user@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Example raw SQL query execution using our connection pool
        try {
          const [rows]: any = await db.query(
            'SELECT * FROM users WHERE email = ? LIMIT 1', 
            [credentials.email]
          )
          
          if (rows.length > 0) {
            const user = rows[0]
            // Note: In production, always compare a hashed password (e.g. using bcrypt)
            // if (await compare(credentials.password, user.passwordHash)) {
            //   return { id: user.id.toString(), name: user.name, email: user.email }
            // }
            
            // Mock matching logic
            if (credentials.password === user.password || credentials.password === "password") {
               return { id: user.id.toString(), name: user.name, email: user.email }
            }
          }

          // Fallback mock check if DB is empty / testing purpose
          if (credentials.email === "admin@example.com" && credentials.password === "password") {
            return { id: "1", name: "Admin", email: "admin@example.com" }
          }
          
          return null
        } catch (error) {
          console.error("Database query failed in authorization:", error)
          return null
        }
      }
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    // signIn: '/login', // Optional: customize login page path
  }
})
