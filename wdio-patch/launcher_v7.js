"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chrome_launcher_1 = require("chrome-launcher");
const puppeteer_core_1 = __importDefault(require("puppeteer-core"));
const logger_1 = __importDefault(require("@wdio/logger"));
const puppeteer_1 = require("query-selector-shadow-dom/plugins/puppeteer");
const finder_1 = __importDefault(require("./finder"));
const utils_1 = require("./utils");
const constants_1 = require("./constants");
const log = logger_1.default('devtools');
const DEVICE_NAMES = Object.values(puppeteer_core_1.default.devices).map((device) => device.name);
const getChromeFlags = (capabilities) => {
    const devtoolsOptions = capabilities['wdio:devtoolsOptions'] || {};
    const chromeOptions = capabilities[constants_1.VENDOR_PREFIX.chrome] || {};
    const mobileEmulation = chromeOptions.mobileEmulation || {};
    const deviceMetrics = mobileEmulation.deviceMetrics || {};
    let headless = chromeOptions.headless || devtoolsOptions.headless;
    let ignoreDefaultArgs = capabilities.ignoreDefaultArgs || devtoolsOptions.ignoreDefaultArgs;
    const defaultFlags = Array.isArray(ignoreDefaultArgs) ? constants_1.DEFAULT_FLAGS.filter(flag => !ignoreDefaultArgs.includes(flag)) : (!ignoreDefaultArgs) ? constants_1.DEFAULT_FLAGS : [];
    const chromeFlags = [
        ...defaultFlags,
        ...[
            `--window-position=${constants_1.DEFAULT_X_POSITION},${constants_1.DEFAULT_Y_POSITION}`,
            `--window-size=${constants_1.DEFAULT_WIDTH},${constants_1.DEFAULT_HEIGHT}`
        ],
        ...(headless ? [
            '--headless',
            '--no-sandbox'
        ] : []),
        ...(chromeOptions.args || [])
    ];
    if (typeof deviceMetrics.pixelRatio === 'number') {
        chromeFlags.push(`--device-scale-factor=${deviceMetrics.pixelRatio}`);
    }
    if (typeof mobileEmulation.userAgent === 'string') {
        chromeFlags.push(`--user-agent=${mobileEmulation.userAgent}`);
    }
    return chromeFlags
}
/**
 * launches Chrome and returns a Puppeteer browser instance
 * @param  {object} capabilities  session capabilities
 * @return {object}               puppeteer browser instance
 */
