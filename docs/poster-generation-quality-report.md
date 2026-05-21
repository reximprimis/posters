# Poster Generation Quality Report

Generated: 2026-05-19T10:49:21.163Z
Run started: 2026-05-19T10:46:19.130Z
Vision review: yes (gpt-4o-mini or QUALITY_VISION_MODEL)

## Test scope

| Category | Style | Planned | Found |
|----------|-------|---------|-------|
| Kawa i herbata | Photography | 3 | 3 |
| Kuchnia i jedzenie | Photography | 3 | 3 |
| Morze i plaża | Minimalism | 3 | 3 |
| Architektura | Line art | 3 | 3 |
| Retro | Abstract | 3 | 3 |
| Botanika | Photography | 3 | 3 |
| Pojazdy | Minimalism | 3 | 3 |

**Total planned:** 21 · **Found for review:** 21

## Pipeline verification

⚠️ Some pipeline checks failed — see tables below.

| Check | Result |
|-------|--------|
| Temp path recorded in metadata | See failures |
| Final PNG 5906×8268 | See failures |
| .gen.tmp.png removed | See failures |
| .meta.json beside PNG | See failures |
| No masters/ or *_master.png | See failures |

## Category/style validation

| Category | Style | Posters | Routing path | Status | Notes |
|----------|-------|---------|--------------|--------|-------|
| Kawa i herbata | Photography | 3 | CATEGORY_STYLE_DEDICATED / Kawa i herbata + Photography | warn | Kawa: missing explicit no-text/no-logo restriction; Kawa: missing explicit no-text/no-logo restriction; Kawa: missing explicit no-text/no-logo restriction |
| Kuchnia i jedzenie | Photography | 3 | CATEGORY_STYLE_DEDICATED / Kuchnia i jedzenie + Photography | error | wrong dimensions |
| Morze i plaża | Minimalism | 3 | STYLE_GENERIC / Minimalism | error | vision:titleMatch=fail; vision:categoryMatch=fail |
| Architektura | Line art | 3 | STYLE_GENERIC / Line art | pass | — |
| Retro | Abstract | 3 | CATEGORY_STYLE_DEDICATED / Retro + Abstract | warn | Retro/Abstract: prompt sounds like realistic photography; Retro/Abstract: prompt sounds like realistic photography; Retro/Abstract: prompt sounds like realistic photography |
| Botanika | Photography | 3 | CATEGORY_STYLE_DEDICATED / Botanika + Photography | pass | — |
| Pojazdy | Minimalism | 3 | CATEGORY_HARD_OVERRIDE / Pojazdy | pass | — |

## Prompt quality review

| Title | Category | Style | Prompt issue? | Notes |
|-------|----------|-------|---------------|-------|
| Morning Brew Ritual | Kawa i herbata | Photography | yes | Kawa: missing explicit no-text/no-logo restriction |
| Morning Brew Embrace | Kawa i herbata | Photography | yes | Kawa: missing explicit no-text/no-logo restriction |
| Teapot Serenity Ritual | Kawa i herbata | Photography | yes | Kawa: missing explicit no-text/no-logo restriction |
| Vibrant Pasta Medley | Kuchnia i jedzenie | Photography | no | The image features a vibrant pasta dish, which aligns well with the title, category, and photographic style. There are no visible text or logos, and the subject does not touch the outer edges. |
| Artisan Bread Crust | Kuchnia i jedzenie | Photography | no | The image of artisan bread fits the title, category, and style well. There is no visible text or logos, and the subject does not touch the outer edges. |
| Lemon Grove Harvest | Kuchnia i jedzenie | Photography | no | The title matches the image theme, the category fits well with the subject matter, and the photographic style is consistent. No text or logos are present, and the subject does not touch the outer edges. |
| Dune Shadows at Sunset | Morze i plaża | Minimalism | no | The title does not match the image content, the category does not fit the subject, but the style aligns with minimalism. |
| Lighthouse Reflecting Calm Waters | Morze i plaża | Minimalism | no | The title, category, and style are all fitting well. No visible text or logos, and the subject does not touch the outer edges significantly. |
| Shells on Soft Sand | Morze i plaża | Minimalism | no | The image fits the title, category, and style without any visible text or logos. |
| Brutalist Columns in Line | Architektura | Line art | no | No visible text or logos, and the subject does not touch the outer edges. |
| Elegant Stairs of Modernism | Architektura | Line art | no | The title, category, and style all align well with the image. No visible text or logos, and the subject does not touch the edges. |
| Arched Elegance | Architektura | Line art | no | The title matches the image well and fits the architectural category. The line art style is consistent without any mixing, and there are no visible texts or logos. The subject does not touch the outer edges. |
| Faded Polaroid Memories | Retro | Abstract | yes | Retro/Abstract: prompt sounds like realistic photography |
| Cassettes and Polaroid Dreams | Retro | Abstract | yes | Retro/Abstract: prompt sounds like realistic photography |
| Faded Memories in Sepia | Retro | Abstract | yes | Retro/Abstract: prompt sounds like realistic photography |
| Whispers of Wildflowers | Botanika | Photography | no | The title, category, and style all align well with the image description of a botanical photograph featuring wildflowers in a vase. |
| Delicate Magnolia Stem | Botanika | Photography | no | The image aligns well with the title, category, and style. There are no visible texts or logos, and the subject does not touch the outer edges. |
| Cherry Blossom Reverie | Botanika | Photography | no | The title, category, and style all align well with the image of cherry blossoms. There are no visible texts or logos, and the subject does not touch the outer edges. |
| Serene Waters with Sails | Pojazdy | Minimalism | no | The title, category, and style fit well with the image, and there is no text or logos present. |
| Nautical Lines Abstraction | Pojazdy | Minimalism | no | The image fits well with the title, category, and style. No visible text or logos, and the subject is not touching the edges. |
| Silhouetted Flight Above Clouds | Pojazdy | Minimalism | no | The title, category, and style align well with the image. No visible text or logos detected, and the subject does not touch the outer edges. |

