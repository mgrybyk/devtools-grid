import type { Server } from 'http'
import { onCdpRequest } from './cdp-connection'
import { createWsServer } from './wsServer'

export const startStandaloneWSServer = (httpServer: Server) => {
    const wsServer = createWsServer(httpServer)

    wsServer.on('request', onCdpRequest)
}
