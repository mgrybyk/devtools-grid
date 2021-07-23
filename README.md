# devtools-grid

> Run tests in parallel on multiple remote machines

## Installation

Clone repo and 

1. `npm install`
2. `npm run build`

**Important**: temporary: apply `wdio-patch`

## Usage

### Grid + node

- grid `PORT=1347 node lib grid`
- node `node lib node ws://localhost:1347`

### Standalone

`PORT=1347 node lib standalone`

## Browser Support

Firefox is not supported at the moment.  
TODO: Pass firefox options from to firefox launcher

## Further plans

- fixes and stability improvements
- install devtools-grid as binary (ex with `npm -i -g`) similar to selenium-standalone
- add node configs: name, pools, etc
- add grid support to WebdriverIO
- add grid UI to monitor and managed nodes
- file upload support (a way to upload a file to the machine where chrome is running)
- file download support (a way to download a file from the machine where chrome is running)
- add [screencast](https://docs.browserless.io/blog/2020/06/09/screencast.html)
- transfer repo to WebdriverIO org
