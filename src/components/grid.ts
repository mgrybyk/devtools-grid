import { server as WebSocketServer, connection as WSConnection, request as WSRequest } from 'websocket'
import type { Server } from 'http'
import { nodesPool } from './grid-connection'

// const clients: Record<string, WebSocketClient> = {}
const clientConnections: Record<string, WSConnection> = {}
const gridConnections: Record<string, WSConnection> = {}

export const startGridWSServer = (httpServer: Server) => {
    const wsServer = new WebSocketServer({
        httpServer,
        autoAcceptConnections: false,
        useNativeKeepalive: true,
    })

    wsServer.on('request', function (request: WSRequest) {
        // server
        if (request.resourceURL.path && request.resourceURL.path.includes('/grid/service/node')) {
            const id = request.resourceURL.path.substr(request.resourceURL.path.lastIndexOf('/') + 1)
            console.log('Grid: new server connection', id)
            const connection = request.accept(undefined, request.origin)

            connection.once('message', function (message) {
                const { slots, info } = JSON.parse(message.utf8Data!)
                nodesPool[id] = { connection, slots: { available: slots }, info, pools: [] }
            })

            connection.once('error', function (error) {
                console.log('Grid node error', error)
                connection.close()
            })

            connection.once('close', function (reasonCode, description) {
                nodesPool[id]?.pools.forEach((c) => c.close())
                connection.removeAllListeners()
                delete nodesPool[id]
                console.log('Grid node close', reasonCode, description)
            })

            return
        }

        // data node
        if (request.resourceURL.path && request.resourceURL.path.includes('/grid/data/node')) {
            const arr = request.resourceURL.path.split('/')
            const id = arr[arr.length - 2]
            const uuid = arr[arr.length - 1]
            console.log('Grid: new data connection', id, uuid)

            const connection = request.accept(undefined, request.origin)
            clientConnections[uuid] = connection

            nodesPool[id].pools.push(connection)

            connection.once('error', function (error) {
                if (error.code !== 'ECONNRESET') {
                    console.log('Grid data Client Connection Error: ' + error.toString())
                }
                connection.close()
            })

            connection.once('close', function (reasonCode, description) {
                connection.removeAllListeners()
                gridConnections[uuid]?.close()
                delete clientConnections[uuid]

                delete nodesPool[id].pools[nodesPool[id].pools.indexOf(connection)]
                nodesPool[id].slots.available = nodesPool[id].slots.available + 1
                console.log(Object.values(nodesPool))

                console.log('Grid data Client Connection Closed', reasonCode, description)
            })

            connection.on('message', function (message) {
                if (message.type === 'utf8') {
                    gridConnections[uuid].sendUTF(message.utf8Data!)
                } else if (message.type === 'binary') {
                    // seems like it never happens
                    gridConnections[uuid].sendBytes(message.binaryData!)
                }
            })

            return
        }

        // connection from webdriverio
        const uuid = request.resourceURL.path?.substr(request.resourceURL.path.lastIndexOf('/') + 1)
        console.log('Grid: new incoming connection', uuid)

        if (!uuid || uuid.length !== 36 || uuid.split('-').length !== 5 || !clientConnections[uuid]) {
            request.reject(500, 'Invalid uuid provided')
            return
        }

        const connection = request.accept(undefined, request.origin)
        gridConnections[uuid] = connection

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
                console.warn('Grid Connection Error: ' + error.toString())
            }
            connection.close()
        })

        connection.once('close', function (reasonCode, description) {
            clientConnections[uuid]?.close()
            connection.removeAllListeners()
            delete gridConnections[uuid]
            console.log('Grid connection close', reasonCode, description)
        })
    })

    return wsServer
}
