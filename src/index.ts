/* eslint-disable @typescript-eslint/no-var-requires */
const { default: config } = require('./config/config')
const { connectToGrid } = require('./components/gridNode')
const { logger } = require('./config/logger')

if (config.mode === 'NODE') {
    logger.info('Running in grid-node mode')
    connectToGrid(process.argv[3])
} else {
    require('./server')
}
