```js
const { chromium } = require('playwright');
const got = require('got');

const gridSecure = false;
const gridHost = '127.0.0.1'
const gridPort = 1347
const chromeFlags = ['--headless'];

;(async () => {
    const { body } = await got.post(`http${gridSecure ? 's' : ''}://${gridHost}:${gridPort}/devtools/grid`, {
        json: { chromeFlags },
        responseType: 'json'
    });
    const browserWSEndpoint = `ws${gridSecure ? 's' : ''}://${gridHost}:${gridPort}/devtools/${body.uuid}`

    const browser = await chromium.connectOverCDP({ endpointURL: browserWSEndpoint });

    const page = await browser.newPage();
    await page.goto('https://webdriver.io');

    await browser.close();
})();
```
