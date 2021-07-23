import type { Server } from 'http'
import { server as WebSocketServer } from 'websocket'

export const createWsServer = (httpServer: Server) => {
    return new WebSocketServer({
        httpServer,
        autoAcceptConnections: false,
        useNativeKeepalive: true,
    })
}
