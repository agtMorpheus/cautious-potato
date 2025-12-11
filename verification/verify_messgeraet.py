from playwright.sync_api import sync_playwright
import time

def verify_messgeraet():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app
        page.goto("http://localhost:8080/index.html")

        # Wait for app to load and navigation to be available
        page.wait_for_selector(".sidebar")

        # Click on "Messgeräte" in sidebar
        # Note: The sidebar link has href="#messgeraet" and text "Messgeräte"
        # Since I am in a headless environment, I should ensure the sidebar is expanded or visible.
        # But even if collapsed, the link exists.

        # Using selector based on data-view attribute which is robust
        page.click('a[data-view="messgeraet"]')

        # Wait for the Messgeräte view to be active
        # The renderer adds content to #messgeraetContainer
        page.wait_for_selector("#messgeraetContainer .messgeraet-module")

        # Wait a bit for animations
        time.sleep(1)

        # Screenshot of the list view
        page.screenshot(path="verification/messgeraet_list.png")
        print("Screenshot of list view taken.")

        # Click "Neues Messgerät" button
        page.click('button[data-messgeraet-action="add"]')

        # Wait for modal
        page.wait_for_selector("#messgeraetFormModal.modal.is-open")
        time.sleep(0.5)

        # Screenshot of the modal
        page.screenshot(path="verification/messgeraet_modal.png")
        print("Screenshot of modal taken.")

        browser.close()

if __name__ == "__main__":
    verify_messgeraet()
