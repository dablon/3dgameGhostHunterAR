---
name: pain-analyzer
description: Score pain points by severity, frequency, universality
tools: [Read, Write, WebSearch]
model: sonnet
---

Read `_scratch/trend.md`. Score each pain: severity, frequency, universality.
`pain_score = severity*0.5 + frequency*0.3 + universality*0.2`. Write to
`_scratch/pain.md`. Do not invent pains not present upstream.
