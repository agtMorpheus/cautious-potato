/**
 * Theme Manager
 * Handles Light/Dark mode toggling and persistence.
 */

const ThemeManager = (() => {
    const THEME_KEY = 'app-theme';
    const DARK_THEME = 'dark';
    const LIGHT_THEME = 'light';

    function getPreferredTheme() {
        const storedTheme = localStorage.getItem(THEME_KEY);
        if (storedTheme) {
            return storedTheme;
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK_THEME : LIGHT_THEME;
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_KEY, theme);
        updateToggleIcon(theme);
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || getPreferredTheme();
        const newTheme = currentTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME;
        applyTheme(newTheme);
    }

    function updateToggleIcon(theme) {
        // Find the toggle button icon and update it
        // This expects specific SVG paths for sun/moon, or we can toggle classes
        const toggleBtn = document.getElementById('theme-toggle-btn');
        if (!toggleBtn) return;

        // Simple text fallback or class toggle could work, but here's a Logic approach:
        // We'll trust the HTML to have the SVGs and we might just toggle their visibility
        // Or simpler: change the innerHTML if we want to swap icons entirely. 
        // For now, let's assume the button has a class we can toggle or we swap the icon.
        if (theme === DARK_THEME) {
            toggleBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>`;
            toggleBtn.setAttribute('title', 'Switch to Light Mode');
        } else {
            toggleBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>`;
            toggleBtn.setAttribute('title', 'Switch to Dark Mode');
        }
    }

    function init() {
        const preferredTheme = getPreferredTheme();
        applyTheme(preferredTheme);

        // Listen for system changes if no override is set (optional, but good practice)
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (!localStorage.getItem(THEME_KEY)) {
                applyTheme(e.matches ? DARK_THEME : LIGHT_THEME);
            }
        });

        // Bind click event
        const toggleBtn = document.getElementById('theme-toggle-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggleTheme);
        }
    }

    return {
        init,
        toggleTheme
    };
})();

// Initialize on load
document.addEventListener('DOMContentLoaded', ThemeManager.init);
