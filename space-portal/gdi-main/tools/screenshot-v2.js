const puppeteer = require('puppeteer');

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
            '--user-data-dir=/home/adam/.cache/chromium-gdi3',
        ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('Loading GDI...');
    await page.goto('http://localhost:8600', { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForFunction(
        () => document.body.innerText.includes('SYSTEM ONLINE') || document.querySelector('.cesium-widget canvas'),
        { timeout: 30000 }
    );

    // Wait generously for initial globe imagery
    console.log('Waiting 20s for globe imagery...');
    await new Promise(r => setTimeout(r, 20000));

    const fly = async (lon, lat, alt, heading = 0, pitch = -90, wait = 10000) => {
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

    // 1. Globe overview — default camera (already waited 20s)
    console.log('Shot 1: Globe');
    await page.screenshot({ path: `${OUT}/s01-globe.png` });

    // 2. South/Central Asia theater
    await fly(68, 28, 5000000);
    console.log('Shot 2: South Asia');
    await page.screenshot({ path: `${OUT}/s02-south-asia.png` });

    // 3. Pakistan
    await fly(69.5, 30.5, 2000000);
    console.log('Shot 3: Pakistan');
    await page.screenshot({ path: `${OUT}/s03-pakistan.png` });

    // 4. Islamabad metro area (~150km)
    await fly(73.05, 33.69, 150000, 0, -90, 12000);
    console.log('Shot 4: Islamabad region');
    await page.screenshot({ path: `${OUT}/s04-islamabad-region.png` });

    // 5. Islamabad city (~40km)
    await fly(73.04, 33.72, 40000, 0, -90, 12000);
    console.log('Shot 5: Islamabad city');
    await page.screenshot({ path: `${OUT}/s05-islamabad-city.png` });

    // 6. Islamabad close (~15km — should show streets on Bing)
    await fly(73.04, 33.71, 15000, 0, -90, 12000);
    console.log('Shot 6: Islamabad close');
    await page.screenshot({ path: `${OUT}/s06-islamabad-close.png` });

    // 7. Europe/NATO theater
    await fly(15, 50, 6000000, 0, -90, 10000);
    console.log('Shot 7: Europe');
    await page.screenshot({ path: `${OUT}/s07-europe.png` });

    // 8. East Asia / Pacific
    await fly(120, 35, 6000000, 0, -90, 10000);
    console.log('Shot 8: East Asia');
    await page.screenshot({ path: `${OUT}/s08-east-asia.png` });

    // 9. Americas
    await fly(-95, 38, 8000000, 0, -90, 10000);
    console.log('Shot 9: Americas');
    await page.screenshot({ path: `${OUT}/s09-americas.png` });

    // 10. 3D tilted view of Pakistan region (dramatic angle)
    await fly(73.0, 33.5, 800000, 45, -30, 12000);
    console.log('Shot 10: Pakistan 3D tilted');
    await page.screenshot({ path: `${OUT}/s10-pakistan-3d.png` });

    // 11. Middle East theater
    await fly(45, 28, 4000000, 0, -90, 10000);
    console.log('Shot 11: Middle East');
    await page.screenshot({ path: `${OUT}/s11-middle-east.png` });

    // 12. Africa
    await fly(20, 5, 7000000, 0, -90, 10000);
    console.log('Shot 12: Africa');
    await page.screenshot({ path: `${OUT}/s12-africa.png` });

    console.log('\nDone!');
    await browser.close();
})();
