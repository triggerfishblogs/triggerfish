---
title: I Built the AI Agent I Wished Existed
date: 2026-03-09
description: I built Triggerfish because every AI agent I found trusted the
  model to enforce its own rules. That's not security. Here's what I did
  instead.
author: Greg Havens
tags:
  - ai
  - ai agents
  - security
  - open source
  - self-hosted
  - llm
  - prompt injection
  - agent security
  - triggerfish
draft: false
---
A while back I started paying close attention to what AI agents could actually do. Not the demos. The real ones, running on real data, in real environments where mistakes have consequences. What I found was that the capability was genuinely there. You could wire an agent into your email, your calendar, your code, your files, and it could do meaningful work. That part impressed me.

What didn't impress me was the security model. Or rather, the absence of one. Every platform I looked at was enforcing its rules the same way: by telling the model what it wasn't supposed to do. Write a good system prompt, describe the boundaries, trust the model to stay inside them. That works until someone figures out how to phrase a request that convinces the model the rules don't apply here, right now, in this specific case. And people do figure that out. It's not that hard.

I kept waiting for someone to build the version of this that I actually wanted to use. One that could connect to everything, work across every channel I was already using, and handle genuinely sensitive data without me having to cross my fingers and hope the model was having a good day. It didn't show up.

So I built it.

Triggerfish is the agent I wanted. It connects to your email, your calendar, your files, your code, your messaging apps. It runs proactively, not just when you prompt it. It works wherever you already work. But the part I'm most serious about is the security architecture. The rules about what the agent can access and where data can flow don't live in a prompt. They live in an enforcement layer that sits outside the model entirely. The model tells the system what it wants to do, and a separate layer decides whether that actually happens. The model cannot negotiate with that layer. It cannot reason around it. It cannot see it.

That distinction matters more than it might sound. It means the security properties of the system don't degrade as the model gets more capable. It means a compromised third-party tool can't talk the agent into doing something it shouldn't. It means you can actually look at the rules, understand them, and trust them, because they're code, not prose.

I open-sourced the enforcement core for exactly that reason. If you can't read it, you can't trust it. That's true of any security claim, and it's especially true when the thing you're securing is an autonomous agent with access to your most sensitive data.

The platform is free for individuals and you can run it yourself. If you'd rather not think about the infrastructure, there's a subscription option where we handle the model and search. Either way, the security model is the same.

This is the agent I wished existed then. I think a lot of people have been waiting for the same thing.
