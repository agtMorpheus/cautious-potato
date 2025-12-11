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

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_stromkreis(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