## Output file validation

| Title | Final PNG exists | Size 5906x8268 | Metadata exists | Temp removed | Status |
|-------|------------------|----------------|-------------------|--------------|--------|
| Morning Brew Ritual | yes | 5906×8268 | yes | yes | warn |
| Morning Brew Embrace | yes | 5906×8268 | yes | yes | warn |
| Teapot Serenity Ritual | yes | 5906×8268 | yes | yes | warn |
| Vibrant Pasta Medley | yes | 5512×8268 | yes | yes | error |
| Artisan Bread Crust | yes | 5906×8268 | yes | yes | pass |
| Lemon Grove Harvest | yes | 5906×8268 | yes | yes | pass |
| Dune Shadows at Sunset | yes | 5906×8268 | yes | yes | error |
| Lighthouse Reflecting Calm Waters | yes | 5906×8268 | yes | yes | pass |
| Shells on Soft Sand | yes | 5906×8268 | yes | yes | pass |
| Brutalist Columns in Line | yes | 5906×8268 | yes | yes | pass |
| Elegant Stairs of Modernism | yes | 5906×8268 | yes | yes | pass |
| Arched Elegance | yes | 5906×8268 | yes | yes | pass |
| Faded Polaroid Memories | yes | 5906×8268 | yes | yes | warn |
| Cassettes and Polaroid Dreams | yes | 5906×8268 | yes | yes | warn |
| Faded Memories in Sepia | yes | 5906×8268 | yes | yes | warn |
| Whispers of Wildflowers | yes | 5906×8268 | yes | yes | pass |
| Delicate Magnolia Stem | yes | 5906×8268 | yes | yes | pass |
| Cherry Blossom Reverie | yes | 5906×8268 | yes | yes | pass |
| Serene Waters with Sails | yes | 5906×8268 | yes | yes | pass |
| Nautical Lines Abstraction | yes | 5906×8268 | yes | yes | pass |
| Silhouetted Flight Above Clouds | yes | 5906×8268 | yes | yes | pass |

## Safe framing review

