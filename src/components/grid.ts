import type { request as WSRequest } from 'websocket'
import type { Server } from 'http'
import { nodesPool } from './grid-connection'
import { nodeCdpConnections, serverCdpConnections } from './node-connection'
import { createWsServer } from './wsServer'
import { onCdpRequest } from './cdp-connection'
import { forwardMessage } from './wsMessage'
import { logAndClose } from './wsError'

export const startGridWSServer = (httpServer: Server) => {
    const wsServer = createWsServer(httpServer)

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
                logAndClose(connection, error, 'Grid Node')
            })

            connection.once('close', function (reasonCode, description) {
                nodesPool[id]?.pools.forEach((c) => c.close())
                connection.removeAllListeners()
                delete nodesPool[id]
                console.log('Grid node close', reasonCode, description)
            })

            return
        }

        // data node (cdp)
        if (request.resourceURL.path && request.resourceURL.path.includes('/grid/data/node')) {
            const arr = request.resourceURL.path.split('/')
            const id = arr[arr.length - 2]
            const uuid = arr[arr.length - 1]
            console.log('Grid: new data connection', id, uuid)

            const connection = request.accept(undefined, request.origin)
            nodeCdpConnections[uuid] = connection

            nodesPool[id].pools.push(connection)

            connection.once('error', function (error) {
                logAndClose(connection, error, 'Grid data client')
            })

            connection.once('close', function (reasonCode, description) {
                connection.removeAllListeners()
                serverCdpConnections[uuid]?.close()
                delete nodeCdpConnections[uuid]

                delete nodesPool[id].pools[nodesPool[id].pools.indexOf(connection)]
                nodesPool[id].slots.available = nodesPool[id].slots.available + 1

                console.log('Grid data Client Connection Closed', reasonCode, description)
            })

            connection.on('message', function (message) {
                forwardMessage(serverCdpConnections[uuid], message)
            })

            return
        }

        // connection from webdriverio
        onCdpRequest(request)
    })

    return wsServer
}
