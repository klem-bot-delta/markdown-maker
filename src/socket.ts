import net from "net";
import { createHash } from "crypto";

const server = net.createServer();
const WSID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const port = 8888;

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

// TODO: implement as opimization
// should set all bits in remaining part of byte at bitindex,
// and all bytes after, until width has been reached
function setNumberInBuffer(bufferView, index, value, width) {}

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
    if (msg.length > 125) msg = "Error: Unimplemented message length";

    let payloadLength = msg.length;
    console.log(`sending: ${msg}: ${payloadLength}`);
    let payload = new Uint8Array(payloadLength);
    let blob = new Uint8Array(payloadLength + 2 + 4);

    // Generate a random bitmask for message
    let mask = new Uint8Array(4);
    for (let i = 0; i < 4; i++) {
        mask[i] = Math.floor(Math.random() * (1 << 8));
    }

    // Insert bits into payload
    setBitInBuffer(blob, 0, 1); // FIN flag

    setBitInBuffer(blob, 6, 1); // opcode (0x1)

    // set MASK flag and payload length
    blob[1] = 0;
    blob[1] |= payloadLength;

    // insert MASK key
    /* 
    for (let i = 16; i < 48; i++) {
        setBitInBuffer(blob, i, readBitInBuffer(mask, i - 16));
    } */

    // insert package
    for (let i = 2; i < 2 + msg.length; i++) {
        console.log(
            `char: ${msg[i - 2]}; charCode: ${msg.charCodeAt(i - 2)}; i: ${
                i - 2
            }`
        );

        blob[i] |= msg.charCodeAt(i - 2) /*  ^ mask[i % 4] */;
    }

    return blob;
}

function decodeWebSocketBuffer(buffer: ArrayBuffer) {
    const view = new Uint8Array(buffer);

    let payloadLength = readDecimal(view, 9, 15);

    let payloadByteEnd = 2;

    let payloadBitEnd = payloadByteEnd * 8;

    let mask = new Uint8Array(4);
    mask[0] = readDecimal(view, payloadBitEnd, payloadBitEnd + 7);
    mask[1] = readDecimal(view, payloadBitEnd + 8, payloadBitEnd + 15);
    mask[2] = readDecimal(view, payloadBitEnd + 16, payloadBitEnd + 23);
    mask[3] = readDecimal(view, payloadBitEnd + 24, payloadBitEnd + 31);

    let decoded = "";
    let encoded = view.slice(payloadByteEnd + mask.length);

    for (let i = 0; i < encoded.length; i++) {
        let charCode = encoded[i] ^ mask[i % 4];
        let char = String.fromCharCode(charCode);
        decoded += char;
    }

    return decoded;
}

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
            console.log(buffer);
            const message = decodeWebSocketBuffer(buffer);
            const echo = encodeWebSocketBuffer(`Echo: ${message}`);
            console.log(message, "\n", echo);

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
