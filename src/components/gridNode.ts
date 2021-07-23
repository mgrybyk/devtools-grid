import { client as WebSocketClient, connection as WSConnection } from 'websocket'
import { logger } from '../config/logger'
import { nodeCdpConnections, serverCdpConnections, spawnBrowser } from './node-connection'
import { logAndClose } from './wsError'
import { forwardMessage } from './wsMessage'

let baseUrl: string
const NODE_ID = `${Math.random()}`.replace('.', '')

const gridClient = new WebSocketClient()

gridClient.once('connectFailed', function (error) {
    gridClient.removeAllListeners()
    console.log('Grid client Connect Error: ' + error.toString())
})

gridClient.once('connect', function (serviceConnection: WSConnection) {
    console.log('connected!')
    gridClient.removeAllListeners()
    serviceConnection.once('error', (error) => {
        logAndClose(serviceConnection, error, 'Service')
    })

    serviceConnection.once('close', () => {
        logger.log('serviceConnection closed')
        serviceConnection.removeAllListeners()
    })

    serviceConnection.on('message', async (message) => {
        const { id, chromeFlags } = JSON.parse(message.utf8Data!)

        let uuid: string
        try {
            uuid = await spawnBrowser(chromeFlags)
        } catch (err) {
            console.error('failed to spawn browser')
            return serviceConnection.sendUTF(JSON.stringify({ id, error: true }))
        }

        spawnDataConnection(serviceConnection, { id, uuid })
    })

    serviceConnection.sendUTF(JSON.stringify({ slots: 2, info: {} }))
})

const spawnDataConnection = (serviceConnection: WSConnection, { id, uuid }: { id: string; uuid: string }) => {
    const gridDataClient = new WebSocketClient()

    gridDataClient.once('connectFailed', function (error) {
        gridDataClient.removeAllListeners()
        console.log('Grid data client Connect Error: ' + error.toString())
        serviceConnection.sendUTF(JSON.stringify({ id, error: true }))
    })

    gridDataClient.once('connect', function (dataConnection: WSConnection) {
        gridDataClient.removeAllListeners()
        serverCdpConnections[uuid] = dataConnection

        dataConnection.on('message', function (message) {
            forwardMessage(nodeCdpConnections[uuid], message)
        })

        serviceConnection.once('close', () => {
            dataConnection.close()
        })
        dataConnection.once('error', function (error) {
            logAndClose(dataConnection, error, 'Data')
        })

        dataConnection.once('close', function (reasonCode, description) {
            nodeCdpConnections[uuid]?.close()
            dataConnection.removeAllListeners()
            delete serverCdpConnections[uuid]
            console.log('Server connection close', reasonCode, description)
        })

        serviceConnection.sendUTF(JSON.stringify({ id, uuid }))
    })

    gridDataClient.connect(`${baseUrl}/grid/data/node/${NODE_ID}/${uuid}`)
}

export const connectToGrid = (_baseUrl: string) => {
    if (!_baseUrl) {
        console.log('Grid url was not provided, ex: ws://localhost:1347/devtools')
        process.exit(1)
    }
    baseUrl = _baseUrl

    console.log('connecting to grid', baseUrl)
    gridClient.connect(`${baseUrl}/grid/service/node/${NODE_ID}`)
}
