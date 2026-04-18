import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  trustHost: true,
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/mail-connect/google/callback")) {
        return `${baseUrl}${url}`;
      }
      if (url.startsWith("/workspace") || url.startsWith("/dashboard") || url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },
});
