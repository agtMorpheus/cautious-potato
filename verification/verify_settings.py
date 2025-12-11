from playwright.sync_api import sync_playwright

def verify_settings(page):
    page.goto("http://localhost:8000/index.html")

    # Click Settings link in sidebar
    page.click("a[href='#settings']")

    # Select "Sync with Server" mode
    # Using get_by_text is more robust if the structure is nested
    page.get_by_text("Mit Server synchronisieren").click()

    # Wait for API config section to be visible
    api_section = page.locator("#api-config-section")
    api_section.wait_for(state="visible")

    # Check for input
    page.locator("#api-base-url").wait_for(state="visible")

    # Take screenshot
    page.screenshot(path="verification/settings.png")

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    try:
        verify_settings(page)
    finally:
        browser.close()
