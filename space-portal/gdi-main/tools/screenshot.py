#!/usr/bin/env python3
"""Take screenshots of GDI prototype in headless Chrome."""

import time
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

SCREENSHOT_DIR = Path(__file__).parent / "screenshots"
SCREENSHOT_DIR.mkdir(exist_ok=True)

def get_driver():
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--disable-software-rasterizer")
    opts.add_argument("--window-size=1920,1080")
    opts.binary_location = "/usr/bin/chromium"
    d = webdriver.Chrome(options=opts)
    d.set_page_load_timeout(30)
    return d

def main():
    driver = get_driver()
    
    try:
        # Load the page
        print("[1/5] Loading GDI...")
        driver.get("http://localhost:9876/index.html")
        time.sleep(5)  # Let Cesium initialize + load
        
        # Capture console logs
        logs = driver.get_log("browser")
        print(f"  Console logs ({len(logs)} entries):")
        for log in logs[:30]:
            level = log['level']
            msg = log['message'][:150]
            print(f"    [{level}] {msg}")
        
        # Screenshot 1: Full default view
        print("[2/5] Screenshot: default view...")
        driver.save_screenshot(str(SCREENSHOT_DIR / "01-default-view.png"))
        
        # Screenshot 2: Wait a bit more for globe to render
        print("[3/5] Waiting for globe render...")
        time.sleep(5)
        driver.save_screenshot(str(SCREENSHOT_DIR / "02-after-load.png"))
        
        # Check page title and visible text
        title = driver.title
        print(f"  Page title: {title}")
        
        # Check if Cesium loaded
        cesium_status = driver.execute_script("""
            return {
                cesiumDefined: typeof Cesium !== 'undefined',
                viewerExists: !!window.gdi?.viewer,
                layersExist: !!window.gdi?.layers,
                gdiLogo: document.getElementById('gdi-logo')?.textContent || 'NOT FOUND',
                sidebarVisible: !!document.getElementById('sidebar'),
                bottomBar: !!document.getElementById('bottom-bar'),
            };
        """)
        print(f"  Cesium status: {cesium_status}")
        
        # Screenshot 3: Apply CRT filter
        print("[4/5] Applying CRT filter...")
        driver.execute_script("""
            const btn = document.querySelector('.filter-btn[data-filter="CRT"]');
            if (btn) btn.click();
        """)
        time.sleep(1)
        driver.save_screenshot(str(SCREENSHOT_DIR / "03-crt-filter.png"))
        
        # Screenshot 4: Apply NVG filter
        print("[5/5] Applying NVG filter...")
        driver.execute_script("""
            const btn = document.querySelector('.filter-btn[data-filter="NVG"]');
            if (btn) btn.click();
        """)
        time.sleep(1)
        driver.save_screenshot(str(SCREENSHOT_DIR / "04-nvg-filter.png"))
        
        # Screenshot 5: Apply FLIR filter
        driver.execute_script("""
            const btn = document.querySelector('.filter-btn[data-filter="FLIR"]');
            if (btn) btn.click();
        """)
        time.sleep(1)
        driver.save_screenshot(str(SCREENSHOT_DIR / "05-flir-filter.png"))
        
        print(f"\nScreenshots saved to: {SCREENSHOT_DIR}")
        
    finally:
        driver.quit()

if __name__ == "__main__":
    main()