| Title | Safe framing in prompt | Edge risk | Notes |
|-------|-------------------------|-----------|-------|
| Morning Brew Ritual | yes | low | border/center Δ≈2 (heuristic) |
| Morning Brew Embrace | yes | low | border/center Δ≈0 (heuristic) |
| Teapot Serenity Ritual | yes | low | border/center Δ≈18 (heuristic) |
| Vibrant Pasta Medley | yes | low | border/center Δ≈33 (heuristic) |
| Artisan Bread Crust | yes | low | border/center Δ≈31 (heuristic) |
| Lemon Grove Harvest | yes | low | border/center Δ≈7 (heuristic) |
| Dune Shadows at Sunset | yes | low | border/center Δ≈26 (heuristic) |
| Lighthouse Reflecting Calm Waters | yes | low | border/center Δ≈19 (heuristic) |
| Shells on Soft Sand | yes | low | border/center Δ≈9 (heuristic) |
| Brutalist Columns in Line | yes | low | border/center Δ≈24 (heuristic) |
| Elegant Stairs of Modernism | yes | low | border/center Δ≈29 (heuristic) |
| Arched Elegance | yes | low | border/center Δ≈17 (heuristic) |
| Faded Polaroid Memories | yes | low | border/center Δ≈41 (heuristic) |
| Cassettes and Polaroid Dreams | yes | low | border/center Δ≈36 (heuristic) |
| Faded Memories in Sepia | yes | low | border/center Δ≈34 (heuristic) |
| Whispers of Wildflowers | yes | low | border/center Δ≈6 (heuristic) |
| Delicate Magnolia Stem | yes | low | border/center Δ≈8 (heuristic) |
| Cherry Blossom Reverie | yes | low | border/center Δ≈2 (heuristic) |
| Serene Waters with Sails | yes | low | border/center Δ≈24 (heuristic) |
| Nautical Lines Abstraction | yes | low | border/center Δ≈23 (heuristic) |
| Silhouetted Flight Above Clouds | yes | low | border/center Δ≈19 (heuristic) |

## Metadata review

| Title | Required metadata complete | Routing path | Master stored false | Temp removed true | Status |
|-------|---------------------------|--------------|----------------------|-------------------|--------|
| Morning Brew Ritual | yes | CATEGORY_STYLE_DEDICATED / Kawa i herbata + Photography | yes | yes | warn |
| Morning Brew Embrace | yes | CATEGORY_STYLE_DEDICATED / Kawa i herbata + Photography | yes | yes | warn |
| Teapot Serenity Ritual | yes | CATEGORY_STYLE_DEDICATED / Kawa i herbata + Photography | yes | yes | warn |
| Vibrant Pasta Medley | yes | CATEGORY_STYLE_DEDICATED / Kuchnia i jedzenie + Photography | yes | yes | error |
| Artisan Bread Crust | yes | CATEGORY_STYLE_DEDICATED / Kuchnia i jedzenie + Photography | yes | yes | pass |
| Lemon Grove Harvest | yes | CATEGORY_STYLE_DEDICATED / Kuchnia i jedzenie + Photography | yes | yes | pass |
| Dune Shadows at Sunset | yes | STYLE_GENERIC / Minimalism | yes | yes | error |
| Lighthouse Reflecting Calm Waters | yes | STYLE_GENERIC / Minimalism | yes | yes | pass |
| Shells on Soft Sand | yes | STYLE_GENERIC / Minimalism | yes | yes | pass |
| Brutalist Columns in Line | yes | STYLE_GENERIC / Line art | yes | yes | pass |
| Elegant Stairs of Modernism | yes | STYLE_GENERIC / Line art | yes | yes | pass |
| Arched Elegance | yes | STYLE_GENERIC / Line art | yes | yes | pass |
| Faded Polaroid Memories | yes | CATEGORY_STYLE_DEDICATED / Retro + Abstract | yes | yes | warn |
| Cassettes and Polaroid Dreams | yes | CATEGORY_STYLE_DEDICATED / Retro + Abstract | yes | yes | warn |
| Faded Memories in Sepia | yes | CATEGORY_STYLE_DEDICATED / Retro + Abstract | yes | yes | warn |
| Whispers of Wildflowers | yes | CATEGORY_STYLE_DEDICATED / Botanika + Photography | yes | yes | pass |
| Delicate Magnolia Stem | yes | CATEGORY_STYLE_DEDICATED / Botanika + Photography | yes | yes | pass |
| Cherry Blossom Reverie | yes | CATEGORY_STYLE_DEDICATED / Botanika + Photography | yes | yes | pass |
| Serene Waters with Sails | yes | CATEGORY_HARD_OVERRIDE / Pojazdy | yes | yes | pass |
| Nautical Lines Abstraction | yes | CATEGORY_HARD_OVERRIDE / Pojazdy | yes | yes | pass |
| Silhouetted Flight Above Clouds | yes | CATEGORY_HARD_OVERRIDE / Pojazdy | yes | yes | pass |

## Problems found

- Vibrant_Pasta_Medley: size 5512×8268, expected 5906×8268

## Recommended fixes

- `src/salesCategoryPrompts.js` / coffee Photography builder — ensure explicit `no text, no logo, no labels` in `finalPromptSentToModel`.

## Summary

| Metric | Count |
|--------|-------|
| Posters reviewed | 21 |
| Generated this run | 0 |
| Pass | 13 |
| Warnings | 6 |
| Errors | 2 |