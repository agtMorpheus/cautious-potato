import os
from playwright.sync_api import sync_playwright

def verify_csp():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Listen for console messages
        page.on("console", lambda msg: print(f"Console: {msg.text}"))
        page.on("pageerror", lambda err: print(f"Page Error: {err}"))

        # Load the file
        cwd = os.getcwd()
        file_url = f"file://{cwd}/index.html"
        print(f"Loading {file_url}")

        try:
            page.goto(file_url)
            # Wait a bit for scripts to load
            page.wait_for_timeout(3000)

            # Check if XLSX is loaded (it comes from CDN)
            is_xlsx_loaded = page.evaluate("typeof XLSX !== 'undefined'")
            print(f"Is XLSX loaded: {is_xlsx_loaded}")

            # Check for CSP meta tag presence
            meta_csp = page.locator('meta[http-equiv="Content-Security-Policy"]').count()
            print(f"CSP meta tag count: {meta_csp}")

            # Take screenshot
            page.screenshot(path="verification/csp_check.png")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_csp()
