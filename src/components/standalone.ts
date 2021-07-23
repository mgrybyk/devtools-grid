import { server as WebSocketServer, request as WSRequest } from 'websocket'
import type { Server } from 'http'
import { clientConnections, serverConnections } from './node-connection'

export const startStandaloneWSServer = (httpServer: Server) => {
    const wsServer = new WebSocketServer({
        httpServer,
        autoAcceptConnections: false,
        useNativeKeepalive: true,
    })

    wsServer.on('request', function (request: WSRequest) {
        const uuid = request.resourceURL.path?.substr(request.resourceURL.path.lastIndexOf('/') + 1)
        console.log('Server: new incoming connection', uuid)

        if (!uuid || uuid.length !== 36 || uuid.split('-').length !== 5 || !clientConnections[uuid]) {
            request.reject(500, 'Invalid uuid provided')
            return
        }

        const connection = request.accept(undefined, request.origin)
        serverConnections[uuid] = connection

        connection.on('message', function (message) {
            if (message.type === 'utf8') {
                clientConnections[uuid].sendUTF(message.utf8Data!)
            } else if (message.type === 'binary') {
                // seems like it never happens
                clientConnections[uuid].sendBytes(message.binaryData!)
            }
        })

        connection.once('error', function (error) {
            if (error.code !== 'ERR_STREAM_WRITE_AFTER_END') {
                console.warn('Server Connection Error: ' + error.toString())
            }
            connection.close()
        })

        connection.once('close', function (reasonCode, description) {
            clientConnections[uuid]?.close()
            connection.removeAllListeners()
            delete serverConnections[uuid]
            console.log('Server connection close', reasonCode, description)
        })
    })
}
