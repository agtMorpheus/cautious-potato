from playwright.sync_api import sync_playwright

def verify_stromkreis(page):
    print("Navigating to test page...")
    page.goto("http://localhost:8080/test-editable-stromkreise.html")

    # Wait for table to load
    page.wait_for_selector(".positions-table")

    # Wait for positions to be added (script adds them after 500ms)
    page.wait_for_selector("tr.position-row", timeout=10000)

    print("Table loaded. Checking fields...")

    # Riso Ohne
    riso_input = page.locator('input[data-field="position.messwerte.risoOhne"]').first
    if riso_input.is_visible():
        print("Riso Ohne input is visible.")
        riso_input.fill("123")
    else:
        print("ERROR: Riso Ohne input not visible!")

    # Riso Mit
    riso_mit_input = page.locator('input[data-field="position.messwerte.risoMit"]').first
    if riso_mit_input.is_visible():
        print("Riso Mit input is visible.")
    else:
        print("ERROR: Riso Mit input not visible!")

    # Kabel Typ (corrected field)
    kabel_input = page.locator('input[data-field="position.kabel.typ"]').first
    if kabel_input.is_visible():
        print("Kabel Typ input is visible.")
        kabel_input.fill("NYM-Test")
    else:
        print("ERROR: Kabel Typ input not visible!")

    # Take screenshot
    page.screenshot(path="verification/verification.png")
    print("Screenshot saved to verification/verification.png")
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
        page = browser.new_page()
        try:
            verify_stromkreis(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        # Set viewport wide enough
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()
        try:
            verify_table(page)
        finally:
            browser.close()
