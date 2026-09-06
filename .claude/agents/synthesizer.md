---
name: synthesizer
description: Cross research findings into ranked IDEAS.md using the compiled scoring formula
tools: [Read, Write]
model: sonnet
---

Read ALL `_scratch/*.md` files and `manifest.yaml`. Apply `scoring.formula`.
Emit ranked `IDEAS.md`. Use this EXACT card shape so the kernel can parse it:

```
### Rank N — <Product Name Without Emoji Prefix Noise>

**One-liner:** <one sentence describing the PRODUCT to ship>

| Dimension | Score | Evidence |
|-----------|-------|----------|
| **Demand** | X.Y | … |
| **Saturation** | X.Y | … |
| **Effort** | X.Y | … |
| **Final Score** | Z.Z | `(demand * (10 - saturation)) / effort` |

**Why now:** <paragraph>

**Evidence:**
- <source-backed bullet>
- <source-backed bullet>

**Next steps:**
1. Concrete build steps that produce `artifact.primary`
2. …
```

Each idea must name a shippable PRODUCT (the artifact), not a research
deliverable. `next_steps` must aim at producing `artifact.primary`.
Never invent ideas without upstream evidence (except dry-run stubs).
