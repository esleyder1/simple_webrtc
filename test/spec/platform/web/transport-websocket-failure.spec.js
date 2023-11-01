class WebSocket {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(url, protocols) {
        throw new Error("TEST ERROR");
    }
}
let originalWebSocket = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function retrieveGlobalObject() {
    if (typeof window !== "undefined") {
        return window;
    }
    // return typeof process === "object" && typeof require === "function" && typeof global === "object" ? global : this;
    return typeof this === "object" ? this : Function("return this")();
}
function start() {
    const globalObj = retrieveGlobalObject();
    if (globalObj.WebSocket) {
        originalWebSocket = globalObj.WebSocket;
    }
    globalObj.WebSocket = WebSocket;
}
function stop() {
    const globalObj = retrieveGlobalObject();
    if (originalWebSocket) {
        globalObj.WebSocket = originalWebSocket;
    }
    else {
        delete globalObj.WebSocket;
    }
    originalWebSocket = null;
}
import { LoggerFactory } from "../../../../lib/core/index.js";
import { Transport } from "../../../../lib/platform/web/index.js";
describe("Web Transport WebSocket Construction Failure", () => {
    const connectionTimeout = 5; // seconds
    const server = "wss://localhost:8080";
    const log = new LoggerFactory();
    const logger = log.getLogger("sip.Transport");
    let connectError;
    let transport;
    beforeEach(async () => {
        start();
        jasmine.clock().install();
        connectError = undefined;
        transport = new Transport(logger, {
            connectionTimeout,
            server
        });
        return transport.connect().catch((error) => {
            connectError = error;
        });
    });
    afterEach(() => {
        transport.dispose();
        jasmine.clock().uninstall();
        stop();
    });
    it("connect error MUST be thrown", () => {
        expect(connectError).toEqual(jasmine.any(Error));
    });
});
