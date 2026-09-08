const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: 'new',
        executablePath: '/usr/bin/chromium',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--window-size=1920,1080',
            '--disable-web-security',
            '--ignore-certificate-errors',
        ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('Loading GDI...');
    await page.goto('http://localhost:8600', { waitUntil: 'networkidle0', timeout: 60000 });

    // Wait for Cesium to initialize
    await page.waitForFunction(() => window.Cesium !== undefined, { timeout: 30000 });
    console.log('Cesium loaded');

    // Wait a bit for globe to render
    await new Promise(r => setTimeout(r, 8000));

    const outDir = '/home/adam/workspace/enterprise/projects/gdi/screenshots';
    const fs = require('fs');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    // Screenshot 1: Full globe view (default)
    console.log('Shot 1: Full globe overview');
    await page.screenshot({ path: `${outDir}/01-globe-overview.png`, fullPage: false });

    // Screenshot 2: Fly to Pakistan overview
    console.log('Shot 2: Pakistan overview');
    await page.evaluate(() => {
        const viewer = window._gdiViewer || window.viewer;
        if (viewer) {
            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(69.5, 30.0, 3000000),
                orientation: { heading: 0, pitch: -Math.PI/2, roll: 0 },
                duration: 0,
            });
        }
    });
    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: `${outDir}/02-pakistan-overview.png`, fullPage: false });

    // Screenshot 3: Islamabad region
    console.log('Shot 3: Islamabad region');
    await page.evaluate(() => {
        const viewer = window._gdiViewer || window.viewer;
        if (viewer) {
            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(73.05, 33.69, 150000),
                orientation: { heading: 0, pitch: -Math.PI/2, roll: 0 },
                duration: 0,
            });
        }
    });
    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: `${outDir}/03-islamabad-region.png`, fullPage: false });

    // Screenshot 4: Islamabad city level
    console.log('Shot 4: Islamabad city');
    await page.evaluate(() => {
        const viewer = window._gdiViewer || window.viewer;
        if (viewer) {
            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(73.04, 33.72, 30000),
                orientation: { heading: 0, pitch: -Math.PI/2, roll: 0 },
                duration: 0,
            });
        }
    });
    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: `${outDir}/04-islamabad-city.png`, fullPage: false });

    // Screenshot 5: Street level - Blue Area
    console.log('Shot 5: Street level Blue Area');
    await page.evaluate(() => {
        const viewer = window._gdiViewer || window.viewer;
        if (viewer) {
            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(73.047, 33.710, 5000),
                orientation: { heading: 0, pitch: -Math.PI/2, roll: 0 },
                duration: 0,
            });
        }
    });
    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: `${outDir}/05-street-level.png`, fullPage: false });

    // Screenshot 6: 3D tilted view of Islamabad
    console.log('Shot 6: 3D tilted view');
    await page.evaluate(() => {
        const viewer = window._gdiViewer || window.viewer;
        if (viewer) {
            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(73.04, 33.70, 5000),
                orientation: {
                    heading: Cesium.Math.toRadians(30),
                    pitch: Cesium.Math.toRadians(-25),
                    roll: 0,
                },
                duration: 0,
            });
        }
    });
    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: `${outDir}/06-3d-tilted.png`, fullPage: false });

    // Screenshot 7: Sidebar visible
    console.log('Shot 7: Sidebar and HUD');
    await page.evaluate(() => {
        // Open sidebar if it exists
        const toggle = document.querySelector('#sidebarToggle, .sidebar-toggle, [data-sidebar-toggle]');
        if (toggle) toggle.click();
    });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: `${outDir}/07-sidebar-hud.png`, fullPage: false });

    // Screenshot 8: Middle East theater
    console.log('Shot 8: Middle East overview');
    await page.evaluate(() => {
        const viewer = window._gdiViewer || window.viewer;
        if (viewer) {
            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(50.0, 28.0, 5000000),
                orientation: { heading: 0, pitch: -Math.PI/2, roll: 0 },
                duration: 0,
            });
        }
    });
    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: `${outDir}/08-middle-east.png`, fullPage: false });

    console.log('All screenshots saved to', outDir);
    await browser.close();
})();