async function launchChrome(capabilities) {
    const chromeOptions = capabilities[constants_1.VENDOR_PREFIX.chrome] || {};
    const mobileEmulation = chromeOptions.mobileEmulation || {};
    const devtoolsOptions = capabilities['wdio:devtoolsOptions'] || {};
    /**
     * `ignoreDefaultArgs` and `headless` are currently expected to be part of the capabilities
     * but we should move them into a custom capability object, e.g. `wdio:devtoolsOptions`.
     * This should be cleaned up for v7 release
     * ToDo(Christian): v7 cleanup
     */


    if (typeof mobileEmulation.deviceName === 'string') {
        const deviceProperties = Object.values(puppeteer_core_1.default.devices).find(device => device.name === mobileEmulation.deviceName);
        if (!deviceProperties) {
            throw new Error(`Unknown device name "${mobileEmulation.deviceName}", available: ${DEVICE_NAMES.join(', ')}`);
        }
        mobileEmulation.userAgent = deviceProperties.userAgent;
        mobileEmulation.deviceMetrics = {
            width: deviceProperties.viewport.width,
            height: deviceProperties.viewport.height,
            pixelRatio: deviceProperties.viewport.deviceScaleFactor
        };
    }
    const deviceMetrics = mobileEmulation.deviceMetrics || {};
    const chromeFlags = getChromeFlags(capabilities);
    log.info(`Launch Google Chrome with flags: ${chromeFlags.join(' ')}`);
    const chrome = await chrome_launcher_1.launch({
        chromePath: chromeOptions.binary,
        ignoreDefaultFlags: true,
        chromeFlags,
        ...(devtoolsOptions.customPort ? { port: devtoolsOptions.customPort } : {})
    });
    log.info(`Connect Puppeteer with browser on port ${chrome.port}`);
    const browser = await puppeteer_core_1.default.connect({
        ...chromeOptions,
        defaultViewport: null,
        browserURL: `http://localhost:${chrome.port}`
    }); // casting from @types/puppeteer to built in type
    /**
     * when using Chrome Launcher we have to close a tab as Puppeteer
     * creates automatically a new one
     */
    const pages = await utils_1.getPages(browser);
    for (const page of pages.slice(0, -1)) {
        if (page.url() === 'about:blank') {
            await page.close();
        }
    }
    if (deviceMetrics.width && deviceMetrics.height) {
        await pages[0].setViewport(deviceMetrics);
    }
    return browser;
}
function launchBrowser(capabilities, browserType) {
    var _a;
    const product = browserType === constants_1.BROWSER_TYPE.firefox ? constants_1.BROWSER_TYPE.firefox : constants_1.BROWSER_TYPE.chrome;
    const vendorCapKey = constants_1.VENDOR_PREFIX[browserType];
    const devtoolsOptions = capabilities['wdio:devtoolsOptions'];
    /**
     * `ignoreDefaultArgs` and `headless` are currently expected to be part of the capabilities
     * but we should move them into a custom capability object, e.g. `wdio:devtoolsOptions`.
     * This should be cleaned up for v7 release
     * ToDo(Christian): v7 cleanup
     */
    let ignoreDefaultArgs = capabilities.ignoreDefaultArgs;
    let headless = capabilities.headless;
    if (devtoolsOptions) {
        ignoreDefaultArgs = devtoolsOptions.ignoreDefaultArgs;
        headless = devtoolsOptions.headless;
    }
    if (!capabilities[vendorCapKey]) {
        capabilities[vendorCapKey] = {};
    }
    const browserFinderMethod = finder_1.default(browserType, process.platform);
    const executablePath = (((_a = capabilities[vendorCapKey]) === null || _a === void 0 ? void 0 : _a.binary) ||
        browserFinderMethod()[0]);
    const puppeteerOptions = Object.assign({
        product,
        executablePath,
        ignoreDefaultArgs,
        headless: Boolean(headless),
        defaultViewport: {
            width: constants_1.DEFAULT_WIDTH,
            height: constants_1.DEFAULT_HEIGHT
        }
    }, capabilities[vendorCapKey] || {}, devtoolsOptions || {});
    if (!executablePath) {
        throw new Error('Couldn\'t find executable for browser');
    }
    else if (browserType === constants_1.BROWSER_TYPE.firefox &&
        executablePath !== 'firefox' &&
        !executablePath.toLowerCase().includes(constants_1.CHANNEL_FIREFOX_NIGHTLY) &&
        !executablePath.toLowerCase().includes(constants_1.CHANNEL_FIREFOX_TRUNK)) {
        throw new Error(constants_1.BROWSER_ERROR_MESSAGES.firefoxNightly);
    }
    log.info(`Launch ${executablePath} with config: ${JSON.stringify(puppeteerOptions)}`);
    return puppeteer_core_1.default.launch(puppeteerOptions);
}
function connectBrowser(connectionUrl, capabilities) {
    const connectionProp = connectionUrl.startsWith('http') ? 'browserURL' : 'browserWSEndpoint';
    const devtoolsOptions = capabilities['wdio:devtoolsOptions'];
    const options = {
        defaultViewport: null, // TODO: missing defaultViewport. Is it regression in v7?
        [connectionProp]: connectionUrl,
        ...devtoolsOptions
    };
    return puppeteer_core_1.default.connect(options);
}
async function launch(capabilities) {
    var _a;
    puppeteer_core_1.default.unregisterCustomQueryHandler('shadow');
    puppeteer_core_1.default.registerCustomQueryHandler('shadow', puppeteer_1.QueryHandler);
    const browserName = (_a = capabilities.browserName) === null || _a === void 0 ? void 0 : _a.toLowerCase();
    /**
     * check if capabilities already contains connection details and connect
     * to that rather than starting a new browser
     */
    const browserOptions = capabilities['goog:chromeOptions'] || capabilities['ms:edgeOptions'];
    const devtoolsOptions = capabilities['wdio:devtoolsOptions'] || {};
    const { gridHost, gridPort, gridSecure } = browserOptions
    if (gridHost && gridPort) {
        const got = require('got');
        const chromeFlags = getChromeFlags(capabilities);
        const { body } = await got.post(`http${gridSecure ? 's' : ''}://${gridHost}:${gridPort}/v1/grid`, {
            json: { chromeFlags },
            responseType: 'json'
        });
        devtoolsOptions.browserWSEndpoint = `ws${gridSecure ? 's' : ''}://${gridHost}:${gridPort}/${body.uuid}`
    }
    const connectionUrl = (((browserOptions === null || browserOptions === void 0 ? void 0 : browserOptions.debuggerAddress) && `http://${browserOptions === null || browserOptions === void 0 ? void 0 : browserOptions.debuggerAddress}`) ||
        devtoolsOptions.browserURL ||
        devtoolsOptions.browserWSEndpoint);
    if (connectionUrl) {
        return connectBrowser(connectionUrl, capabilities);
    }
    if (browserName && constants_1.CHROME_NAMES.includes(browserName)) {
        return launchChrome(capabilities);
    }
    if (browserName && constants_1.FIREFOX_NAMES.includes(browserName)) {
        return launchBrowser(capabilities, constants_1.BROWSER_TYPE.firefox);
    }
    /* istanbul ignore next */
    if (browserName && constants_1.EDGE_NAMES.includes(browserName)) {
        return launchBrowser(capabilities, constants_1.BROWSER_TYPE.edge);
    }
    throw new Error(`Couldn't identify browserName "${browserName}"`);
}
exports.default = launch;
