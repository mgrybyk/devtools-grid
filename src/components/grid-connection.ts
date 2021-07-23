import { connection as WSConnection, IMessage } from 'websocket'
import { logger } from '../config/logger'

export const nodesPool: Record<
    string,
    {
        connection: WSConnection
        slots: { available: number }
        info: Record<string, unknown>
        pools: Array<WSConnection>
    }
> = {}

let pending = 0
let lastPendingId = -1

export async function spawnNodeConnection(chromeFlags: Array<string>) {
    await waitForNodes()
    const availableNodes = getAvailableNodes()

    // availableNodes.sort((a, b) => {})
    const nodeConnection = availableNodes[0]
    nodeConnection[1].slots.available = nodeConnection[1].slots.available - 1
    const id = `${Math.random()}`.replace('.', '')

    let success: (r?: unknown) => void, fail: (r?: unknown) => void
    const p = new Promise((resolve, reject) => {
        success = resolve
        fail = reject
    })

    const waitConnection = setTimeout(() => {
        fail(new Error("Didn't recieve connection information from node in 10s"))
    }, 10000)

    const onMessage = (message: IMessage) => {
        const data = JSON.parse(message.utf8Data!)
        if (id === data.id) {
            // nodesPool.set(connection, { slots, info, pools: [] })
            clearTimeout(waitConnection)
            nodeConnection[1].connection.off('message', onMessage)
            nodeConnection[1].connection.off('close', onClose)
            if (data.error) {
                fail(new Error('Node failed to setup data connection'))
            } else {
                success(data.uuid)
            }
        }
    }
    const onClose = () => {
        clearTimeout(waitConnection)
        fail(new Error('Node went offline'))
    }
    nodeConnection[1].connection.on('message', onMessage)
    nodeConnection[1].connection.once('close', onClose)
    nodeConnection[1].connection.sendUTF(JSON.stringify({ id, chromeFlags }))

    const uuid = (await p) as string
    // nodesConnections[uuid] = nodeConnection[0]

    return uuid
}

const getAvailableNodes = () => Object.entries(nodesPool).filter(([, { slots }]) => slots.available > 0)

const sleep = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms, ms))

const waitForNodes = async () => {
    const availableNodes = getAvailableNodes()
    if (availableNodes.length > 0) {
        return
    }

    const pendingId = Math.random()
    lastPendingId = pendingId
    pending++

    console.log('Waiting for nodes availability...')
    let attempts = 120
    while (attempts > 0 && getAvailableNodes().length === 0) {
        attempts--
        await sleep(1000)

        if (lastPendingId === pendingId && attempts % 5 === 0) {
            logger.info('Still waiting for nodes, attempts left', attempts, 'Pending', pending)
        }
    }
    pending--
    if (attempts === 0) {
        throw new Error('No free nodes/slots available')
    }
}
