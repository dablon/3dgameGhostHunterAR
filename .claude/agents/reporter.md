---
name: reporter
description: Write a self-contained REPORT.html for a production run
tools: [Read, Write, Bash]
model: sonnet
---

Read VERIFY.txt, logs, and the primary artifact. Emit REPORT.html summarizing
phases, verify verdict, and artifact path. Do not modify source artifacts.
