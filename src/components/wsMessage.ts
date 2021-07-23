import { IMessage, connection as WSConnection } from 'websocket'

export function forwardMessage(connection: WSConnection, message: IMessage) {
    if (message.type === 'utf8') {
        connection.sendUTF(message.utf8Data!)
    } else if (message.type === 'binary') {
        // seems like it never happens
        connection.sendBytes(message.binaryData!)
    }
}
