import { app } from './app'
import { startGridWSServer } from './components/grid'
import { startStandaloneWSServer } from './components/standalone'
import config, { MODES } from './config/config'
import { logger } from './config/logger'

const server = app.listen(config.port, config.serverHost, () => {
    logger.info(`Listening to port ${config.serverHost}:${config.port}`)
})

if (config.mode === MODES.GRID) {
    logger.info('Running in grid mode')
    startGridWSServer(server)
}

if (config.mode === MODES.STANDALONE) {
    logger.info('Running in standalone mode')
    startStandaloneWSServer(server)
}

const unexpectedErrorHandler = (error: Error) => {
    logger.error(error)
}

process.on('uncaughtException', unexpectedErrorHandler)
process.on('unhandledRejection', unexpectedErrorHandler)

process.on('SIGTERM', () => {
    logger.info('SIGTERM received')
    if (server) {
        server.close()
    }
})
