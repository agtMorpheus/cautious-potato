const fs = require('fs');
const path = require('path');
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const { JSDOM } = require('jsdom');

describe('Sidebar Accessibility', () => {
    let dom;
    let document;

    beforeAll(() => {
        // Read the actual index.html file
        const html = fs.readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8');
        dom = new JSDOM(html);
        document = dom.window.document;
    });

    test('all sidebar navigation links should have title and aria-label attributes', () => {
        const links = document.querySelectorAll('.sidebar-nav .nav-link');
        expect(links.length).toBeGreaterThan(0); // Ensure we found links

        links.forEach(link => {
            const textSpan = link.querySelector('.nav-text');
            const linkText = textSpan ? textSpan.textContent.trim() : '';
            const linkHref = link.getAttribute('href');

            // Check for title attribute (for tooltips)
            if (!link.hasAttribute('title')) {
                throw new Error(`Link "${linkHref}" (${linkText}) is missing 'title' attribute`);
            }
            expect(link.getAttribute('title')).toBe(linkText);

            // Check for aria-label attribute (for accessibility)
            if (!link.hasAttribute('aria-label')) {
                throw new Error(`Link "${linkHref}" (${linkText}) is missing 'aria-label' attribute`);
            }
            expect(link.getAttribute('aria-label')).toBe(linkText);
        });
    });

    test('theme toggle button should have aria-label', () => {
        const btn = document.getElementById('theme-toggle-btn');
        expect(btn).toBeTruthy();

        // It already has a title, we want to ensure it keeps it
        expect(btn.getAttribute('title')).toBe('Toggle Dark Mode');

        // It should also have an aria-label because the text might be hidden
        expect(btn.hasAttribute('aria-label')).toBe(true);
        expect(btn.getAttribute('aria-label')).toBe('Toggle Dark Mode');
    });
});
