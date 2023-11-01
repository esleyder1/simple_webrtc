export function makeMockSessionDescriptionHandler(name, id) {
    let closed = false;
    let state = "stable";
    const sdh = jasmine.createSpyObj("SessionDescriptionHandler", [
        "close",
        "getDescription",
        "hasDescription",
        "rollbackDescription",
        "setDescription",
        "sendDtmf"
    ]);
    // Hacky properties to test failure cases...
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj = sdh;
    obj.getDescriptionRejectOnce = undefined;
    obj.getDescriptionUndefinedBodyOnce = undefined;
    obj.setDescriptionRejectOnce = undefined;
    obj.setDescriptionWaitOnce = undefined;
    sdh.close.and.callFake(() => {
        // console.warn(`SDH.close[${name}][${id}]`);
        // TODO:
        // Throwing here is only helpful for debugging as it will cause the test to fail.
        // In the current version of Jasmie It will simple go as an uncaught.
        // if (closed) {
        //   throw new Error(`close[${name}][${id}] Already closed`);
        // }
        closed = true;
        return;
    });
    sdh.getDescription.and.callFake(() => {
        if (closed) {
            throw new Error(`SDH.getDescription[${name}][${id}] SDH closed`);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (sdh.getDescriptionRejectOnce) {
            // hacky
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            sdh.getDescriptionRejectOnce = undefined;
            return Promise.reject(new Error(`SDH.getDescription[${name}][${id}] SDH test failure`));
        }
        const fromState = state;
        const contentType = "application/sdp";
        let body;
        switch (state) {
            case "stable":
                state = "has-local-offer";
                body = "SDP OFFER";
                break;
            case "has-local-offer":
                throw new Error(`SDH.getDescription[${name}][${id}] ${fromState} => ${state} Invalid SDH state transition`);
            case "has-remote-offer":
                state = "stable";
                body = "SDP ANSWER";
                break;
            default:
                throw new Error("Unknown SDH state");
        }
        // console.warn(`getDescription[${name}] ${fromState} => ${state}`);
        const bodyObj = { contentType, body };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (sdh.getDescriptionUndefinedBodyOnce) {
            // hacky
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            sdh.getDescriptionUndefinedBodyOnce = undefined;
            bodyObj.body = "";
        }
        return Promise.resolve().then(() => {
            return bodyObj;
        });
    });
    sdh.hasDescription.and.callFake((contentType) => {
        if (closed) {
            throw new Error(`SDH.hasDescription[${name}][${id}] SDH closed`);
        }
        return contentType === "application/sdp";
    });
    sdh.rollbackDescription.and.callFake(() => {
        if (closed) {
            throw new Error(`SDH.rollbackDescription[${name}][${id}] SDH closed`);
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const fromState = state;
        switch (state) {
            case "stable":
                // throw new Error(`SDH.rollbackDescription[${name}][${id}] ${fromState} => ${state} Invalid SDH state transition`);
                state = "stable";
                break;
            case "has-local-offer":
                state = "stable";
                break;
            case "has-remote-offer":
                state = "stable";
                break;
            default:
                throw new Error("Unknown SDH state");
        }
        // console.warn(`SDH.rollbackDescription[${name}][${id}] ${fromState} => ${state}`);
        return Promise.resolve().then(() => {
            return;
        });
    });
    sdh.setDescription.and.callFake((sdp) => {
        if (closed) {
            throw new Error(`SDH.setDescription[${name}][${id}] SDH closed`);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (sdh.setDescriptionRejectOnce) {
            // hacky
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            sdh.setDescriptionRejectOnce = undefined;
            return Promise.reject(new Error(`SDH.setDescription[${name}][${id}] SDH test failure`));
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (sdh.setDescriptionWaitOnce) {
            // hacky
            const timeout = 1;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            sdh.setDescriptionWaitOnce = undefined;
            return new Promise((resolve) => {
                setTimeout(() => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    sdh.setDescription().then(() => resolve());
                }, timeout);
            });
        }
        const fromState = state;
        switch (state) {
            case "stable":
                if (sdp === "SDP ANSWER") {
                    throw new Error(`SDH.setDescription[${name}][${id}] ${fromState} => ${state} Invalid SDH state transition - expected offer`);
                }
                state = "has-remote-offer";
                break;
            case "has-local-offer":
                if (sdp === "SDP OFFER") {
                    throw new Error(`SDH.setDescription[${name}][${id}] ${fromState} => ${state} Invalid SDH state transition - expected answer`);
                }
                state = "stable";
                break;
            case "has-remote-offer":
                throw new Error(`SDH.setDescription[${name}][${id}] ${fromState} => ${state} Invalid SDH state transition`);
            default:
                throw new Error("Unknown SDH state");
        }
        // console.warn(`SDH.setDescription[${name}][${id}] ${fromState} => ${state}`);
        return Promise.resolve().then(() => {
            return;
        });
    });
    // console.warn(`SDH.make[${name}][${id}]`);
    return sdh;
}
export function makeMockSessionDescriptionHandlerFactory(name, id = 0, store) {
    const factory = (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    session, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options) => {
        const mock = makeMockSessionDescriptionHandler(name, id++);
        if (store) {
            store.push(mock);
        }
        return mock;
    };
    return factory;
}
