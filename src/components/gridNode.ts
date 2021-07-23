import { client as WebSocketClient, connection as WSConnection } from 'websocket'
import { logger } from '../config/logger'
import { clientConnections, serverConnections, spawnBrowser } from './node-connection'

let baseUrl: string
const NODE_ID = `${Math.random()}`.replace('.', '')

const gridClient = new WebSocketClient()

gridClient.once('connectFailed', function (error) {
    gridClient.removeAllListeners()
    console.log('Grid client Connect Error: ' + error.toString())
})

gridClient.once('connect', function (serviceConnection: WSConnection) {
    gridClient.removeAllListeners()
    serviceConnection.once('error', () => {
        serviceConnection.close()
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

        const gridDataClient = new WebSocketClient()
        gridDataClient.once('connectFailed', function (error) {
            gridDataClient.removeAllListeners()
            console.log('Grid data client Connect Error: ' + error.toString())
            serviceConnection.sendUTF(JSON.stringify({ id, error: true }))
        })

        gridDataClient.once('connect', function (dataConnection: WSConnection) {
            gridDataClient.removeAllListeners()
            serverConnections[uuid] = dataConnection

            dataConnection.on('message', function (message) {
                if (message.type === 'utf8') {
                    clientConnections[uuid].sendUTF(message.utf8Data!)
                } else if (message.type === 'binary') {
                    // seems like it never happens
                    clientConnections[uuid].sendBytes(message.binaryData!)
                }
            })

            serviceConnection.once('close', () => {
                dataConnection.close()
            })
            dataConnection.once('error', function (error) {
                if (error.code !== 'ERR_STREAM_WRITE_AFTER_END') {
                    console.warn('Server Connection Error: ' + error.toString())
                }
                dataConnection.close()
            })

            dataConnection.once('close', function (reasonCode, description) {
                clientConnections[uuid]?.close()
                dataConnection.removeAllListeners()
                delete serverConnections[uuid]
                console.log('Server connection close', reasonCode, description)
            })

            serviceConnection.sendUTF(JSON.stringify({ id, uuid }))
        })

        gridDataClient.connect(`${baseUrl}/grid/data/node/${NODE_ID}/${uuid}`)
    })

    serviceConnection.sendUTF(JSON.stringify({ slots: 2, info: {} }))
})

export const connectToGrid = (_baseUrl: string) => {
    if (!_baseUrl) {
        console.log('Grid url was not provided, ex: ws://localhost:1347')
        process.exit(1)
    }
    baseUrl = _baseUrl

    console.log('connecting to grid', baseUrl)
    gridClient.connect(`${baseUrl}/grid/service/node/${NODE_ID}`)
}
