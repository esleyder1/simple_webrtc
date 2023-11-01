export async function soon(timeout = 1) {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), timeout);
        jasmine.clock().tick(timeout);
    });
}
