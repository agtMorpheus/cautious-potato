from playwright.sync_api import sync_playwright
import os
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.on("console", lambda msg: print(f"Console: {msg.text}"))
        page.on("pageerror", lambda err: print(f"Page Error: {err}"))

        # Load index.html via server
        page.goto("http://localhost:8000/index.html")

        # Wait for page load
        page.wait_for_load_state("networkidle")

        # Navigate to Workflow view
        print("Clicking workflow link...")
        page.click("a[href='#workflow']")

        # Wait for animation
        page.wait_for_timeout(500)

        # Find the drop zone
        drop_zone = page.locator("#file-drop-zone")

        # Wait for visibility
        try:
            drop_zone.wait_for(state="visible", timeout=5000)
        except Exception as e:
            print(f"Wait failed: {e}")
            page.screenshot(path="verification/debug_fail.png")
            return

        # Take screenshot of normal state
        drop_zone.screenshot(path="verification/normal_state.png")

        # Simulate dragenter
        page.evaluate("""
            const dropZone = document.getElementById('file-drop-zone');
            const event = new Event('dragenter');
            dropZone.dispatchEvent(event);
        """)

        # Take screenshot of drag-over state
        drop_zone.screenshot(path="verification/drag_over_state.png")

        # Verify drag-over class
        is_drag_over = page.evaluate("document.getElementById('file-drop-zone').classList.contains('drag-over')")
        print(f"Is drag-over class present: {is_drag_over}")

        # Verify keyboard accessibility
        tab_index = page.evaluate("document.getElementById('file-drop-zone').getAttribute('tabindex')")
        print(f"Tab index: {tab_index}")

        browser.close()

if __name__ == "__main__":
    run()
