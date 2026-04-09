# Generative UI Chatbot

A dynamic, AI-powered chatbot application that generates interactive UI components in real-time, enabling rich conversational experiences with adaptive interfaces.

## Features

- 🤖 **AI-Powered Conversations**: Leverages advanced language models for natural dialogue
- 🎨 **Dynamic UI Generation**: Automatically generates UI components based on conversation context
- ⚡ **Real-Time Responses**: Instant feedback with streaming responses
- 🎯 **Context-Aware**: Maintains conversation history for coherent interactions
- 📱 **Responsive Design**: Works seamlessly across desktop and mobile devices
- 🎭 **Customizable Components**: Generates forms, charts, cards, tables, and more
- 🔌 **Extensible Architecture**: Easy to integrate with various AI providers

## Tech Stack

- **Frontend**: React, TypeScript, Next.js
- **Styling**: Tailwind CSS, Radix UI
- **AI Integration**: Vercel AI SDK
- **State Management**: React Hooks
- **Streaming**: Server-Sent Events (SSE)

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm, yarn, or pnpm
- An API key from your preferred AI provider (OpenAI, Anthropic, etc.)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Generative-UI-chatbot
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Create a `.env.local` file in the root directory:
```env
OPENAI_API_KEY=your_openai_api_key_here
# or
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Usage

Simply type a message in the chat input and press Enter. The AI will respond with:
- Text responses
- Interactive UI components (buttons, forms, cards)
- Structured data displays
- Rich media elements

## Project Structure

```
Generative-UI-chatbot/
├── src/
│   ├── app/              # Next.js app router
│   ├── components/       # Reusable UI components
│   ├── lib/              # Utility functions and AI configuration
│   └── hooks/            # Custom React hooks
├── public/               # Static assets
├── .env.local            # Environment variables (not committed)
├── package.json          # Dependencies and scripts
└── README.md             # This file
```

## Configuration

The chatbot can be configured with different AI providers and models. See `src/lib/ai-config.ts` for available options.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the terms specified in the [LICENSE](LICENSE) file.

## Acknowledgments

- Built with [Vercel AI SDK](https://sdk.vercel.ai/docs)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)