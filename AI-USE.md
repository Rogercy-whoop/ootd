# How AI was used to build OOTD

Most of this code was written by AI tools working from my instructions. This file says which tools, for which parts, and which decisions were mine.

## July 2025: the first version, with Firebase Studio and Cursor

- **Tools:** Firebase Studio, Google's AI app builder, and Cursor, an AI code editor I used on my own computer. This was during LaunchX at Boston University.
- **How it worked:** I described the app and each feature in plain English, and the AI wrote the code. Its first plan for the app is still in [`docs/blueprint.md`](docs/blueprint.md) (it called the app "StyleAI"). The UI component library in [`src/components/ui/`](src/components/ui/) is standard generated shadcn/ui code.
- **What git can and cannot show:** all 45 commits from 4–11 July 2025 (`672c7ff` → `c4bff4d`) are under my GitHub account, including the ones made from Firebase Studio and Cursor. Git therefore cannot separate lines the AI wrote from lines I wrote, or tell which tool made which commit.
- **My part:** as Team 11's team leader and technical lead, I built the interface by directing these tools, integrated the AI models and their APIs (Gemini for tagging and outfit ideas, Replicate for background removal), and set up the Firebase project and its hosting. See [ROLES.md](ROLES.md) for the rest of the team.

## October 2026: the relaunch, with Claude Code

- **Tool:** Claude Code (Anthropic's coding agent), working in my copy of this repo under my direction, 10–13 October 2026.
- **What it did:** read the whole project, ran it, found what was broken, wrote the fixes and tested them on the live site. Every commit from `f6cbcb7` onwards was written by Claude Code and is marked `Co-Authored-By: Claude` in the git log. It also drafted this file, the README and ROLES.md from facts I confirmed.
- **What it found and fixed:**
  - The tagger had never sent the photo to Gemini as an image. It sent it as a long string of text, so the AI was guessing.
  - The app used Gemini 1.5 models that Google has retired.
  - Failures were hidden: a failed tag was saved as an "unknown" item, and a failed outfit fell back to a made-up suggestion.
  - "Enter location manually" called a weather service with the placeholder key `YOUR_API_KEY`, so it could never work.
  - The "Upgrade to Premium" buttons linked to Stripe checkout pages, but nothing granted Premium after someone paid.
  - The first Netlify deploy returned "Page not found" until a `netlify.toml` told Netlify how to serve a Next.js app.
  - The free limit of five counted closet slots, so deleting and re-adding items gave unlimited free photo analyses. It now counts the analyses themselves.

### Decisions that were mine

- To relaunch the latest GitHub version rather than the older copy in my Firebase Studio workspace.
- To launch quickly with the basic features working, rather than finish everything first.
- **Guest-only, no accounts,** so people's clothing photos stay in their own browser instead of on our servers.
- **To remove the payment links** instead of launching a Premium plan that did not work, and to keep our original limit of five, now as a cap of five free photo analyses per browser.
- To host on Netlify after Vercel's phone verification would not accept my number.
- To take out the debug pages and the unfinished 3D viewer before sharing the link.
- I created the Gemini API key (on the free tier, in our Firebase project) and the Netlify site, and entered the key into Netlify myself. Claude Code's test scripts read the key from my local settings file to call Gemini, but never printed it.
