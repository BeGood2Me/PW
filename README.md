# Sean Dempsey — Personal Portfolio

A simple personal portfolio site built with Next.js, listing live projects with links and descriptions.

## Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Customization

Edit these files to update site content — no component changes needed:

- **`src/data/site.ts`** — name, tagline, newsletter label, and X profile URL
- **`src/data/projects.ts`** — project cards (name, URL, description)

## Newsletter signup

The email form posts to `/api/subscribe`. To enable it, add a [Buttondown](https://buttondown.com) API key:

```bash
BUTTONDOWN_API_KEY=your_api_key
```

Add the same variable in your Vercel project settings when deploying.

## Build

```bash
npm run build
npm start
```

## Deploy to Vercel

1. Push this repo to GitHub
2. Import the project at [vercel.com/new](https://vercel.com/new)
3. Deploy — no environment variables required

To use a custom domain, add it in your Vercel project settings and update your DNS records.
