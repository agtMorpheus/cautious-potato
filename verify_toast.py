from playwright.sync_api import sync_playwright
import time

def verify_toasts():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8080/index.html")

        # Wait for page load
        page.wait_for_load_state("networkidle")

        # Inject script to show toasts using dynamic import
        # Note: handlers.js exports are named
        page.evaluate("""
            import('./js/handlers.js').then(module => {
                module.showErrorAlert('Test Error', 'This is a test error message');
                setTimeout(() => {
                    module.showSuccessAlert('Test Success', 'This is a test success message');
                }, 500);
            });
        """)

        # Wait for toasts to appear
        try:
            page.wait_for_selector(".toast--error", timeout=5000)
            page.wait_for_selector(".toast--success", timeout=5000)
            print("Toasts appeared!")
        except Exception as e:
            print(f"Error waiting for toasts: {e}")

        # Take screenshot
        page.screenshot(path="verification_toast.png")

        browser.close()

if __name__ == "__main__":
    verify_toasts()