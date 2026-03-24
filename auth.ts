import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const validUser = process.env.APP_USERNAME
        const validPass = process.env.APP_PASSWORD

        if (
          credentials?.username === validUser &&
          credentials?.password === validPass
        ) {
          return { id: '1', name: validUser as string }
        }
        return null
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user
    },
  },
  session: { strategy: 'jwt' },
})
