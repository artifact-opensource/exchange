const puppeteer = require('puppeteer');
const path = require('path');

const OUT = '/home/adam/workspace/enterprise/projects/gdi/screenshots';

(async () => {
    const browser = await puppeteer.launch({
        headless: 'new',
        executablePath: '/usr/bin/chromium',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--use-gl=angle',
            '--use-angle=swiftshader',
            '--window-size=1920,1080',
            '--disable-dev-shm-usage',
            '--user-data-dir=/home/adam/.cache/chromium-gdi2',
        ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('1. Loading GDI...');
    await page.goto('http://localhost:8600', { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for the "SYSTEM ONLINE" text to appear (signals Cesium initialized)
    await page.waitForFunction(
        () => document.body.innerText.includes('SYSTEM ONLINE') || document.querySelector('.cesium-widget canvas'),
        { timeout: 30000 }
    );
    console.log('   Cesium widget found');

    // Give it 15 seconds for imagery tiles to load
    console.log('   Waiting for globe imagery...');
    await new Promise(r => setTimeout(r, 15000));

    // Shot 1 — Default globe view (should show Earth from space)
    console.log('2. Screenshot: Globe overview');
    await page.screenshot({ path: `${OUT}/fresh-01-globe-overview.png` });

    // Helper to fly camera
    const flyTo = async (lon, lat, alt, heading = 0, pitch = -90, label = '') => {
        console.log(`   Flying to ${label} (${lat}, ${lon}, ${alt}m)...`);
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
        // Wait for tiles to stream in
        await new Promise(r => setTimeout(r, 8000));
    };

    // Shot 2 — South/Central Asia theater
    await flyTo(68, 28, 5000000, 0, -90, 'South Asia');
    console.log('3. Screenshot: South Asia theater');
    await page.screenshot({ path: `${OUT}/fresh-02-south-asia.png` });

    // Shot 3 — Pakistan
    await flyTo(69.5, 30.5, 2000000, 0, -90, 'Pakistan');
    console.log('4. Screenshot: Pakistan');
    await page.screenshot({ path: `${OUT}/fresh-03-pakistan.png` });

    // Shot 4 — Islamabad region (150km)
    await flyTo(73.05, 33.69, 150000, 0, -90, 'Islamabad region');
    console.log('5. Screenshot: Islamabad region');
    await page.screenshot({ path: `${OUT}/fresh-04-islamabad-region.png` });

    // Shot 5 — Islamabad city (30km)
    await flyTo(73.04, 33.72, 30000, 0, -90, 'Islamabad city');
    console.log('6. Screenshot: Islamabad city');
    await page.screenshot({ path: `${OUT}/fresh-05-islamabad-city.png` });

    // Shot 6 — Street level Blue Area (5km)
    await flyTo(73.047, 33.710, 5000, 0, -90, 'Blue Area street');
    console.log('7. Screenshot: Street level');
    await page.screenshot({ path: `${OUT}/fresh-06-street-level.png` });

    // Shot 7 — 3D tilted view of Islamabad
    await flyTo(73.04, 33.70, 3000, 30, -25, 'Islamabad 3D');
    console.log('8. Screenshot: 3D tilted');
    await page.screenshot({ path: `${OUT}/fresh-07-3d-tilted.png` });

    // Shot 8 — Enable CRT filter
    console.log('9. Enabling CRT filter...');
    await page.evaluate(() => {
        const btns = document.querySelectorAll('.filter-btn, button');
        for (const b of btns) {
            if (b.textContent.includes('CRT')) { b.click(); break; }
        }
    });
    await flyTo(73.04, 33.72, 30000, 0, -90, 'CRT mode');
    await page.screenshot({ path: `${OUT}/fresh-08-crt.png` });

    // Shot 9 — NVG filter
    console.log('10. Enabling NVG filter...');
    await page.evaluate(() => {
        const btns = document.querySelectorAll('.filter-btn, button');
        for (const b of btns) {
            if (b.textContent.includes('NIGHT') || b.textContent.includes('NVG')) { b.click(); break; }
        }
    });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: `${OUT}/fresh-09-nvg.png` });

    // Shot 10 — FLIR filter
    console.log('11. Enabling FLIR filter...');
    await page.evaluate(() => {
        const btns = document.querySelectorAll('.filter-btn, button');
        for (const b of btns) {
            if (b.textContent.includes('FLIR') || b.textContent.includes('THERMAL')) { b.click(); break; }
        }
    });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: `${OUT}/fresh-10-flir.png` });

    // Shot 11 — Back to normal, Middle East theater
    console.log('12. Middle East theater...');
    await page.evaluate(() => {
        const btns = document.querySelectorAll('.filter-btn, button');
        for (const b of btns) {
            if (b.textContent.includes('NORMAL')) { b.click(); break; }
        }
    });
    await flyTo(45, 30, 4000000, 0, -90, 'Middle East');
    await page.screenshot({ path: `${OUT}/fresh-11-middle-east.png` });

    // Shot 12 — Full globe rotated to show Europe
    await flyTo(15, 48, 8000000, 0, -90, 'Europe');
    console.log('13. Screenshot: Europe');
    await page.screenshot({ path: `${OUT}/fresh-12-europe.png` });

    console.log('\nDone! All screenshots saved.');
    await browser.close();
})();
