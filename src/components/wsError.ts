import { connection as WSConnection } from 'websocket'

const ignored = ['ERR_STREAM_WRITE_AFTER_END', 'ECONNRESET']

export function logAndClose(connection: WSConnection, error: any, type: string) {
    if (!ignored.includes(error.code)) {
        console.warn(type, 'Connection Error:', error.toString())
    }
    connection.close()
}
