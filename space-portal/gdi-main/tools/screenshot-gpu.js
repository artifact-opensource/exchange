const puppeteer = require('puppeteer');

const OUT = '/home/adam/workspace/enterprise/projects/gdi/screenshots';

(async () => {
    const browser = await puppeteer.launch({
        headless: false,  // Real browser, real GPU
        executablePath: '/usr/bin/chromium',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--window-size=1920,1080',
            '--disable-dev-shm-usage',
            '--start-maximized',
        ],
        env: {
            ...process.env,
            DISPLAY: ':0',
        },
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('Loading GDI on display :0 with real GPU...');
    await page.goto('http://localhost:8600', { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for Cesium
    await page.waitForFunction(
        () => document.body.innerText.includes('SYSTEM ONLINE') || document.querySelector('.cesium-widget canvas'),
        { timeout: 30000 }
    );
    console.log('Cesium loaded. Waiting 25s for high-res imagery tiles...');
    await new Promise(r => setTimeout(r, 25000));

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

    // 1. Globe overview
    console.log('Shot 1: Globe overview');
    await page.screenshot({ path: `${OUT}/g01-globe.png` });

    // 2. South Asia
    await fly(68, 28, 5000000);
    console.log('Shot 2: South Asia');
    await page.screenshot({ path: `${OUT}/g02-south-asia.png` });

    // 3. Pakistan
    await fly(69.5, 30.5, 2000000);
    console.log('Shot 3: Pakistan');
    await page.screenshot({ path: `${OUT}/g03-pakistan.png` });

    // 4. Islamabad metro (150km)
    await fly(73.05, 33.69, 150000, 0, -90, 15000);
    console.log('Shot 4: Islamabad region');
    await page.screenshot({ path: `${OUT}/g04-islamabad-region.png` });

    // 5. Islamabad city (40km)
    await fly(73.04, 33.72, 40000, 0, -90, 15000);
    console.log('Shot 5: Islamabad city');
    await page.screenshot({ path: `${OUT}/g05-islamabad-city.png` });

    // 6. Islamabad close (15km) — should show roads with real GPU tiles
    await fly(73.04, 33.71, 15000, 0, -90, 15000);
    console.log('Shot 6: Islamabad close');
    await page.screenshot({ path: `${OUT}/g06-islamabad-close.png` });

    // 7. Street level (5km)
    await fly(73.047, 33.710, 5000, 0, -90, 15000);
    console.log('Shot 7: Street level');
    await page.screenshot({ path: `${OUT}/g07-street-level.png` });

    // 8. 3D tilted view Pakistan
    await fly(73.0, 33.5, 800000, 45, -30, 12000);
    console.log('Shot 8: Pakistan 3D');
    await page.screenshot({ path: `${OUT}/g08-pakistan-3d.png` });

    // 9. Europe
    await fly(15, 50, 6000000);
    console.log('Shot 9: Europe');
    await page.screenshot({ path: `${OUT}/g09-europe.png` });

    // 10. Middle East
    await fly(45, 28, 4000000);
    console.log('Shot 10: Middle East');
    await page.screenshot({ path: `${OUT}/g10-middle-east.png` });

    // 11. Americas
    await fly(-95, 38, 8000000);
    console.log('Shot 11: Americas');
    await page.screenshot({ path: `${OUT}/g11-americas.png` });

    // 12. East Asia
    await fly(120, 35, 6000000);
    console.log('Shot 12: East Asia');
    await page.screenshot({ path: `${OUT}/g12-east-asia.png` });

    // Now visual filters — fly back to Islamabad city for these
    await fly(73.04, 33.72, 40000, 0, -90, 10000);

    // 13. CRT filter
    console.log('Shot 13: CRT filter');
    await page.evaluate(() => {
        const btns = document.querySelectorAll('button');
        for (const b of btns) {
            if (b.textContent.trim().includes('CRT')) { b.click(); break; }
        }
    });
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: `${OUT}/g13-crt.png` });

    // 14. Night Vision
    console.log('Shot 14: Night Vision');
    await page.evaluate(() => {
        const btns = document.querySelectorAll('button');
        for (const b of btns) {
            if (b.textContent.trim().includes('NIGHT')) { b.click(); break; }
        }
    });
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: `${OUT}/g14-nvg.png` });

    // 15. FLIR Thermal
    console.log('Shot 15: FLIR Thermal');
    await page.evaluate(() => {
        const btns = document.querySelectorAll('button');
        for (const b of btns) {
            if (b.textContent.trim().includes('FLIR') || b.textContent.trim().includes('THERMAL')) { b.click(); break; }
        }
    });
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: `${OUT}/g15-flir.png` });

    // 16. Back to normal — dramatic globe shot from different angle
    await page.evaluate(() => {
        const btns = document.querySelectorAll('button');
        for (const b of btns) {
            if (b.textContent.trim().includes('NORMAL')) { b.click(); break; }
        }
    });
    await fly(40, 20, 12000000, 30, -80, 10000);
    console.log('Shot 16: Globe dramatic angle');
    await page.screenshot({ path: `${OUT}/g16-globe-dramatic.png` });

    console.log('\nAll 16 shots done!');
    await browser.close();
})();
