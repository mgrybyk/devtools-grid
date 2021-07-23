import puppeteer from 'puppeteer-core'
import { client as WebSocketClient, connection as WSConnection } from 'websocket'
import { launch as launchChromeBrowser } from 'chrome-launcher'

export const clientConnections: Record<string, WSConnection> = {}
export const serverConnections: Record<string, WSConnection> = {}

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

    let client = new WebSocketClient()

    client.once('connectFailed', function (error) {
        client.removeAllListeners()
        // @ts-ignore
        client = null
        console.log('Client Connect Error: ' + error.toString())
        bHttp.close()
        fail(new Error('Failed to connect to Chrome'))
    })

    client.once('connect', function (connection: WSConnection) {
        client.removeAllListeners()
        clientConnections[uuid] = connection

        const waitServer = setTimeout(() => {
            if (!serverConnections[uuid]) {
                connection.close()
            }
        }, 10000)

        console.log('Client Connected to Chrome')

        connection.once('error', function (error) {
            if (error.code !== 'ECONNRESET') {
                console.log('Client Connection Error: ' + error.toString())
            }
            connection.close()
        })

        connection.once('close', function (reasonCode, description) {
            connection.removeAllListeners()
            serverConnections[uuid]?.close()
            delete clientConnections[uuid]
            console.log('Client Connection Closed', reasonCode, description)
            clearTimeout(waitServer)
            // @ts-ignore
            client = null
            bHttp.close()
        })

        connection.on('message', function (message) {
            if (message.type === 'utf8') {
                serverConnections[uuid].sendUTF(message.utf8Data!)
            } else if (message.type === 'binary') {
                // seems like it never happens
                serverConnections[uuid].sendBytes(message.binaryData!)
            }
        })

        success()
    })

    client.connect(bHttp.wsEndpoint())
    const uuid = bHttp.wsEndpoint().substr(bHttp.wsEndpoint().lastIndexOf('/') + 1)

    await p

    console.log(bHttp.wsEndpoint())

    return uuid
}
