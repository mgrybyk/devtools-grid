import puppeteer from 'puppeteer-core'
import { client as WebSocketClient, connection as WSConnection } from 'websocket'
import { launch as launchChromeBrowser } from 'chrome-launcher'
import { forwardMessage } from './wsMessage'
import { logAndClose } from './wsError'

export const nodeCdpConnections: Record<string, WSConnection> = {}
export const serverCdpConnections: Record<string, WSConnection> = {}

export async function spawnBrowser(chromeFlags: Array<string>) {
    const chrome = await launchChromeBrowser({
        ignoreDefaultFlags: true,
        chromeFlags,
    })

    const bHttp = await puppeteer.connect({
        browserURL: `http://localhost:${chrome.port}`,
        ignoreHTTPSErrors: true,
    })

    let success: (r?: unknown) => void, fail: (r?: unknown) => void
    const p = new Promise((resolve, reject) => {
        success = resolve
        fail = reject
    })

    const client = new WebSocketClient()

    client.once('connectFailed', function (error) {
        client.removeAllListeners()
        console.log('Client Connect Error: ' + error.toString())
        bHttp.close()
        fail(new Error('Failed to connect to Chrome'))
    })

    client.once('connect', function (connection: WSConnection) {
        client.removeAllListeners()
        nodeCdpConnections[uuid] = connection

        const waitServer = setTimeout(() => {
            if (!serverCdpConnections[uuid]) {
                connection.close()
            }
        }, 10000)

        console.log('Client Connected to Chrome')

        connection.once('error', function (error) {
            logAndClose(connection, error, 'CDP')
        })

        connection.once('close', function (reasonCode, description) {
            connection.removeAllListeners()
            serverCdpConnections[uuid]?.close()
            delete nodeCdpConnections[uuid]
            console.log('Client Connection Closed', reasonCode, description)
            clearTimeout(waitServer)
            bHttp.close()
        })

        connection.on('message', function (message) {
            forwardMessage(serverCdpConnections[uuid], message)
        })

        success()
    })

    client.connect(bHttp.wsEndpoint())
    const uuid = bHttp.wsEndpoint().substr(bHttp.wsEndpoint().lastIndexOf('/') + 1)

    await p

    console.log(bHttp.wsEndpoint())

    return uuid
}
