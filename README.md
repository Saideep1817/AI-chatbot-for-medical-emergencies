# Medical Chatbot - AI-Powered Healthcare Assistant

An intelligent medical chatbot built with Next.js, featuring Gemini AI integration for health-related conversations, user authentication, and audio interaction capabilities.

## Features

- 🧠 **Gemini AI Integration** - Intelligent responses powered by Google's Gemini AI
- 💬 **Text-based Chat** - Dynamic health-related guidance through text conversations
- 🎙️ **Audio Interaction** - Voice input and output using Web Speech API
- 🔐 **User Authentication** - Secure login/signup with NextAuth.js
- 📱 **Responsive Design** - Modern UI that works on all devices
- 🏥 **Health-focused** - Specialized prompts for medical guidance and symptom checking

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# NextAuth Configuration
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=http://localhost:3000

# MongoDB Connection
MONGODB_URI=your-mongodb-connection-string

# Google Gemini AI
GEMINI_API_KEY=your-gemini-api-key-here
```

### Getting API Keys

1. **Gemini API Key**: Visit [Google AI Studio](https://aistudio.google.com/app/apikey) to get your free API key
2. **MongoDB**: Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas)

## Getting Started

First, install dependencies and run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
