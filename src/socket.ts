import net from "net";
import { createHash } from "crypto";

function setBitInBuffer(bufferView, index, value) {
    let bufIndex = Math.floor(index / 8);
    let byteIndex = 7 - (index % 8);
    let bufferViewByte = bufferView[bufIndex];
    if (value === 1) {
        bufferViewByte = bufferViewByte | (1 << byteIndex);
    } else {
        bufferViewByte = bufferViewByte & (((1 << 9) - 1) ^ (1 << byteIndex));
    }
    bufferView[bufIndex] = bufferViewByte;
}

function readBitInNum(number: number, index: number) {
    if (index > Math.log2(number)) return 0;

    return (number & (1 << index)) >> index;
}

// TODO: implement as opimization
// should set all bits in remaining part of byte at bitindex,
// and all bytes after, until width has been reached
function setNumberInBuffer(
    bufferView: Uint8Array,
    start: number,
    value: number,
    width: number
) {
    for (let i = 0; i < width; i++) {
        let bit = readBitInNum(value, width - (i + 1));
        setBitInBuffer(bufferView, start + i, bit);
    }
}
function readBitInBuffer(bufferView, index) {
    let bufIndex = Math.floor(index / 8);
    let byteIndex = 7 - (index % 8);

    return (bufferView[bufIndex] & (1 << byteIndex)) >> byteIndex;
}

/**
 * Return the decimal number represented by the bits from `start` to `end`, inclusive.
 * @param bufferView A view of the buffer
 * @param start Starting end
 * @param end Ending index, inclusive
 */
function readDecimal(bufferView: Uint8Array, start: number, end: number) {
    const length = end - start;
    let output = 0;

    for (let i = 0; i < length + 1; i++) {
        const bit = readBitInBuffer(bufferView, start + i);
        output += bit << (length - i);
    }
    return output;
}

function encodeWebSocketBuffer(msg: string) {
    let payloadLength = msg.length;

    if (payloadLength > 2 ** 64) throw new Error("Message too long!");
    /** The length of the extended payload length, if applicable
     *
     * if len < 126 : 0
     * 	  len = 126 : 16
     *    len > 126 : 64
     *
     * https://datatracker.ietf.org/doc/html/rfc6455#section-5.2 */
    let extendedPayloadLength =
        payloadLength < 126 ? 0 : payloadLength > 1 << 16 ? 64 : 16;

    let blob = new Uint8Array(payloadLength + 2 + extendedPayloadLength);

    /* write FIN, RSV1, RSV2, RSV3 and opcode in blob*/
    setNumberInBuffer(blob, 0, 0b1000, 4);
    setNumberInBuffer(blob, 4, 0x1, 4); // 0x1 opcode text frame
    /* unmasked for sending */

    /* insert length */
    if (extendedPayloadLength === 0) {
        setNumberInBuffer(blob, 9, payloadLength, 7);
    } else if (extendedPayloadLength === 16) {
        setNumberInBuffer(blob, 9, 126, 7);
        setNumberInBuffer(blob, 16, payloadLength, 16);
    } else {
        /* extendedPayloadLength === 64 */
        setNumberInBuffer(blob, 9, 127, 7);
        setNumberInBuffer(blob, 16, payloadLength, 64);
    }

    /* insert payload */
    let payloadStartByte = 2 + extendedPayloadLength / 8;
    for (let i = 0; i < payloadLength; i++) {
        blob[i + payloadStartByte] = msg.charCodeAt(i);
    }

    return blob;
}

function decodeWebSocketBuffer(buffer: ArrayBuffer) {
    const view = new Uint8Array(buffer);

    let fin = readBitInBuffer(view, 0);
    let RSV = [
        readBitInBuffer(view, 1),
        readBitInBuffer(view, 2),
        readBitInBuffer(view, 3),
    ];
    let opcode = "0x" + readDecimal(view, 4, 7).toString(16);

    let payloadLength = readDecimal(view, 9, 15);
    let initPayloadLength = payloadLength;
    let payloadByteEnd = 2;

    if (payloadLength === 126) {
        payloadLength = readDecimal(view, 16, 31);
        payloadByteEnd = 4;
    } else if (payloadLength === 127) {
        payloadLength = readDecimal(view, 16, 79);
        payloadByteEnd = 10;
    }

    let payloadBitEnd = payloadByteEnd * 8;

    let masked = readBitInBuffer(view, 8);
    let mask: Uint8Array | undefined;

    let decoded = "";
    if (masked) {
        mask = new Uint8Array(4);
        mask[0] = readDecimal(view, payloadBitEnd, payloadBitEnd + 7);
        mask[1] = readDecimal(view, payloadBitEnd + 8, payloadBitEnd + 15);
        mask[2] = readDecimal(view, payloadBitEnd + 16, payloadBitEnd + 23);
        mask[3] = readDecimal(view, payloadBitEnd + 24, payloadBitEnd + 31);
        let encoded = view.slice(payloadByteEnd + mask.length);

        for (let i = 0; i < encoded.length; i++) {
            let charCode = encoded[i] ^ mask[i % 4];
            let char = String.fromCharCode(charCode);
            decoded += char;
        }
    } else {
        let encoded = view.slice(payloadByteEnd);

        for (let i = 0; i < encoded.length; i++) {
            let charCode = encoded[i];
            let char = String.fromCharCode(charCode);
            decoded += char;
        }
    }

    return decoded;
}

function refresh(sock) {
    let command = JSON.stringify({ type: "refresh" });
    let message = encodeWebSocketBuffer(command);
    sock.write(message);
}

export interface refreshServer {
    refresh: () => void;
    write: (msg) => void;
}

export function wsServer(): refreshServer {
    const server = <any>net.createServer();
    const WSID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
    const port = 8899;

    server.on("connection", (sock) => {
        console.log("connection!");

        sock.on("data", (buffer) => {
            var data = buffer.toString();

            const key = data.match(/Sec-WebSocket-Key: (.+)/);

            if (key) {
                console.log(`data: [\n${buffer}]`);
                const digest = createHash("sha1")
                    .update(key[1] + WSID)
                    .digest("base64");

                const headers = [
                    `HTTP/1.1 101 Switching Protocols`,
                    `Upgrade: websocket`,
                    `Connection: Upgrade`,
                    `Sec-WebSocket-Accept: ${digest}`,
                ];
                sock.write(headers.concat("\r\n").join("\r\n"));
                console.log("sent upgrade response");
            } else {
                const message = decodeWebSocketBuffer(buffer);
                const echo = encodeWebSocketBuffer(`Echo: ${message}`);

                sock.write(echo);
            }
        });

        sock.on("error", (e) => {
            console.log(`err: ${e.toString()}`);
        });
    });

    server.listen(port, () => {
        console.log(`listening on port ${port}`);
    });

    return server;
}

if (require.main === module) {
    const server = wsServer();
}
