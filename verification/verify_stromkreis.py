from playwright.sync_api import sync_playwright

def verify_table(page):
    print("Navigating to page...")
    # Navigate to the test page
    page.goto("http://localhost:8000/test-stromkreise-final.html")

    print("Waiting for table...")
    # Wait for the table to appear
    page.wait_for_selector(".positions-table")

    # Wait a bit for any dynamic rendering
    page.wait_for_timeout(1000)

    print("Taking screenshot 1...")
    # Screenshot 1: Initial View (Left side)
    page.screenshot(path="/home/jules/verification/stromkreis_table_left.png")

    # Screenshot 2: Scrolled to right
    # Find the table wrapper
    wrapper = page.locator(".positions-table-wrapper")

    print("Scrolling 200px...")
    # Scroll slightly to check sticky columns
    wrapper.evaluate("element => element.scrollLeft = 200")
    page.wait_for_timeout(500)
    page.screenshot(path="/home/jules/verification/stromkreis_table_scrolled_200.png")

    print("Scrolling 500px...")
    # Scroll more
    wrapper.evaluate("element => element.scrollLeft = 500")
    page.wait_for_timeout(500)
    page.screenshot(path="/home/jules/verification/stromkreis_table_scrolled_500.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Set viewport wide enough
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()
        try:
            verify_table(page)
        finally:
            browser.close()
