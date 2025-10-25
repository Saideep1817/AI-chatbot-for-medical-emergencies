import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import { MongoDBAdapter } from '@next-auth/mongodb-adapter';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import dbConnect from './mongodb';
import User from '../models/User';

const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chatbot');
const clientPromise = client.connect().catch(() => {
  console.warn('MongoDB connection failed, some features may not work');
  return null;
});

export const authOptions: NextAuthOptions = {
  // adapter: MongoDBAdapter(clientPromise), // Temporarily disabled until MongoDB is properly connected
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // For demo purposes, we'll use a simple test user
          // In production, this should query the database
          const testUser = {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            password: await bcrypt.hash('123456', 12), // password: 123456
          };

          // Check if credentials match test user
          if (credentials.email === testUser.email) {
            const isPasswordValid = await bcrypt.compare(
              credentials.password,
              testUser.password
            );

            if (isPasswordValid) {
              return {
                id: testUser.id,
                email: testUser.email,
                name: testUser.name,
              };
            }
          }

          // For any other email, allow login with any password for demo
          return {
            id: Date.now().toString(),
            email: credentials.email,
            name: credentials.email.split('@')[0],
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
    // Temporarily disabled - add real credentials to enable
    // GoogleProvider({
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // }),
    // GitHubProvider({
    //   clientId: process.env.GITHUB_ID!,
    //   clientSecret: process.env.GITHUB_SECRET!,
    // }),
  ],
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-key-for-development-only',
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin', // Redirect errors to sign-in page
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string;
      }
      return session;
    },
  },
};
