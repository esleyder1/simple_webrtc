import { EmitterImpl, TransportState } from "../../../lib/api/index.js";
export class TransportFake {
    constructor(logger) {
        this.logger = logger;
        this._id = "";
        this.peers = [];
        this._receiveDropOnce = false;
        this._state = TransportState.Disconnected;
        this._stateEventEmitter = new EmitterImpl();
    }
    set id(id) {
        this._id = id;
    }
    get protocol() {
        return "FAKE";
    }
    get state() {
        return this._state;
    }
    get stateChange() {
        return this._stateEventEmitter;
    }
    connect() {
        return this._connect();
    }
    disconnect() {
        return this._disconnect();
    }
    dispose() {
        return Promise.resolve();
    }
    send(message) {
        return this._send(message).then(() => {
            return;
        });
    }
    isConnected() {
        return this._state === TransportState.Connected;
    }
    setConnected(connected) {
        this._state = connected ? TransportState.Connected : TransportState.Disconnected;
    }
    addPeer(peer) {
        this.peers.push(peer);
    }
    receive(msg) {
        /*
        let message = "";
        message += this._id ? `${this._id} ` : "";
        message += `Receiving...\n${msg}`;
        this.logger.log(message);
        */
        if (this._receiveDropOnce) {
            this._receiveDropOnce = false;
            this.logger.warn((this._id ? `${this._id} ` : "") + "Dropped message");
        }
        else if (this.onMessage) {
            this.onMessage(msg);
        }
        this.receiveHappened();
    }
    receiveDropOnce() {
        this._receiveDropOnce = true;
    }
    async waitSent() {
        if (this.waitingForSendPromise) {
            throw new Error("Already waiting for send.");
        }
        this.waitingForSendPromise = new Promise((resolve, reject) => {
            this.waitingForSendResolve = resolve;
            this.waitingForSendReject = reject;
        });
        return this.waitingForSendPromise;
    }
    async waitReceived() {
        if (this.waitingForReceivePromise) {
            throw new Error("Already waiting for receive.");
        }
        this.waitingForReceivePromise = new Promise((resolve, reject) => {
            this.waitingForReceiveResolve = resolve;
            this.waitingForReceiveReject = reject;
        });
        return this.waitingForReceivePromise;
    }
    _connect() {
        switch (this._state) {
            case TransportState.Connecting:
                this.transitionState(TransportState.Connected);
                break;
            case TransportState.Connected:
                break;
            case TransportState.Disconnecting:
                this.transitionState(TransportState.Connecting);
                this.transitionState(TransportState.Connected);
                break;
            case TransportState.Disconnected:
                this.transitionState(TransportState.Connecting);
                this.transitionState(TransportState.Connected);
                break;
            default:
                throw new Error("Unknown state.");
        }
        return Promise.resolve();
    }
    _disconnect() {
        switch (this._state) {
            case TransportState.Connecting:
                this.transitionState(TransportState.Disconnecting);
                this.transitionState(TransportState.Disconnected);
                break;
            case TransportState.Connected:
                this.transitionState(TransportState.Disconnecting);
                this.transitionState(TransportState.Disconnected);
                break;
            case TransportState.Disconnecting:
                this.transitionState(TransportState.Disconnected);
                break;
            case TransportState.Disconnected:
                break;
            default:
                throw new Error("Unknown state.");
        }
        return Promise.resolve();
    }
    _send(msg) {
        if (!this.isConnected()) {
            return Promise.resolve().then(() => {
                this.sendHappened();
                throw new Error("Not connected.");
            });
        }
        let message = "";
        message += this._id ? `${this._id} ` : "";
        message += `Sending...\n${msg}`;
        this.logger.log(message);
        return Promise.resolve().then(() => {
            this.peers.forEach((peer) => {
                // console.warn("Passing");
                peer.onReceived(msg);
            });
            this.sendHappened();
            return { msg };
        });
    }
    onReceived(msg) {
        Promise.resolve().then(() => {
            this.receive(msg);
        });
    }
    sendHappened() {
        if (this.waitingForSendResolve) {
            this.waitingForSendResolve();
        }
        this.waitingForSendPromise = undefined;
        this.waitingForSendResolve = undefined;
        this.waitingForSendReject = undefined;
    }
    sendTimeout() {
        if (this.waitingForSendReject) {
            this.waitingForSendReject(new Error("Timed out waiting for send."));
        }
        this.waitingForSendPromise = undefined;
        this.waitingForSendResolve = undefined;
        this.waitingForSendReject = undefined;
    }
    receiveHappened() {
        if (this.waitingForReceiveResolve) {
            this.waitingForReceiveResolve();
        }
        this.waitingForReceivePromise = undefined;
        this.waitingForReceiveResolve = undefined;
        this.waitingForReceiveReject = undefined;
    }
    receiveTimeout() {
        if (this.waitingForReceiveReject) {
            this.waitingForReceiveReject(new Error("Timed out waiting for receive."));
        }
        this.waitingForReceivePromise = undefined;
        this.waitingForReceiveResolve = undefined;
        this.waitingForReceiveReject = undefined;
    }
    /**
     * Transition transport state.
     * @internal
     */
    transitionState(newState, error) {
        const invalidTransition = () => {
            throw new Error(`Invalid state transition from ${this._state} to ${newState}`);
        };
        // Validate state transition
        switch (this._state) {
            case TransportState.Connecting:
                if (newState !== TransportState.Connected &&
                    newState !== TransportState.Disconnecting &&
                    newState !== TransportState.Disconnected) {
                    invalidTransition();
                }
                break;
            case TransportState.Connected:
                if (newState !== TransportState.Disconnecting && newState !== TransportState.Disconnected) {
                    invalidTransition();
                }
                break;
            case TransportState.Disconnecting:
                if (newState !== TransportState.Connecting && newState !== TransportState.Disconnected) {
                    invalidTransition();
                }
                break;
            case TransportState.Disconnected:
                if (newState !== TransportState.Connecting) {
                    invalidTransition();
                }
                break;
            default:
                throw new Error("Unknown state.");
        }
        // Update state
        const oldState = this._state;
        this._state = newState;
        this.logger.log(`Transitioned from ${oldState} to ${this._state}`);
        this._stateEventEmitter.emit(this._state);
        //  Transition to Connected
        if (newState === TransportState.Connected) {
            if (this.onConnect) {
                this.onConnect();
            }
        }
        //  Transition from Connected
        if (oldState === TransportState.Connected) {
            if (this.onDisconnect) {
                if (error) {
                    this.onDisconnect(error);
                }
                else {
                    this.onDisconnect();
                }
            }
        }
    }
}
