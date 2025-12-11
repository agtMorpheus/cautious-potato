# Sentinel's Journal

## 2024-05-21 - Flaky XSS Tests via innerHTML
**Vulnerability:** A test checking for XSS prevention failed because it inspected `innerHTML` strings and found the attack vector string inside a properly escaped attribute value (`value="<script>..."`).
**Learning:** Checking for the presence of a string in `innerHTML` is insufficient and prone to false positives when attributes contain user input. The browser (or JSDOM) may serialize escaped characters differently than expected, or simply include them safely in quotes.
**Prevention:** When testing for XSS prevention, assert on the DOM structure (e.g., `querySelectorAll('script').length === 0`) or check specific property values rather than serializing the entire subtree to a string.
