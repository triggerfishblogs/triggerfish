---
title: "Bumpers: Staying in Your Lane Without Thinking About It"
date: 2026-03-09
description: Triggerfish bumpers keep your agent working at the level you're in.
  No accidental escalation, no surprises. Toggle them off when you need more. On
  by default.
author: Triggerfish
draft: true
---
![](/blog/images/chatgpt-image-mar-9-2026-04_07_56-pm.png "Title Graphic on Bumpers Keeping you in your lane")

One of the things that makes AI agents genuinely useful is also what makes them occasionally alarming. Give an agent access to your tools and it will use them. All of them, if the task seems to call for it. You ask it to help draft a message and it reaches into your calendar to check availability, pulls some context from a file, checks a Slack thread. Before you know it, a simple task has touched three different data sources at three different classification levels and your session is now tainted to a level you didn't intend to work at.

This isn't a bug. It's the agent doing its job. But it creates a real usability problem: if you're doing casual work and you don't want to accidentally escalate into a context where your confidential data is in play, you either have to micromanage the agent constantly or just accept that sessions drift.

Bumpers fix that.

![](/blog/images/screenshot_20260309_161249.png)

The idea comes straight from bowling. When you put the bumpers up, the ball stays in the lane. It can go anywhere within the lane, bounce around, do its thing. It just can't fall into the gutter. Bumpers in Triggerfish work the same way. When they're on, the agent can do anything that operates at or below the current session's classification level. What it cannot do is take an action that would escalate the session taint. If it tries, the action is blocked before it executes and the agent is told to find another way or let you know you'd need to drop the bumpers to go further.

Bumpers are on by default. When your session starts, you'll see "Bumpers deployed." If you want to give the agent full range of motion, you run /bumpers and they come off. Run it again and they go back on. Your preference persists across sessions, so if you're the kind of person who always works without them, you only have to set that once.

The important thing to understand about what bumpers do and don't do. They are not a general-purpose restriction on the agent. They don't limit what tools the agent can call, what data it can read, or how it handles anything within the current classification level. If your session is already tainted to CONFIDENTIAL and the agent accesses another CONFIDENTIAL resource, bumpers have nothing to say about it. The taint isn't moving. Bumpers only care about escalation.

![](/blog/images/gemini_generated_image_4ovbs34ovbs34ovb.png)

This matters because bumpers are designed to stay out of your way. The whole point is that you shouldn't have to think about classification levels during a normal working session. You set bumpers on, you work, and if the agent reaches for something that would change the nature of your session it stops and tells you. You decide whether to unlock it. That's the entire interaction.

There's one edge case worth knowing about. If you turn bumpers off mid-session and the agent escalates taint, turning bumpers back on doesn't bring the taint back down. Taint is monotonic. It only goes up. So if you disable bumpers, do some work at a higher level, and re-enable them, bumpers are now guarding from that higher level, not the original one. If you want to get back to a clean low-level session, do a full reset.

![](/blog/images/screenshot_20260309_164720.png)

For most people, bumpers will just be a thing that's quietly on and occasionally explains why the agent asked them to enable something instead of doing it automatically. That's the intended experience. The agent stays in the lane, you stay in control, and you only have to make an active decision when you actually want to go further.
