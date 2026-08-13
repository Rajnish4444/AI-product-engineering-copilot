# BuildPilot Write-up

## What I built

An AI copilot that sits on the PM ↔ Eng handoff. You paste a rough feature idea, it streams back a PRD, breaks it into engineering tasks with effort estimates, and (in the full architecture) dispatches a coding agent that opens PRs on your repo. Runs on Next.js + Vercel with GitHub as the backend, no database, no queue, no worker.

I picked this framing because most AI dev tools help either the PM or the engineer, not the messy space between them. Cursor and Copilot help you once you're already writing code. ChatPRD helps you write a spec. Almost nothing helps the moment a Slack thread has to become a Linear ticket has to become a branch. That's the gap I wanted to close.

## Tools

I used Claude Code (Opus 4.7) as the primary implementation partner over one focused session. I directed the architecture, the trade-offs, and the sequence of work; it wrote the code, docs, and tests to spec. The product itself talks to LLMs through a small `ModelProvider` abstraction I designed on top of the Vercel AI SDK, with three provider adapters: Anthropic (Claude Sonnet 4.6), Google (Gemini 2.5 Flash), and GitHub Models. The live deploy runs Gemini for the free tier.

## How AI shaped my decisions

The AI didn't drive the architecture. It accelerated it. What I got out of pairing with Claude Code was a fast interlocutor for decisions I would have taken longer to reach on my own.

**Discovery before code.** I made myself answer the who / what / why questions before touching a keyboard. I ran the exercise of comparing three candidate architectures (pure GitHub App, browser-only SPA, and a thin serverless with GitHub-as-DB hybrid) with cost, time, and narrative on the table for each before picking. That's a discipline I try to enforce in real design reviews, and doing it here kept me from over-engineering.

**Multi-provider abstraction from day one.** I've been burned before by tools that assume one model vendor and break when that vendor changes pricing or availability. I wrote it into ADR-0002 as a non-negotiable up front: every LLM call routes through a `ModelProvider` interface, feature code never imports a provider SDK directly. It paid off within hours. Google deprecated `gemini-2.5-pro` for new keys during my session, and the fix was a one-line default-model swap in one adapter file.

**Prompt injection defense and evals as defaults, not features.** I've watched AI apps ship without either. I set the standard early: every prompt wraps user input in delimiters, every eval golden set includes adversarial rows (direct override, delimiter escape, persona hijack), and every prompt file is versioned rather than edited in place. That standard propagated cleanly across the whole prompt library.

## What surprised me

**How much velocity a well-instrumented pairing loop gets you.** I've used AI coding tools for a while and this felt qualitatively different. Once I had ADRs, a `CLAUDE.md`, and a set of skills in `.claude/skills/` codifying my conventions, every subsequent decision I made propagated into consistent code and docs without me restating context. That's the real unlock. Not "AI writes code faster," but "AI keeps my architectural intent coherent across a big surface."

**The delta between demo-quality and tech-lead-quality is smaller than I thought.** I ended up with 70+ commits, eight ADRs, a threat model, an eval harness, a runbook, five reusable skills, and a demo script, all shipping alongside the working app. That's not because AI made it cheap; it's because once you're being explicit about what an AI-native tech lead codebase looks like, producing it becomes a matter of writing down what you already know.

**Live model deprecation caught mid-deploy.** During the Vercel deploy, my first attempt hit Gemini and got a 404. Google had retired the model I'd defaulted to. Because I'd insisted on the provider abstraction, this was a two-minute investigation: write a smoke script that pings every candidate model on my key, keep the one that works, ship. If I'd hardcoded a Gemini pipeline like I was tempted to on day one, this would have been a rewrite. That moment made the abstraction feel less like over-engineering and more like the minimum bar.
