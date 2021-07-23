# WebdriverIO devtools-grid support

There should be a way to pass grid's host, port and protocol to WebdriverIO.

As for now I simply monkey-patched `devtools/build/launcher.js`

- v6 - for WebdriverIO v6
- v7 - for WebdriverIO v7 (v7 requires way more work)

The `capabilities` should look like this to use the patched launcher.js version:
```
  automationProtocol: 'devtools',
  capabilities: [
    {
      browserName: 'chrome',
      'goog:chromeOptions': {
        gridHost: '127.0.0.1',
        gridPort: 1347,
        gridSecure: false, // false by default
      },
    },
  ],
```
