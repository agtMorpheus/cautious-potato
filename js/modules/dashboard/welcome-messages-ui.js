/**
 * Welcome Messages UI Module - Dashboard
 * 
 * Handles the display of daily welcome messages in the navbar
 * with a smooth scrolling/marquee effect.
 */

import { getMessageOfDay, getMessageIndex, getTotalMessages } from './welcome-messages.js';

/** @type {HTMLElement|null} */
let containerElement = null;

/** @type {HTMLElement|null} */
let messageElement = null;

/** @type {boolean} */
let isInitialized = false;

/** @type {number|null} */
let animationFrame = null;

/**
 * Initialize the welcome message UI component
 * Creates or finds the container and starts the display
 */
export function init() {
    if (isInitialized) {
        console.log('Welcome Message UI: Already initialized');
        return;
    }

    // Find or create the container
    containerElement = document.getElementById('welcome-message-container');
    
    if (!containerElement) {
        console.warn('Welcome Message UI: Container not found in DOM');
        return;
    }

    // Render the initial message
    render();
    
    // Start the animation
    startMarquee();

    isInitialized = true;
    console.log('✓ Welcome Message UI initialized');
}

/**
 * Render the welcome message component
 */
function render() {
    if (!containerElement) return;

    const message = getMessageOfDay();
    const messageNumber = getMessageIndex();
    const totalMessages = getTotalMessages();

    containerElement.innerHTML = `
        <div class="welcome-message-wrapper">
            <span class="welcome-message-icon">⚡</span>
            <div class="welcome-message-content">
                <span class="welcome-message-text" id="welcome-message-text">${escapeHtml(message)}</span>
            </div>
            <span class="welcome-message-counter" title="Nachricht ${messageNumber} von ${totalMessages}">${messageNumber}/${totalMessages}</span>
        </div>
    `;

    messageElement = document.getElementById('welcome-message-text');
}

/**
 * Start the marquee animation for long messages
 */
function startMarquee() {
    if (!messageElement) return;

    // Check if message is longer than container
    const checkOverflow = () => {
        if (!messageElement || !containerElement) return;
        
        const contentWrapper = containerElement.querySelector('.welcome-message-content');
        if (!contentWrapper) return;

        const textWidth = messageElement.scrollWidth;
        const containerWidth = contentWrapper.clientWidth;

        if (textWidth > containerWidth) {
            // Add marquee animation class
            messageElement.classList.add('welcome-message-marquee');
            // Set animation duration based on text length
            const duration = Math.max(15, textWidth / 50); // At least 15 seconds
            messageElement.style.setProperty('--marquee-duration', `${duration}s`);
        } else {
            // Remove marquee if text fits
            messageElement.classList.remove('welcome-message-marquee');
        }
    };

    // Initial check
    setTimeout(checkOverflow, 100);

    // Re-check on window resize
    window.addEventListener('resize', checkOverflow);
}

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Update the message (can be called to refresh)
 */
export function updateMessage() {
    if (!isInitialized) {
        init();
        return;
    }
    render();
    startMarquee();
}

/**
 * Destroy the component and cleanup
 */
export function destroy() {
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
    
    if (containerElement) {
        containerElement.innerHTML = '';
    }
    
    containerElement = null;
    messageElement = null;
    isInitialized = false;
    
    console.log('Welcome Message UI: Destroyed');
}

/**
 * Check if the module is initialized
 * @returns {boolean}
 */
export function isReady() {
    return isInitialized;
}

export default {
    init,
    updateMessage,
    destroy,
    isReady
};
