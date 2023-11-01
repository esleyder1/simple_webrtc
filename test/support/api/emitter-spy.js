export function makeEmitterSpy(emitter, logger) {
    let waitingForEmitPromise;
    let waitingForEmitResolve;
    let waitingForEmitReject;
    let waitingForEmit;
    const emit = {
        listener: (value) => {
            const v = String(value);
            logger.log(`Emitted ${v}`);
            if (!waitingForEmitResolve) {
                return false;
            }
            if (waitingForEmit !== undefined && waitingForEmit !== value) {
                return false;
            }
            waitingForEmitResolve();
            waitingForEmitPromise = undefined;
            waitingForEmitResolve = undefined;
            waitingForEmitReject = undefined;
            waitingForEmit = undefined;
            return true;
        }
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const emitTimeout = () => {
        if (waitingForEmitReject) {
            waitingForEmitReject(new Error("Timed out waiting for emit."));
        }
        waitingForEmitPromise = undefined;
        waitingForEmitResolve = undefined;
        waitingForEmitReject = undefined;
        waitingForEmit = undefined;
    };
    const spy = Object.assign(spyOn(emit, "listener").and.callThrough(), {
        wait: async (value) => {
            if (waitingForEmitPromise) {
                throw new Error("Already waiting for emit.");
            }
            waitingForEmitPromise = new Promise((resolve, reject) => {
                waitingForEmitResolve = resolve;
                waitingForEmitReject = reject;
            });
            waitingForEmit = value;
            return waitingForEmitPromise;
        }
    });
    emitter.on(emit.listener);
    return spy;
}
