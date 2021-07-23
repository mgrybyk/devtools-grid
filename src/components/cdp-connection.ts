import { request as WSRequest } from 'websocket'
import { nodeCdpConnections, serverCdpConnections } from './node-connection'
import { logAndClose } from './wsError'
import { forwardMessage } from './wsMessage'

/**
 * handle CDP connection from puppeteer, playwright, webdriverio, etc
 */
export const onCdpRequest = (request: WSRequest) => {
    const uuid = request.resourceURL.path?.substr(request.resourceURL.path.lastIndexOf('/') + 1)
    console.log('Grid: new incoming connection', uuid)

    if (!uuid || uuid.length !== 36 || uuid.split('-').length !== 5 || !nodeCdpConnections[uuid]) {
        request.reject(500, 'Invalid uuid provided')
        return
    }

    const connection = request.accept(undefined, request.origin)
    serverCdpConnections[uuid] = connection

    connection.on('message', function (message) {
        forwardMessage(nodeCdpConnections[uuid], message)
    })

    connection.once('error', function (error) {
        logAndClose(connection, error, 'Grid')
    })

    connection.once('close', function (reasonCode, description) {
        nodeCdpConnections[uuid]?.close()
        connection.removeAllListeners()
        delete serverCdpConnections[uuid]
        console.log('Grid connection close', reasonCode, description)
    })
}
