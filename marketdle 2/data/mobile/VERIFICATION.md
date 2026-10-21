# Mobile update verification

- Stock Wordle: every guess includes company, sector, industry, market cap, price, P/E, country and IPO year. The same DOM and comparison data are retained, presented as labeled cards below 1024px. Long values wrap; no attributes are hidden.
- All added CSS is scoped below 1024px. Original desktop/theme CSS is preserved byte-for-byte. The desktop Wordle screenshot below the header was pixel-identical; the header differed only by tiny antialiasing values (maximum channel difference 10/255).
- Nine pages checked at 320, 375, 390, 430, 768, 1024 and 1280px, plus 568x320 and 844x390 landscape: 81 page/viewport combinations, no horizontal document overflow.
- Populated Wordle checked separately at all seven portrait widths: one company cell plus seven feedback cells, none horizontally clipped.
- Browser interaction checks: Wordle PLTR search/selection and feedback; Chart MU search/guess and bounded suggestions at reduced 320x420 height; ranking arrow reorder/submission/results with 44x44px controls; trivia selection/advancement; Higher or Lower answer/reveal; mobile navigation and instructions dialog.
- Suggestions adapt to visualViewport resize/scroll events, including keyboard space. These are browser viewport checks, not physical iPhone/Android keyboard tests.
- All 32 regression tests passed, TypeScript passed, production webpack build passed, and existing HTTP checks passed for nine pages and all five modes.
- All 568 stocks, server logic, API routes, saved-progress keys, scoring and daily puzzle generation remain unchanged. Existing daily puzzle fixtures and source/data preservation hashes pass.
- Original 127.0.0.1 player progress was not changed by QA. Mutating Higher or Lower practice checks used a separate localhost origin.

See viewport-checks.json and wordle-checks.json for measured page and populated-board widths. approved-ui-changes.json records exact original source and approved UI hashes so the earlier preservation tests continue detecting unrelated changes.
