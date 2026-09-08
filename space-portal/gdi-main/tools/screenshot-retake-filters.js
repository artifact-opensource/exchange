const puppeteer = require('puppeteer');
const OUT = '/home/adam/workspace/enterprise/projects/gdi/screenshots';

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        executablePath: '/usr/bin/chromium',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--window-size=1920,1080',
            '--disable-dev-shm-usage',
            '--start-maximized',
        ],
        env: { ...process.env, DISPLAY: ':0' },
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('Loading GDI...');
    await page.goto('http://localhost:8600', { waitUntil: 'networkidle2', timeout: 60000 });

    await page.waitForFunction(
        () => document.body.innerText.includes('SYSTEM ONLINE') || document.querySelector('.cesium-widget canvas'),
        { timeout: 30000 }
    );
    console.log('Cesium loaded. Waiting 20s for tiles...');
    await new Promise(r => setTimeout(r, 20000));

    const fly = async (lon, lat, alt, heading = 0, pitch = -90, wait = 12000) => {
        await page.evaluate(({ lon, lat, alt, heading, pitch }) => {
            const v = window.gdi && window.gdi.viewer;
            if (!v) return;
            v.camera.setView({
                destination: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
                orientation: {
                    heading: Cesium.Math.toRadians(heading),
                    pitch: Cesium.Math.toRadians(pitch),
                    roll: 0,
                },
            });
        }, { lon, lat, alt, heading, pitch });
        await new Promise(r => setTimeout(r, wait));
    };

    // Dismiss any lingering Cesium error popups
    await page.evaluate(() => {
        const panel = document.querySelector('.cesium-widget-errorPanel');
        if (panel) panel.style.display = 'none';
        const overlay = document.querySelector('.cesium-widget-errorPanel-overlay');
        if (overlay) overlay.style.display = 'none';
    });

    // Fly to Islamabad city
    await fly(73.04, 33.72, 40000, 0, -90, 15000);

    // Apply filters using the FilterManager directly
    const applyFilter = async (filterName) => {
        await page.evaluate((name) => {
            if (window.gdi && window.gdi.filterManager) {
                window.gdi.filterManager.apply(name);
            } else {
                // Fallback: click buttons
                const btns = document.querySelectorAll('button');
                for (const b of btns) {
                    if (b.textContent.trim().toUpperCase().includes(name.toUpperCase())) {
                        b.click();
                        break;
                    }
                }
            }
        }, filterName);
        await new Promise(r => setTimeout(r, 4000));
    };

    // 13. CRT
    console.log('Shot 13: CRT filter');
    await applyFilter('CRT');
    await page.screenshot({ path: `${OUT}/g13-crt.png` });

    // 14. NVG
    console.log('Shot 14: Night Vision');
    await applyFilter('NVG');
    await page.screenshot({ path: `${OUT}/g14-nvg.png` });

    // 15. FLIR
    console.log('Shot 15: FLIR Thermal');
    await applyFilter('FLIR');
    await page.screenshot({ path: `${OUT}/g15-flir.png` });

    // 16. Dramatic globe - back to normal first
    console.log('Shot 16: Globe dramatic');
    await applyFilter('NORMAL');
    await fly(40, 20, 12000000, 30, -80, 12000);
    await page.screenshot({ path: `${OUT}/g16-globe-dramatic.png` });

    // Check for any errors on page
    const errors = await page.evaluate(() => {
        const panel = document.querySelector('.cesium-widget-errorPanel');
        return panel ? panel.textContent : 'No errors';
    });
    console.log('Error check:', errors);

    console.log('\nRetake complete!');
    await browser.close();
})();
