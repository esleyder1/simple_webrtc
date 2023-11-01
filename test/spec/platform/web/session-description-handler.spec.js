import { defaultMediaStreamFactory, defaultSessionDescriptionHandlerFactory, SessionDescriptionHandler } from "../../../../lib/platform/web/index.js";
const splitFields = (body) => body.split(/\r?\n/);
const atLeastOneField = (startsWith) => {
    return {
        asymmetricMatch: function (body) {
            const fields = splitFields(body);
            return fields.filter((field) => field.startsWith(startsWith)).length >= 1;
        },
        jasmineToString: function () {
            return "<atLeastOneField: " + startsWith + ">";
        }
    };
};
const exactlyTwoField = (startsWith) => {
    return {
        asymmetricMatch: function (body) {
            const fields = splitFields(body);
            return fields.filter((field) => field.startsWith(startsWith)).length === 2;
        },
        jasmineToString: function () {
            return "<exactlyOneField: " + startsWith + ">";
        }
    };
};
const exactlyOneField = (startsWith) => {
    return {
        asymmetricMatch: function (body) {
            const fields = splitFields(body);
            return fields.filter((field) => field.startsWith(startsWith)).length === 1;
        },
        jasmineToString: function () {
            return "<exactlyOneField: " + startsWith + ">";
        }
    };
};
const exactlyZeroField = (startsWith) => {
    return {
        asymmetricMatch: function (body) {
            const fields = splitFields(body);
            return fields.filter((field) => field.startsWith(startsWith)).length === 0;
        },
        jasmineToString: function () {
            return "<exactlyZeroField: " + startsWith + ">";
        }
    };
};
// Found a little info on WebRTC test which might be helpful, so for reference...
// https://testrtc.com/manipulating-getusermedia-available-devices/
// http://webrtc.github.io/webrtc-org/testing/
// We're using default SessionDescriptionHandlerFactory
const sessionDescriptionHandlerFactory = defaultSessionDescriptionHandlerFactory();
// A console logger
const logger = console;
// This is a fake Session with a console Logger to provide to the SessionDescriptionHandlerFactory.
// Currently the default factory only uses the following properties, so the hacks "works".
const session = {
    userAgent: {
        getLogger: () => logger
    }
};
// Options for the SessionDescriptionHandlerFactory
const sessionDescriptionHandlerFactoryOptions = {
    iceGatheringTimeout: 500
};
// Helper class for testing the timeout on waiting for ICE to complete
class SessionDescriptionHandlerTimeoutTest extends SessionDescriptionHandler {
    constructor() {
        super(...arguments);
        this.waitForIceGatheringCompleteTimedOut = false;
    }
    getLocalSessionDescription() {
        this.logger.debug("SessionDescriptionHandlerTimeoutTest.getLocalSessionDescription");
        this.waitForIceGatheringCompleteTimedOut = true; // ICE never started, so we will always have timed out if we get here
        if (this._peerConnection === undefined) {
            return Promise.reject(new Error("Peer connection closed."));
        }
        if (this.sessionDescription === undefined) {
            throw new Error("Session description undefined.");
        }
        return super
            .setLocalSessionDescription(this.sessionDescription) // set the local description now to avoid follow along errors
            .then(() => super.getLocalSessionDescription());
    }
    setLocalSessionDescription(sessionDescription) {
        this.logger.debug("SessionDescriptionHandlerTimeoutTest.setLocalSessionDescription");
        if (this._peerConnection === undefined) {
            return Promise.reject(new Error("Peer connection closed."));
        }
        this.sessionDescription = sessionDescription; // store this away so we can use it later
        return Promise.resolve(); // just return so ICE never starts
    }
}
describe("Web SessionDescriptionHandler", () => {
    beforeEach(() => {
        // jasmine.clock().install();
    });
    afterEach(() => {
        // jasmine.clock().uninstall();
    });
    describe("ICE Gathering Timeout Tests", () => {
        let sdh;
        describe("default configuration", () => {
            beforeEach((done) => {
                sdh = new SessionDescriptionHandlerTimeoutTest(logger, defaultMediaStreamFactory());
                const id = setTimeout(() => done(), 4500);
                sdh.getDescription().then(() => {
                    clearTimeout(id);
                    done();
                });
            });
            afterEach(() => {
                sdh.close();
            });
            it("waiting for ICE gathering should not timeout", () => {
                expect(sdh.waitForIceGatheringCompleteTimedOut).toBe(false);
            });
        });
        describe("timeout passed via configuration", () => {
            beforeEach((done) => {
                sdh = new SessionDescriptionHandlerTimeoutTest(logger, defaultMediaStreamFactory(), {
                    iceGatheringTimeout: 50
                });
                const id = setTimeout(() => done(), 4500);
                sdh.getDescription().then(() => {
                    clearTimeout(id);
                    done();
                });
            });
            afterEach(() => {
                sdh.close();
            });
            it("waiting for ICE gathering should timeout", () => {
                expect(sdh.waitForIceGatheringCompleteTimedOut).toBe(true);
            });
        });
        describe("timeout passed via configuration - zero timeout", () => {
            beforeEach((done) => {
                sdh = new SessionDescriptionHandlerTimeoutTest(logger, defaultMediaStreamFactory(), {
                    iceGatheringTimeout: 0
                });
                const id = setTimeout(() => done(), 4500);
                sdh.getDescription().then(() => {
                    clearTimeout(id);
                    done();
                });
            });
            afterEach(() => {
                sdh.close();
            });
            it("waiting for ICE gathering should not timeout", () => {
                expect(sdh.waitForIceGatheringCompleteTimedOut).toBe(false);
            });
        });
        describe("timeout passed via getDescription()", () => {
            beforeEach((done) => {
                sdh = new SessionDescriptionHandlerTimeoutTest(logger, defaultMediaStreamFactory());
                const id = setTimeout(() => done(), 4500);
                sdh
                    .getDescription({
                    iceGatheringTimeout: 50
                })
                    .then(() => {
                    clearTimeout(id);
                    done();
                });
            });
            afterEach(() => {
                sdh.close();
            });
            it("waiting for ICE gathering should timeout", () => {
                expect(sdh.waitForIceGatheringCompleteTimedOut).toBe(true);
            });
        });
        describe("timeout passed via getDescription() - zero timeout", () => {
            beforeEach((done) => {
                sdh = new SessionDescriptionHandlerTimeoutTest(logger, defaultMediaStreamFactory());
                const id = setTimeout(() => done(), 4500);
                sdh
                    .getDescription({
                    iceGatheringTimeout: 0
                })
                    .then(() => {
                    clearTimeout(id);
                    done();
                });
            });
            afterEach(() => {
                sdh.close();
            });
            it("waiting for ICE gathering should not timeout", () => {
                expect(sdh.waitForIceGatheringCompleteTimedOut).toBe(false);
            });
        });
        describe("timeout passed via configuration and via getDescription, getDescription wins - without test timeout", () => {
            beforeEach((done) => {
                sdh = new SessionDescriptionHandlerTimeoutTest(logger, defaultMediaStreamFactory(), {
                    iceGatheringTimeout: 6000 // this should be longer than 4500 timeout below so it gets cleared
                });
                const id = setTimeout(() => done(), 4500);
                sdh
                    .getDescription({
                    iceGatheringTimeout: 50
                })
                    .then(() => {
                    clearTimeout(id);
                    done();
                });
            });
            afterEach(() => {
                sdh.close();
            });
            it("waiting for ICE gathering should timeout", () => {
                expect(sdh.waitForIceGatheringCompleteTimedOut).toBe(true);
            });
        });
        describe("timeout passed via configuration and via getDescription, getDescription wins - with test timeout", () => {
            beforeEach((done) => {
                sdh = new SessionDescriptionHandlerTimeoutTest(logger, defaultMediaStreamFactory(), {
                    iceGatheringTimeout: 50
                });
                const id = setTimeout(() => done(), 4500);
                sdh
                    .getDescription({
                    iceGatheringTimeout: 6000 // this should be longer than 4500 timeout above so it does not clear
                })
                    .then(() => {
                    clearTimeout(id);
                    done();
                })
                    .catch(() => {
                    // the ICE gathering timeout will trigger at 6000 after this test is done and the SDH is already closed,
                    // so here we are catching the uncaught error that gets thrown.
                });
            });
            afterEach(() => {
                sdh.close();
            });
            it("waiting for ICE gathering should not timeout", () => {
                expect(sdh.waitForIceGatheringCompleteTimedOut).toBe(false);
            });
        });
        describe("timeout passed via configuration and via getDescription, getDescription wins - zero timeout", () => {
            beforeEach((done) => {
                sdh = new SessionDescriptionHandlerTimeoutTest(logger, defaultMediaStreamFactory(), {
                    iceGatheringTimeout: 6000 // this should be longer than 4500 timeout below so it gets cleared
                });
                const id = setTimeout(() => done(), 4500);
                sdh
                    .getDescription({
                    iceGatheringTimeout: 0
                })
                    .then(() => {
                    clearTimeout(id);
                    done();
                });
            });
            afterEach(() => {
                sdh.close();
            });
            it("waiting for ICE gathering should not timeout", () => {
                expect(sdh.waitForIceGatheringCompleteTimedOut).toBe(false);
            });
        });
    });
    describe("Interop Tests", () => {
        let sdh1;
        let sdh1LocalOnAddTrackSpy;
        let sdh1LocalOnRemoveTrackSpy;
        let sdh1RemoteOnAddTrackSpy;
        let sdh1RemoteOnRemoveTrackSpy;
        let sdh2;
        let sdh2LocalOnAddTrackSpy;
        let sdh2LocalOnRemoveTrackSpy;
        let sdh2RemoteOnAddTrackSpy;
        let sdh2RemoteOnRemoveTrackSpy;
        const resetSpies = () => {
            sdh1LocalOnAddTrackSpy.calls.reset();
            sdh1LocalOnRemoveTrackSpy.calls.reset();
            sdh1RemoteOnAddTrackSpy.calls.reset();
            sdh1RemoteOnRemoveTrackSpy.calls.reset();
            sdh2LocalOnAddTrackSpy.calls.reset();
            sdh2LocalOnRemoveTrackSpy.calls.reset();
            sdh2RemoteOnAddTrackSpy.calls.reset();
            sdh2RemoteOnRemoveTrackSpy.calls.reset();
        };
        beforeEach(() => {
            sdh1 = sessionDescriptionHandlerFactory(session, sessionDescriptionHandlerFactoryOptions);
            sdh1LocalOnAddTrackSpy = jasmine.createSpy("sdh1LocalOnAddTrackSpy");
            sdh1LocalOnRemoveTrackSpy = jasmine.createSpy("sdh1LocalOnRemoveTrackSpy");
            sdh1RemoteOnAddTrackSpy = jasmine.createSpy("sdh1RemoteOnAddTrackSpy");
            sdh1RemoteOnRemoveTrackSpy = jasmine.createSpy("sdh1RemoteOnRemoveTrackSpy");
            sdh1.localMediaStream.onaddtrack = sdh1LocalOnAddTrackSpy;
            sdh1.localMediaStream.onremovetrack = sdh1LocalOnRemoveTrackSpy;
            sdh1.remoteMediaStream.onaddtrack = sdh1RemoteOnAddTrackSpy;
            sdh1.remoteMediaStream.onremovetrack = sdh1RemoteOnRemoveTrackSpy;
            sdh2 = sessionDescriptionHandlerFactory(session, sessionDescriptionHandlerFactoryOptions);
            sdh2LocalOnAddTrackSpy = jasmine.createSpy("sdh2LocalOnAddTrackSpy");
            sdh2LocalOnRemoveTrackSpy = jasmine.createSpy("sdh2LocalOnRemoveTrackSpy");
            sdh2RemoteOnAddTrackSpy = jasmine.createSpy("sdh2RemoteOnAddTrackSpy");
            sdh2RemoteOnRemoveTrackSpy = jasmine.createSpy("sdh2RemoteOnRemoveTrackSpy");
            sdh2.localMediaStream.onaddtrack = sdh2LocalOnAddTrackSpy;
            sdh2.localMediaStream.onremovetrack = sdh2LocalOnRemoveTrackSpy;
            sdh2.remoteMediaStream.onaddtrack = sdh2RemoteOnAddTrackSpy;
            sdh2.remoteMediaStream.onremovetrack = sdh2RemoteOnRemoveTrackSpy;
        });
        afterEach(() => {
            sdh1.close();
            sdh2.close();
        });
        it("peer connection should not be undefined", () => {
            expect(sdh1.peerConnection).not.toBe(undefined);
            expect(sdh2.peerConnection).not.toBe(undefined);
        });
        it("signaling state should be stable", () => {
            var _a, _b;
            expect((_a = sdh1.peerConnection) === null || _a === void 0 ? void 0 : _a.signalingState).toBe("stable");
            expect((_b = sdh2.peerConnection) === null || _b === void 0 ? void 0 : _b.signalingState).toBe("stable");
        });
        describe("close", () => {
            beforeEach(() => {
                resetSpies();
                sdh1.close();
                sdh2.close();
            });
            it("peer connection should be undefined", () => {
                expect(sdh1.peerConnection).toBe(undefined);
                expect(sdh2.peerConnection).toBe(undefined);
            });
        });
        describe("sdh1 getDescription close race", () => {
            let error;
            beforeEach(async () => {
                resetSpies();
                return new Promise((resolve) => {
                    sdh1.getDescription().catch((e) => {
                        error = e;
                        resolve();
                    });
                    sdh1.close();
                });
            });
            it("peer connection should be undefined", () => {
                expect(sdh1.peerConnection).toBe(undefined);
            });
            it("error should be instance of Error", () => {
                expect(error instanceof Error).toBe(true);
            });
        });
        describe("sdh1 getDescription", () => {
            let offer;
            let answer;
            beforeEach(async () => {
                resetSpies();
                offer = undefined;
                return sdh1.getDescription().then((description) => {
                    offer = description;
                });
            });
            it("offer was created", () => {
                if (!offer) {
                    fail("Offer undefined");
                    return;
                }
                expect(offer.body).not.toBe("");
                expect(offer.contentType).toBe("application/sdp");
            });
            it("offer has one m=audio and zero m=video", () => {
                if (!offer) {
                    fail("Offer undefined");
                    return;
                }
                expect(offer.body).toEqual(exactlyOneField("m=audio"));
                expect(offer.body).toEqual(exactlyZeroField("m=video"));
            });
            it("offer has one a=sendrecv", () => {
                if (!offer) {
                    fail("Offer undefined");
                    return;
                }
                expect(offer.body).toEqual(exactlyOneField("a=sendrecv"));
            });
            it("offer has at least one a=candidate", () => {
                if (!offer) {
                    fail("Offer undefined");
                    return;
                }
                expect(offer.body).toEqual(atLeastOneField("a=candidate"));
            });
            it("hasDescription should be true", () => {
                expect(offer).not.toBe(undefined);
                if (offer) {
                    expect(sdh1.hasDescription(offer.contentType)).toBe(true);
                }
            });
            it("signaling state should be have-local-offer", () => {
                var _a;
                expect((_a = sdh1.peerConnection) === null || _a === void 0 ? void 0 : _a.signalingState).toBe("have-local-offer");
            });
            it("transceiver direction should be sendrecv", () => {
                var _a;
                const transceivers = (_a = sdh1.peerConnection) === null || _a === void 0 ? void 0 : _a.getTransceivers();
                if (!transceivers) {
                    fail("Transceivers undefined");
                    return;
                }
                expect(transceivers.length).toBe(1);
                expect(transceivers[0].direction).toBe("sendrecv");
            });
            it("local media stream state", () => {
                expect(sdh1LocalOnAddTrackSpy).toHaveBeenCalledTimes(1);
                expect(sdh1LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
            });
            it("remote media stream state", () => {
                expect(sdh1RemoteOnAddTrackSpy).toHaveBeenCalledTimes(0);
                expect(sdh1RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
            });
            describe("sdh2 setDescription close race", () => {
                let error;
                beforeEach(async () => {
                    resetSpies();
                    return new Promise((resolve) => {
                        if (!offer) {
                            throw new Error("Offer undefined.");
                        }
                        sdh2.setDescription(offer.body).catch((e) => {
                            error = e;
                            resolve();
                        });
                        sdh2.close();
                    });
                });
                it("peer connection should be undefined", () => {
                    expect(sdh2.peerConnection).toBe(undefined);
                });
                it("error should be instance of Error", () => {
                    expect(error instanceof Error).toBe(true);
                });
            });
            describe("sdh2 setDescription", () => {
                beforeEach(async () => {
                    resetSpies();
                    if (!offer) {
                        throw new Error("Offer undefined.");
                    }
                    return sdh2.setDescription(offer.body);
                });
                it("signaling state have-remote-offer", () => {
                    var _a;
                    expect((_a = sdh2.peerConnection) === null || _a === void 0 ? void 0 : _a.signalingState).toBe("have-remote-offer");
                });
                it("local media stream state", () => {
                    expect(sdh2LocalOnAddTrackSpy).toHaveBeenCalledTimes(1);
                    expect(sdh2LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                });
                it("remote media stream state", () => {
                    expect(sdh2RemoteOnAddTrackSpy).toHaveBeenCalledTimes(1);
                    expect(sdh2RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                });
                describe("sdh2 getDescription", () => {
                    beforeEach(async () => {
                        resetSpies();
                        answer = undefined;
                        return sdh2.getDescription().then((description) => {
                            answer = description;
                        });
                    });
                    it("answer was created", () => {
                        if (!answer) {
                            fail("Answer undefined");
                            return;
                        }
                        expect(answer.body).not.toBe("");
                        expect(answer.contentType).toBe("application/sdp");
                    });
                    it("answer has one m=audio and zero m=video", () => {
                        if (!answer) {
                            fail("Answer undefined");
                            return;
                        }
                        expect(answer.body).toEqual(exactlyOneField("m=audio"));
                        expect(answer.body).toEqual(exactlyZeroField("m=video"));
                    });
                    it("answer has one a=sendrecv", () => {
                        if (!answer) {
                            fail("Answer undefined");
                            return;
                        }
                        expect(answer.body).toEqual(exactlyOneField("a=sendrecv"));
                    });
                    it("answer has at least one a=candidate", () => {
                        if (!answer) {
                            fail("Answer undefined");
                            return;
                        }
                        expect(answer.body).toEqual(atLeastOneField("a=candidate"));
                    });
                    it("hasDescription should be true", () => {
                        expect(answer).not.toBe(undefined);
                        if (answer) {
                            expect(sdh2.hasDescription(answer.contentType)).toBe(true);
                        }
                    });
                    it("signaling state should be stable", () => {
                        var _a;
                        expect((_a = sdh2.peerConnection) === null || _a === void 0 ? void 0 : _a.signalingState).toBe("stable");
                    });
                    it("transceiver direction should be sendrecv", () => {
                        var _a;
                        const transceivers = (_a = sdh2.peerConnection) === null || _a === void 0 ? void 0 : _a.getTransceivers();
                        if (!transceivers) {
                            fail("Transceivers undefined");
                            return;
                        }
                        expect(transceivers.length).toBe(1);
                        expect(transceivers[0].direction).toBe("sendrecv");
                    });
                    it("local media stream state", () => {
                        expect(sdh2LocalOnAddTrackSpy).toHaveBeenCalledTimes(0);
                        expect(sdh2LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                    });
                    it("remote media stream state", () => {
                        expect(sdh2RemoteOnAddTrackSpy).toHaveBeenCalledTimes(0);
                        expect(sdh2RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                    });
                    describe("sdh1 setDescription", () => {
                        beforeEach(async () => {
                            resetSpies();
                            if (!answer) {
                                throw new Error("Answer undefined.");
                            }
                            return sdh1.setDescription(answer.body).then(() => {
                                // Wait until both ends are reporting connected otherwise things
                                // may not yet work as expected (sending DTMF for example).
                                return new Promise((resolve) => {
                                    const resolveIfConnected = () => {
                                        var _a, _b;
                                        if (((_a = sdh1.peerConnection) === null || _a === void 0 ? void 0 : _a.connectionState) === "connected" &&
                                            ((_b = sdh2.peerConnection) === null || _b === void 0 ? void 0 : _b.connectionState) === "connected") {
                                            resolve();
                                        }
                                    };
                                    resolveIfConnected();
                                    sdh1.peerConnectionDelegate = {
                                        onconnectionstatechange: () => {
                                            resolveIfConnected();
                                        }
                                    };
                                    sdh2.peerConnectionDelegate = {
                                        onconnectionstatechange: () => {
                                            resolveIfConnected();
                                        }
                                    };
                                });
                            });
                        });
                        it("signaling state should be stable", () => {
                            var _a;
                            expect((_a = sdh1.peerConnection) === null || _a === void 0 ? void 0 : _a.signalingState).toBe("stable");
                        });
                        it("transceiver direction should be sendrecv", () => {
                            var _a;
                            const transceivers = (_a = sdh1.peerConnection) === null || _a === void 0 ? void 0 : _a.getTransceivers();
                            if (!transceivers) {
                                fail("Transceivers undefined");
                                return;
                            }
                            expect(transceivers.length).toBe(1);
                            expect(transceivers[0].direction).toBe("sendrecv");
                        });
                        it("local media stream state", () => {
                            expect(sdh1LocalOnAddTrackSpy).toHaveBeenCalledTimes(0);
                            expect(sdh1LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                        });
                        it("remote media stream state", () => {
                            expect(sdh1RemoteOnAddTrackSpy).toHaveBeenCalledTimes(1);
                            expect(sdh1RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                        });
                        describe("sdh1 getDescription - audio with constraints change", () => {
                            beforeEach(async () => {
                                resetSpies();
                                offer = undefined;
                                return sdh1
                                    .getDescription({
                                    constraints: {
                                        audio: {
                                            noiseSuppression: true
                                        }
                                    }
                                })
                                    .then((description) => {
                                    offer = description;
                                });
                            });
                            it("offer was created", () => {
                                if (!offer) {
                                    fail("Offer undefined");
                                    return;
                                }
                                expect(offer.body).not.toBe("");
                                expect(offer.contentType).toBe("application/sdp");
                            });
                            it("offer has one m=audio and zero m=video", () => {
                                if (!offer) {
                                    fail("Offer undefined");
                                    return;
                                }
                                expect(offer.body).toEqual(exactlyOneField("m=audio"));
                                expect(offer.body).toEqual(exactlyZeroField("m=video"));
                            });
                            it("offer has at least one a=candidate", () => {
                                if (!offer) {
                                    fail("Offer undefined");
                                    return;
                                }
                                expect(offer.body).toEqual(atLeastOneField("a=candidate"));
                            });
                            it("local media stream state", () => {
                                expect(sdh1LocalOnAddTrackSpy).toHaveBeenCalledTimes(1);
                                expect(sdh1LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(1);
                            });
                            it("remote media stream state", () => {
                                expect(sdh1RemoteOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                expect(sdh1RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                            });
                        });
                        describe("sdh1 getDescription - audio with ice restart", () => {
                            beforeEach(async () => {
                                resetSpies();
                                offer = undefined;
                                return sdh1
                                    .getDescription({
                                    constraints: {
                                        audio: true
                                    },
                                    offerOptions: {
                                        iceRestart: true
                                    }
                                })
                                    .then((description) => {
                                    offer = description;
                                });
                            });
                            it("offer was created", () => {
                                if (!offer) {
                                    fail("Offer undefined");
                                    return;
                                }
                                expect(offer.body).not.toBe("");
                                expect(offer.contentType).toBe("application/sdp");
                            });
                            it("offer has one m=audio and zero m=video", () => {
                                if (!offer) {
                                    fail("Offer undefined");
                                    return;
                                }
                                expect(offer.body).toEqual(exactlyOneField("m=audio"));
                                expect(offer.body).toEqual(exactlyZeroField("m=video"));
                            });
                            it("offer has at least one a=candidate", () => {
                                if (!offer) {
                                    fail("Offer undefined");
                                    return;
                                }
                                expect(offer.body).toEqual(atLeastOneField("a=candidate"));
                            });
                            it("local media stream state", () => {
                                expect(sdh1LocalOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                expect(sdh1LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                            });
                            it("remote media stream state", () => {
                                expect(sdh1RemoteOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                expect(sdh1RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                            });
                        });
                        describe("sdh1 getDescription - audio (no change)", () => {
                            beforeEach(async () => {
                                resetSpies();
                                offer = undefined;
                                return sdh1
                                    .getDescription({
                                    constraints: {
                                        audio: true
                                    }
                                })
                                    .then((description) => {
                                    offer = description;
                                });
                            });
                            it("offer was created", () => {
                                if (!offer) {
                                    fail("Offer undefined");
                                    return;
                                }
                                expect(offer.body).not.toBe("");
                                expect(offer.contentType).toBe("application/sdp");
                            });
                            it("offer has one m=audio and zero m=video", () => {
                                if (!offer) {
                                    fail("Offer undefined");
                                    return;
                                }
                                expect(offer.body).toEqual(exactlyOneField("m=audio"));
                                expect(offer.body).toEqual(exactlyZeroField("m=video"));
                            });
                            it("offer has at least one a=candidate", () => {
                                if (!offer) {
                                    fail("Offer undefined");
                                    return;
                                }
                                expect(offer.body).toEqual(atLeastOneField("a=candidate"));
                            });
                            it("local media stream state", () => {
                                expect(sdh1LocalOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                expect(sdh1LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                            });
                            it("remote media stream state", () => {
                                expect(sdh1RemoteOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                expect(sdh1RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                            });
                            describe("sdh2 setDescription", () => {
                                beforeEach(async () => {
                                    resetSpies();
                                    if (!offer) {
                                        throw new Error("Offer undefined.");
                                    }
                                    return sdh2.setDescription(offer.body);
                                });
                                it("signaling state have-remote-offer", () => {
                                    var _a;
                                    expect((_a = sdh2.peerConnection) === null || _a === void 0 ? void 0 : _a.signalingState).toBe("have-remote-offer");
                                });
                                it("local media stream state", () => {
                                    expect(sdh2LocalOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                    expect(sdh2LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                });
                                it("remote media stream state", () => {
                                    expect(sdh2RemoteOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                    expect(sdh2RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                });
                                describe("sdh2 getDescription", () => {
                                    beforeEach(async () => {
                                        resetSpies();
                                        answer = undefined;
                                        return sdh2.getDescription().then((description) => {
                                            answer = description;
                                        });
                                    });
                                    it("answer was created", () => {
                                        if (!answer) {
                                            fail("Answer undefined");
                                            return;
                                        }
                                        expect(answer.body).not.toBe("");
                                        expect(answer.contentType).toBe("application/sdp");
                                    });
                                    it("hasDescription should be true", () => {
                                        expect(answer).not.toBe(undefined);
                                        if (answer) {
                                            expect(sdh2.hasDescription(answer.contentType)).toBe(true);
                                        }
                                    });
                                    it("signaling state should be stable", () => {
                                        var _a;
                                        expect((_a = sdh2.peerConnection) === null || _a === void 0 ? void 0 : _a.signalingState).toBe("stable");
                                    });
                                    it("local media stream state", () => {
                                        expect(sdh2LocalOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                        expect(sdh2LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                    });
                                    it("remote media stream state", () => {
                                        expect(sdh2RemoteOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                        expect(sdh2RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                    });
                                    describe("sdh1 setDescription", () => {
                                        beforeEach(async () => {
                                            resetSpies();
                                            if (!answer) {
                                                throw new Error("Answer undefined.");
                                            }
                                            return sdh1.setDescription(answer.body);
                                        });
                                        it("signaling state should be stable", () => {
                                            var _a;
                                            expect((_a = sdh1.peerConnection) === null || _a === void 0 ? void 0 : _a.signalingState).toBe("stable");
                                        });
                                        it("local media stream state", () => {
                                            expect(sdh1LocalOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                            expect(sdh1LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                        });
                                        it("remote media stream state", () => {
                                            expect(sdh1RemoteOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                            expect(sdh1RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                        });
                                    });
                                });
                            });
                        });
                        describe("sdh1 getDescription - audio hold", () => {
                            beforeEach(async () => {
                                resetSpies();
                                offer = undefined;
                                return sdh1
                                    .getDescription({
                                    constraints: {
                                        audio: true
                                    },
                                    hold: true
                                })
                                    .then((description) => {
                                    offer = description;
                                });
                            });
                            it("offer was created", () => {
                                if (!offer) {
                                    fail("Offer undefined");
                                    return;
                                }
                                expect(offer.body).not.toBe("");
                                expect(offer.contentType).toBe("application/sdp");
                            });
                            it("offer has one m=audio and zero m=video", () => {
                                if (!offer) {
                                    fail("Offer undefined");
                                    return;
                                }
                                expect(offer.body).toEqual(exactlyOneField("m=audio"));
                                expect(offer.body).toEqual(exactlyZeroField("m=video"));
                            });
                            it("offer has one a=sendonly", () => {
                                if (!offer) {
                                    fail("Offer undefined");
                                    return;
                                }
                                expect(offer.body).toEqual(exactlyOneField("a=sendonly"));
                            });
                            it("offer has at least one a=candidate", () => {
                                if (!offer) {
                                    fail("Offer undefined");
                                    return;
                                }
                                expect(offer.body).toEqual(atLeastOneField("a=candidate"));
                            });
                            it("transceiver direction should be sendonly", () => {
                                var _a;
                                const transceivers = (_a = sdh1.peerConnection) === null || _a === void 0 ? void 0 : _a.getTransceivers();
                                if (!transceivers) {
                                    fail("Transceivers undefined");
                                    return;
                                }
                                expect(transceivers.length).toBe(1);
                                expect(transceivers[0].direction).toBe("sendonly");
                            });
                            it("local media stream state", () => {
                                expect(sdh1LocalOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                expect(sdh1LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                            });
                            it("remote media stream state", () => {
                                expect(sdh1RemoteOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                expect(sdh1RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                            });
                            describe("sdh2 setDescription", () => {
                                beforeEach(async () => {
                                    resetSpies();
                                    if (!offer) {
                                        throw new Error("Offer undefined.");
                                    }
                                    return sdh2.setDescription(offer.body);
                                });
                                it("signaling state have-remote-offer", () => {
                                    var _a;
                                    expect((_a = sdh2.peerConnection) === null || _a === void 0 ? void 0 : _a.signalingState).toBe("have-remote-offer");
                                });
                                it("local media stream state", () => {
                                    expect(sdh2LocalOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                    expect(sdh2LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                });
                                it("remote media stream state", () => {
                                    expect(sdh2RemoteOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                    expect(sdh2RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                });
                                describe("sdh2 getDescription", () => {
                                    beforeEach(async () => {
                                        resetSpies();
                                        answer = undefined;
                                        return sdh2.getDescription().then((description) => {
                                            answer = description;
                                        });
                                    });
                                    it("answer was created", () => {
                                        if (!answer) {
                                            fail("Answer undefined");
                                            return;
                                        }
                                        expect(answer.body).not.toBe("");
                                        expect(answer.contentType).toBe("application/sdp");
                                    });
                                    it("answer has one a=recvonly", () => {
                                        if (!answer) {
                                            fail("Answer undefined");
                                            return;
                                        }
                                        expect(answer.body).toEqual(exactlyOneField("a=recvonly"));
                                    });
                                    it("hasDescription should be true", () => {
                                        expect(answer).not.toBe(undefined);
                                        if (answer) {
                                            expect(sdh2.hasDescription(answer.contentType)).toBe(true);
                                        }
                                    });
                                    it("signaling state should be stable", () => {
                                        var _a;
                                        expect((_a = sdh2.peerConnection) === null || _a === void 0 ? void 0 : _a.signalingState).toBe("stable");
                                    });
                                    it("transceiver direction should be recvonly", () => {
                                        var _a;
                                        const transceivers = (_a = sdh2.peerConnection) === null || _a === void 0 ? void 0 : _a.getTransceivers();
                                        if (!transceivers) {
                                            fail("Transceivers undefined");
                                            return;
                                        }
                                        expect(transceivers.length).toBe(1);
                                        expect(transceivers[0].direction).toBe("recvonly");
                                    });
                                    it("local media stream state", () => {
                                        expect(sdh2LocalOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                        expect(sdh2LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                    });
                                    it("remote media stream state", () => {
                                        expect(sdh2RemoteOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                        expect(sdh2RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                    });
                                    describe("sdh1 setDescription", () => {
                                        beforeEach(async () => {
                                            resetSpies();
                                            if (!answer) {
                                                throw new Error("Answer undefined.");
                                            }
                                            return sdh1.setDescription(answer.body);
                                        });
                                        it("signaling state should be stable", () => {
                                            var _a;
                                            expect((_a = sdh1.peerConnection) === null || _a === void 0 ? void 0 : _a.signalingState).toBe("stable");
                                        });
                                        it("transceiver direction should be sendonly", () => {
                                            var _a;
                                            const transceivers = (_a = sdh1.peerConnection) === null || _a === void 0 ? void 0 : _a.getTransceivers();
                                            if (!transceivers) {
                                                fail("Transceivers undefined");
                                                return;
                                            }
                                            expect(transceivers.length).toBe(1);
                                            expect(transceivers[0].direction).toBe("sendonly");
                                        });
                                        it("local media stream state", () => {
                                            expect(sdh1LocalOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                            expect(sdh1LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                        });
                                        it("remote media stream state", () => {
                                            expect(sdh1RemoteOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                            expect(sdh1RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                        });
                                        describe("sdh1 getDescription - audio unhold", () => {
                                            beforeEach(async () => {
                                                resetSpies();
                                                offer = undefined;
                                                return sdh1
                                                    .getDescription({
                                                    constraints: {
                                                        audio: true
                                                    },
                                                    hold: false
                                                })
                                                    .then((description) => {
                                                    offer = description;
                                                });
                                            });
                                            it("offer was created", () => {
                                                if (!offer) {
                                                    fail("Offer undefined");
                                                    return;
                                                }
                                                expect(offer.body).not.toBe("");
                                                expect(offer.contentType).toBe("application/sdp");
                                            });
                                            it("offer has one m=audio and zero m=video", () => {
                                                if (!offer) {
                                                    fail("Offer undefined");
                                                    return;
                                                }
                                                expect(offer.body).toEqual(exactlyOneField("m=audio"));
                                                expect(offer.body).toEqual(exactlyZeroField("m=video"));
                                            });
                                            it("offer has one a=sendrecv", () => {
                                                if (!offer) {
                                                    fail("Offer undefined");
                                                    return;
                                                }
                                                expect(offer.body).toEqual(exactlyOneField("a=sendrecv"));
                                            });
                                            it("offer has at least one a=candidate", () => {
                                                if (!offer) {
                                                    fail("Offer undefined");
                                                    return;
                                                }
                                                expect(offer.body).toEqual(atLeastOneField("a=candidate"));
                                            });
                                            it("transceiver direction should be sendrecv", () => {
                                                var _a;
                                                const transceivers = (_a = sdh1.peerConnection) === null || _a === void 0 ? void 0 : _a.getTransceivers();
                                                if (!transceivers) {
                                                    fail("Transceivers undefined");
                                                    return;
                                                }
                                                expect(transceivers.length).toBe(1);
                                                expect(transceivers[0].direction).toBe("sendrecv");
                                            });
                                            it("local media stream state", () => {
                                                expect(sdh1LocalOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                                expect(sdh1LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                            });
                                            it("remote media stream state", () => {
                                                expect(sdh1RemoteOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                                expect(sdh1RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                            });
                                            describe("sdh2 setDescription", () => {
                                                beforeEach(async () => {
                                                    resetSpies();
                                                    if (!offer) {
                                                        throw new Error("Offer undefined.");
                                                    }
                                                    return sdh2.setDescription(offer.body);
                                                });
                                                it("signaling state have-remote-offer", () => {
                                                    var _a;
                                                    expect((_a = sdh2.peerConnection) === null || _a === void 0 ? void 0 : _a.signalingState).toBe("have-remote-offer");
                                                });
                                                it("local media stream state", () => {
                                                    expect(sdh2LocalOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                                    expect(sdh2LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                                });
                                                it("remote media stream state", () => {
                                                    expect(sdh2RemoteOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                                    expect(sdh2RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                                });
                                                describe("sdh2 getDescription", () => {
                                                    beforeEach(async () => {
                                                        resetSpies();
                                                        answer = undefined;
                                                        return sdh2.getDescription().then((description) => {
                                                            answer = description;
                                                        });
                                                    });
                                                    it("answer was created", () => {
                                                        if (!answer) {
                                                            fail("Answer undefined");
                                                            return;
                                                        }
                                                        expect(answer.body).not.toBe("");
                                                        expect(answer.contentType).toBe("application/sdp");
                                                    });
                                                    it("answer has one a=sendrecv", () => {
                                                        if (!answer) {
                                                            fail("Answer undefined");
                                                            return;
                                                        }
                                                        expect(answer.body).toEqual(exactlyOneField("a=sendrecv"));
                                                    });
                                                    it("hasDescription should be true", () => {
                                                        expect(answer).not.toBe(undefined);
                                                        if (answer) {
                                                            expect(sdh2.hasDescription(answer.contentType)).toBe(true);
                                                        }
                                                    });
                                                    it("signaling state should be stable", () => {
                                                        var _a;
                                                        expect((_a = sdh2.peerConnection) === null || _a === void 0 ? void 0 : _a.signalingState).toBe("stable");
                                                    });
                                                    it("transceiver direction should be sendrecv", () => {
                                                        var _a;
                                                        const transceivers = (_a = sdh2.peerConnection) === null || _a === void 0 ? void 0 : _a.getTransceivers();
                                                        if (!transceivers) {
                                                            fail("Transceivers undefined");
                                                            return;
                                                        }
                                                        expect(transceivers.length).toBe(1);
                                                        expect(transceivers[0].direction).toBe("sendrecv");
                                                    });
                                                    it("local media stream state", () => {
                                                        expect(sdh2LocalOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                                        expect(sdh2LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                                    });
                                                    it("remote media stream state", () => {
                                                        expect(sdh2RemoteOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                                        expect(sdh2RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                                    });
                                                    describe("sdh1 setDescription", () => {
                                                        beforeEach(async () => {
                                                            resetSpies();
                                                            if (!answer) {
                                                                throw new Error("Answer undefined.");
                                                            }
                                                            return sdh1.setDescription(answer.body);
                                                        });
                                                        it("signaling state should be stable", () => {
                                                            var _a;
                                                            expect((_a = sdh1.peerConnection) === null || _a === void 0 ? void 0 : _a.signalingState).toBe("stable");
                                                        });
                                                        it("transceiver direction should be sendrecv", () => {
                                                            var _a;
                                                            const transceivers = (_a = sdh1.peerConnection) === null || _a === void 0 ? void 0 : _a.getTransceivers();
                                                            if (!transceivers) {
                                                                fail("Transceivers undefined");
                                                                return;
                                                            }
                                                            expect(transceivers.length).toBe(1);
                                                            expect(transceivers[0].direction).toBe("sendrecv");
                                                        });
                                                        it("local media stream state", () => {
                                                            expect(sdh1LocalOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                                            expect(sdh1LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                                        });
                                                        it("remote media stream state", () => {
                                                            expect(sdh1RemoteOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                                            expect(sdh1RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                        describe("sdh2 getDescription - audio hold", () => {
                                            beforeEach(async () => {
                                                resetSpies();
                                                offer = undefined;
                                                return sdh2
                                                    .getDescription({
                                                    constraints: {
                                                        audio: true
                                                    },
                                                    hold: true
                                                })
                                                    .then((description) => {
                                                    offer = description;
                                                });
                                            });
                                            it("offer was created", () => {
                                                if (!offer) {
                                                    fail("Offer undefined");
                                                    return;
                                                }
                                                expect(offer.body).not.toBe("");
                                                expect(offer.contentType).toBe("application/sdp");
                                            });
                                            it("offer has one m=audio and zero m=video", () => {
                                                if (!offer) {
                                                    fail("Offer undefined");
                                                    return;
                                                }
                                                expect(offer.body).toEqual(exactlyOneField("m=audio"));
                                                expect(offer.body).toEqual(exactlyZeroField("m=video"));
                                            });
                                            it("offer has one a=inactive", () => {
                                                if (!offer) {
                                                    fail("Offer undefined");
                                                    return;
                                                }
                                                expect(offer.body).toEqual(exactlyOneField("a=inactive"));
                                            });
                                            it("offer has at least one a=candidate", () => {
                                                if (!offer) {
                                                    fail("Offer undefined");
                                                    return;
                                                }
                                                expect(offer.body).toEqual(atLeastOneField("a=candidate"));
                                            });
                                            it("transceiver direction should be inactive", () => {
                                                var _a;
                                                const transceivers = (_a = sdh2.peerConnection) === null || _a === void 0 ? void 0 : _a.getTransceivers();
                                                if (!transceivers) {
                                                    fail("Transceivers undefined");
                                                    return;
                                                }
                                                expect(transceivers.length).toBe(1);
                                                expect(transceivers[0].direction).toBe("inactive");
                                            });
                                            it("local media stream state", () => {
                                                expect(sdh2LocalOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                                expect(sdh2LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                            });
                                            it("remote media stream state", () => {
                                                expect(sdh2RemoteOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                                expect(sdh2RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                            });
                                            describe("sdh1 setDescription", () => {
                                                beforeEach(async () => {
                                                    resetSpies();
                                                    if (!offer) {
                                                        throw new Error("Offer undefined.");
                                                    }
                                                    return sdh1.setDescription(offer.body);
                                                });
                                                it("signaling state have-remote-offer", () => {
                                                    var _a;
                                                    expect((_a = sdh1.peerConnection) === null || _a === void 0 ? void 0 : _a.signalingState).toBe("have-remote-offer");
                                                });
                                                it("local media stream state", () => {
                                                    expect(sdh1LocalOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                                    expect(sdh1LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                                });
                                                it("remote media stream state", () => {
                                                    expect(sdh1RemoteOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                                    expect(sdh1RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                                });
                                                describe("sdh1 getDescription", () => {
                                                    beforeEach(async () => {
                                                        resetSpies();
                                                        answer = undefined;
                                                        return sdh1.getDescription().then((description) => {
                                                            answer = description;
                                                        });
                                                    });
                                                    it("answer was created", () => {
                                                        if (!answer) {
                                                            fail("Answer undefined");
                                                            return;
                                                        }
                                                        expect(answer.body).not.toBe("");
                                                        expect(answer.contentType).toBe("application/sdp");
                                                    });
                                                    it("answer has one a=inactive", () => {
                                                        if (!answer) {
                                                            fail("Answer undefined");
                                                            return;
                                                        }
                                                        expect(answer.body).toEqual(exactlyOneField("a=inactive"));
                                                    });
                                                    it("hasDescription should be true", () => {
                                                        expect(answer).not.toBe(undefined);
                                                        if (answer) {
                                                            expect(sdh1.hasDescription(answer.contentType)).toBe(true);
                                                        }
                                                    });
                                                    it("signaling state should be stable", () => {
                                                        var _a;
                                                        expect((_a = sdh1.peerConnection) === null || _a === void 0 ? void 0 : _a.signalingState).toBe("stable");
                                                    });
                                                    it("transceiver direction should be inactive", () => {
                                                        var _a;
                                                        const transceivers = (_a = sdh1.peerConnection) === null || _a === void 0 ? void 0 : _a.getTransceivers();
                                                        if (!transceivers) {
                                                            fail("Transceivers undefined");
                                                            return;
                                                        }
                                                        expect(transceivers.length).toBe(1);
                                                        expect(transceivers[0].direction).toBe("inactive");
                                                    });
                                                    it("local media stream state", () => {
                                                        expect(sdh1LocalOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                                        expect(sdh1LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                                    });
                                                    it("remote media stream state", () => {
                                                        expect(sdh1RemoteOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                                        expect(sdh1RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                                    });
                                                    describe("sdh2 setDescription", () => {
                                                        beforeEach(async () => {
                                                            resetSpies();
                                                            if (!answer) {
                                                                throw new Error("Answer undefined.");
                                                            }
                                                            return sdh2.setDescription(answer.body);
                                                        });
                                                        it("signaling state should be stable", () => {
                                                            var _a;
                                                            expect((_a = sdh2.peerConnection) === null || _a === void 0 ? void 0 : _a.signalingState).toBe("stable");
                                                        });
                                                        it("transceiver direction should be inactive", () => {
                                                            var _a;
                                                            const transceivers = (_a = sdh2.peerConnection) === null || _a === void 0 ? void 0 : _a.getTransceivers();
                                                            if (!transceivers) {
                                                                fail("Transceivers undefined");
                                                                return;
                                                            }
                                                            expect(transceivers.length).toBe(1);
                                                            expect(transceivers[0].direction).toBe("inactive");
                                                        });
                                                        it("local media stream state", () => {
                                                            expect(sdh2LocalOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                                            expect(sdh2LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                                        });
                                                        it("remote media stream state", () => {
                                                            expect(sdh2RemoteOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                                            expect(sdh2RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                                        });
                                                        describe("sdh2 getDescription - audio unhold", () => {
                                                            beforeEach(async () => {
                                                                resetSpies();
                                                                offer = undefined;
                                                                return sdh2
                                                                    .getDescription({
                                                                    constraints: {
                                                                        audio: true
                                                                    },
                                                                    hold: false
                                                                })
                                                                    .then((description) => {
                                                                    offer = description;
                                                                });
                                                            });
                                                            it("offer was created", () => {
                                                                if (!offer) {
                                                                    fail("Offer undefined");
                                                                    return;
                                                                }
                                                                expect(offer.body).not.toBe("");
                                                                expect(offer.contentType).toBe("application/sdp");
                                                            });
                                                            it("offer has one m=audio and zero m=video", () => {
                                                                if (!offer) {
                                                                    fail("Offer undefined");
                                                                    return;
                                                                }
                                                                expect(offer.body).toEqual(exactlyOneField("m=audio"));
                                                                expect(offer.body).toEqual(exactlyZeroField("m=video"));
                                                            });
                                                            it("offer has one a=recvonly", () => {
                                                                if (!offer) {
                                                                    fail("Offer undefined");
                                                                    return;
                                                                }
                                                                expect(offer.body).toEqual(exactlyOneField("a=recvonly"));
                                                            });
                                                            it("offer has at least one a=candidate", () => {
                                                                if (!offer) {
                                                                    fail("Offer undefined");
                                                                    return;
                                                                }
                                                                expect(offer.body).toEqual(atLeastOneField("a=candidate"));
                                                            });
                                                            it("transceiver direction should be recvonly", () => {
                                                                var _a;
                                                                const transceivers = (_a = sdh2.peerConnection) === null || _a === void 0 ? void 0 : _a.getTransceivers();
                                                                if (!transceivers) {
                                                                    fail("Transceivers undefined");
                                                                    return;
                                                                }
                                                                expect(transceivers.length).toBe(1);
                                                                expect(transceivers[0].direction).toBe("recvonly");
                                                            });
                                                            it("local media stream state", () => {
                                                                expect(sdh2LocalOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                                                expect(sdh2LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                                            });
                                                            it("remote media stream state", () => {
                                                                expect(sdh2RemoteOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                                                expect(sdh2RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                                            });
                                                            describe("sdh1 setDescription", () => {
                                                                beforeEach(async () => {
                                                                    resetSpies();
                                                                    if (!offer) {
                                                                        throw new Error("Offer undefined.");
                                                                    }
                                                                    return sdh1.setDescription(offer.body);
                                                                });
                                                                it("signaling state have-remote-offer", () => {
                                                                    var _a;
                                                                    expect((_a = sdh1.peerConnection) === null || _a === void 0 ? void 0 : _a.signalingState).toBe("have-remote-offer");
                                                                });
                                                                it("local media stream state", () => {
                                                                    expect(sdh1LocalOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                                                    expect(sdh1LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                                                });
                                                                it("remote media stream state", () => {
                                                                    expect(sdh1RemoteOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                                                    expect(sdh1RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                                                });
                                                                describe("sdh1 getDescription", () => {
                                                                    beforeEach(async () => {
                                                                        resetSpies();
                                                                        answer = undefined;
                                                                        return sdh1.getDescription().then((description) => {
                                                                            answer = description;
                                                                        });
                                                                    });
                                                                    it("answer was created", () => {
                                                                        if (!answer) {
                                                                            fail("Answer undefined");
                                                                            return;
                                                                        }
                                                                        expect(answer.body).not.toBe("");
                                                                        expect(answer.contentType).toBe("application/sdp");
                                                                    });
                                                                    it("answer has one a=sendonly", () => {
                                                                        if (!answer) {
                                                                            fail("Answer undefined");
                                                                            return;
                                                                        }
                                                                        expect(answer.body).toEqual(exactlyOneField("a=sendonly"));
                                                                    });
                                                                    it("hasDescription should be true", () => {
                                                                        expect(answer).not.toBe(undefined);
                                                                        if (answer) {
                                                                            expect(sdh1.hasDescription(answer.contentType)).toBe(true);
                                                                        }
                                                                    });
                                                                    it("signaling state should be stable", () => {
                                                                        var _a;
                                                                        expect((_a = sdh1.peerConnection) === null || _a === void 0 ? void 0 : _a.signalingState).toBe("stable");
                                                                    });
                                                                    it("transceiver direction should be sendonly", () => {
                                                                        var _a;
                                                                        const transceivers = (_a = sdh1.peerConnection) === null || _a === void 0 ? void 0 : _a.getTransceivers();
                                                                        if (!transceivers) {
                                                                            fail("Transceivers undefined");
                                                                            return;
                                                                        }
                                                                        expect(transceivers.length).toBe(1);
                                                                        expect(transceivers[0].direction).toBe("sendonly");
                                                                    });
                                                                    it("local media stream state", () => {
                                                                        expect(sdh1LocalOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                                                        expect(sdh1LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                                                    });
                                                                    it("remote media stream state", () => {
                                                                        expect(sdh1RemoteOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                                                        expect(sdh1RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                                                    });
                                                                    describe("sdh2 setDescription", () => {
                                                                        beforeEach(async () => {
                                                                            resetSpies();
                                                                            if (!answer) {
                                                                                throw new Error("Answer undefined.");
                                                                            }
                                                                            return sdh2.setDescription(answer.body);
                                                                        });
                                                                        it("signaling state should be stable", () => {
                                                                            var _a;
                                                                            expect((_a = sdh2.peerConnection) === null || _a === void 0 ? void 0 : _a.signalingState).toBe("stable");
                                                                        });
                                                                        it("transceiver direction should be recvonly", () => {
                                                                            var _a;
                                                                            const transceivers = (_a = sdh2.peerConnection) === null || _a === void 0 ? void 0 : _a.getTransceivers();
                                                                            if (!transceivers) {
                                                                                fail("Transceivers undefined");
                                                                                return;
                                                                            }
                                                                            expect(transceivers.length).toBe(1);
                                                                            expect(transceivers[0].direction).toBe("recvonly");
                                                                        });
                                                                        it("local media stream state", () => {
                                                                            expect(sdh2LocalOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                                                            expect(sdh2LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                                                        });
                                                                        it("remote media stream state", () => {
                                                                            expect(sdh2RemoteOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                                                            expect(sdh2RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                                                        });
                                                                    });
                                                                });
                                                            });
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                        describe("sdh1 getDescription - video (upgrade)", () => {
                            beforeEach(async () => {
                                resetSpies();
                                offer = undefined;
                                return sdh1
                                    .getDescription({
                                    constraints: {
                                        video: true
                                    }
                                })
                                    .then((description) => {
                                    offer = description;
                                });
                            });
                            it("offer was created", () => {
                                if (!offer) {
                                    fail("Offer undefined");
                                    return;
                                }
                                expect(offer.body).not.toBe("");
                                expect(offer.contentType).toBe("application/sdp");
                            });
                            it("offer has one m=audio and one m=video", () => {
                                if (!offer) {
                                    fail("Offer undefined");
                                    return;
                                }
                                expect(offer.body).toEqual(exactlyOneField("m=audio"));
                                expect(offer.body).toEqual(exactlyOneField("m=video"));
                            });
                            it("offer has two a=sendrecv", () => {
                                if (!offer) {
                                    fail("Offer undefined");
                                    return;
                                }
                                expect(offer.body).toEqual(exactlyTwoField("a=sendrecv"));
                            });
                            it("offer has at least one a=candidate", () => {
                                if (!offer) {
                                    fail("Offer undefined");
                                    return;
                                }
                                expect(offer.body).toEqual(atLeastOneField("a=candidate"));
                            });
                            it("transceiver direction should be sendrecv", () => {
                                var _a;
                                const transceivers = (_a = sdh1.peerConnection) === null || _a === void 0 ? void 0 : _a.getTransceivers();
                                if (!transceivers) {
                                    fail("Transceivers undefined");
                                    return;
                                }
                                expect(transceivers.length).toBe(2);
                                expect(transceivers[0].direction).toBe("sendrecv");
                                expect(transceivers[1].direction).toBe("sendrecv");
                            });
                            it("local media stream state", () => {
                                expect(sdh1LocalOnAddTrackSpy).toHaveBeenCalledTimes(2);
                                expect(sdh1LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(1);
                            });
                            it("remote media stream state", () => {
                                expect(sdh1RemoteOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                expect(sdh1RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                            });
                            describe("sdh2 setDescription", () => {
                                beforeEach(async () => {
                                    resetSpies();
                                    if (!offer) {
                                        throw new Error("Offer undefined.");
                                    }
                                    return sdh2.setDescription(offer.body);
                                });
                                it("signaling state have-remote-offer", () => {
                                    var _a;
                                    expect((_a = sdh2.peerConnection) === null || _a === void 0 ? void 0 : _a.signalingState).toBe("have-remote-offer");
                                });
                                it("local media stream state", () => {
                                    expect(sdh2LocalOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                    expect(sdh2LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                });
                                it("remote media stream state", () => {
                                    expect(sdh2RemoteOnAddTrackSpy).toHaveBeenCalledTimes(1);
                                    expect(sdh2RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                });
                                describe("sdh2 getDescription - video", () => {
                                    beforeEach(async () => {
                                        resetSpies();
                                        answer = undefined;
                                        return sdh2
                                            .getDescription({
                                            constraints: {
                                                video: true
                                            }
                                        })
                                            .then((description) => {
                                            answer = description;
                                        });
                                    });
                                    it("answer was created", () => {
                                        if (!answer) {
                                            fail("Answer undefined");
                                            return;
                                        }
                                        expect(answer.body).not.toBe("");
                                        expect(answer.contentType).toBe("application/sdp");
                                    });
                                    it("answer has one m=audio and one m=video", () => {
                                        if (!answer) {
                                            fail("Answer undefined");
                                            return;
                                        }
                                        expect(answer.body).toEqual(exactlyOneField("m=audio"));
                                        expect(answer.body).toEqual(exactlyOneField("m=video"));
                                    });
                                    it("answer has two a=sendrecv", () => {
                                        if (!answer) {
                                            fail("Answer undefined");
                                            return;
                                        }
                                        expect(answer.body).toEqual(exactlyTwoField("a=sendrecv"));
                                    });
                                    it("answer has at least one a=candidate", () => {
                                        if (!answer) {
                                            fail("Answer undefined");
                                            return;
                                        }
                                        expect(answer.body).toEqual(atLeastOneField("a=candidate"));
                                    });
                                    it("hasDescription should be true", () => {
                                        expect(answer).not.toBe(undefined);
                                        if (answer) {
                                            expect(sdh2.hasDescription(answer.contentType)).toBe(true);
                                        }
                                    });
                                    it("signaling state should be stable", () => {
                                        var _a;
                                        expect((_a = sdh2.peerConnection) === null || _a === void 0 ? void 0 : _a.signalingState).toBe("stable");
                                    });
                                    it("transceiver direction should be sendrecv", () => {
                                        var _a;
                                        const transceivers = (_a = sdh2.peerConnection) === null || _a === void 0 ? void 0 : _a.getTransceivers();
                                        if (!transceivers) {
                                            fail("Transceivers undefined");
                                            return;
                                        }
                                        expect(transceivers.length).toBe(2);
                                        expect(transceivers[0].direction).toBe("sendrecv");
                                        expect(transceivers[1].direction).toBe("sendrecv");
                                    });
                                    it("local media stream state", () => {
                                        expect(sdh2LocalOnAddTrackSpy).toHaveBeenCalledTimes(2);
                                        expect(sdh2LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(1);
                                    });
                                    it("remote media stream state", () => {
                                        expect(sdh2RemoteOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                        expect(sdh2RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                    });
                                    describe("sdh1 setDescription", () => {
                                        beforeEach(async () => {
                                            resetSpies();
                                            if (!answer) {
                                                throw new Error("Answer undefined.");
                                            }
                                            return sdh1.setDescription(answer.body);
                                        });
                                        it("signaling state should be stable", () => {
                                            var _a;
                                            expect((_a = sdh1.peerConnection) === null || _a === void 0 ? void 0 : _a.signalingState).toBe("stable");
                                        });
                                        it("transceiver direction should be sendrecv", () => {
                                            var _a;
                                            const transceivers = (_a = sdh1.peerConnection) === null || _a === void 0 ? void 0 : _a.getTransceivers();
                                            if (!transceivers) {
                                                fail("Transceivers undefined");
                                                return;
                                            }
                                            expect(transceivers.length).toBe(2);
                                            expect(transceivers[0].direction).toBe("sendrecv");
                                            expect(transceivers[1].direction).toBe("sendrecv");
                                        });
                                        it("local media stream state", () => {
                                            expect(sdh1LocalOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                            expect(sdh1LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                        });
                                        it("remote media stream state", () => {
                                            expect(sdh1RemoteOnAddTrackSpy).toHaveBeenCalledTimes(1);
                                            expect(sdh1RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                        });
                                        describe("sdh1 getDescription - video with ice restart", () => {
                                            beforeEach(async () => {
                                                resetSpies();
                                                offer = undefined;
                                                return sdh1
                                                    .getDescription({
                                                    constraints: {
                                                        video: true
                                                    },
                                                    offerOptions: {
                                                        iceRestart: true
                                                    }
                                                })
                                                    .then((description) => {
                                                    offer = description;
                                                });
                                            });
                                            it("offer was created", () => {
                                                if (!offer) {
                                                    fail("Offer undefined");
                                                    return;
                                                }
                                                expect(offer.body).not.toBe("");
                                                expect(offer.contentType).toBe("application/sdp");
                                            });
                                            it("offer has one m=audio and one m=video", () => {
                                                if (!offer) {
                                                    fail("Offer undefined");
                                                    return;
                                                }
                                                expect(offer.body).toEqual(exactlyOneField("m=audio"));
                                                expect(offer.body).toEqual(exactlyOneField("m=video"));
                                            });
                                            it("offer has at least one a=candidate", () => {
                                                if (!offer) {
                                                    fail("Offer undefined");
                                                    return;
                                                }
                                                expect(offer.body).toEqual(atLeastOneField("a=candidate"));
                                            });
                                            it("local media stream state", () => {
                                                expect(sdh1LocalOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                                expect(sdh1LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                            });
                                            it("remote media stream state", () => {
                                                expect(sdh1RemoteOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                                expect(sdh1RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                            });
                                        });
                                        describe("sdh1 getDescription - video with constraints change", () => {
                                            beforeEach(async () => {
                                                resetSpies();
                                                offer = undefined;
                                                return sdh1
                                                    .getDescription({
                                                    constraints: {
                                                        video: {
                                                            aspectRatio: 1.77
                                                        }
                                                    }
                                                })
                                                    .then((description) => {
                                                    offer = description;
                                                });
                                            });
                                            it("offer was created", () => {
                                                if (!offer) {
                                                    fail("Offer undefined");
                                                    return;
                                                }
                                                expect(offer.body).not.toBe("");
                                                expect(offer.contentType).toBe("application/sdp");
                                            });
                                            it("offer has one m=audio and one m=video", () => {
                                                if (!offer) {
                                                    fail("Offer undefined");
                                                    return;
                                                }
                                                expect(offer.body).toEqual(exactlyOneField("m=audio"));
                                                expect(offer.body).toEqual(exactlyOneField("m=video"));
                                            });
                                            it("offer has at least one a=candidate", () => {
                                                if (!offer) {
                                                    fail("Offer undefined");
                                                    return;
                                                }
                                                expect(offer.body).toEqual(atLeastOneField("a=candidate"));
                                            });
                                            it("local media stream state", () => {
                                                expect(sdh1LocalOnAddTrackSpy).toHaveBeenCalledTimes(2);
                                                expect(sdh1LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(2);
                                            });
                                            it("remote media stream state", () => {
                                                expect(sdh1RemoteOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                                expect(sdh1RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                            });
                                        });
                                        describe("sdh1 getDescription - video (no change)", () => {
                                            beforeEach(async () => {
                                                resetSpies();
                                                offer = undefined;
                                                return sdh1
                                                    .getDescription({
                                                    constraints: {
                                                        audio: true,
                                                        video: true
                                                    }
                                                })
                                                    .then((description) => {
                                                    offer = description;
                                                });
                                            });
                                            it("offer was created", () => {
                                                if (!offer) {
                                                    fail("Offer undefined");
                                                    return;
                                                }
                                                expect(offer.body).not.toBe("");
                                                expect(offer.contentType).toBe("application/sdp");
                                            });
                                            it("offer has one m=audio and one m=video", () => {
                                                if (!offer) {
                                                    fail("Offer undefined");
                                                    return;
                                                }
                                                expect(offer.body).toEqual(exactlyOneField("m=audio"));
                                                expect(offer.body).toEqual(exactlyOneField("m=video"));
                                            });
                                            it("offer has at least one a=candidate", () => {
                                                if (!offer) {
                                                    fail("Offer undefined");
                                                    return;
                                                }
                                                expect(offer.body).toEqual(atLeastOneField("a=candidate"));
                                            });
                                            it("local media stream state", () => {
                                                expect(sdh1LocalOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                                expect(sdh1LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                            });
                                            it("remote media stream state", () => {
                                                expect(sdh1RemoteOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                                expect(sdh1RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                            });
                                            describe("sdh2 setDescription", () => {
                                                beforeEach(async () => {
                                                    resetSpies();
                                                    if (!offer) {
                                                        throw new Error("Offer undefined.");
                                                    }
                                                    return sdh2.setDescription(offer.body);
                                                });
                                                it("signaling state have-remote-offer", () => {
                                                    var _a;
                                                    expect((_a = sdh2.peerConnection) === null || _a === void 0 ? void 0 : _a.signalingState).toBe("have-remote-offer");
                                                });
                                                it("local media stream state", () => {
                                                    expect(sdh2LocalOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                                    expect(sdh2LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                                });
                                                it("remote media stream state", () => {
                                                    expect(sdh2RemoteOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                                    expect(sdh2RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                                });
                                                describe("sdh2 getDescription", () => {
                                                    beforeEach(async () => {
                                                        resetSpies();
                                                        answer = undefined;
                                                        return sdh2.getDescription().then((description) => {
                                                            answer = description;
                                                        });
                                                    });
                                                    it("answer was created", () => {
                                                        if (!answer) {
                                                            fail("Answer undefined");
                                                            return;
                                                        }
                                                        expect(answer.body).not.toBe("");
                                                        expect(answer.contentType).toBe("application/sdp");
                                                    });
                                                    it("answer has one m=audio and one m=video", () => {
                                                        if (!answer) {
                                                            fail("Answer undefined");
                                                            return;
                                                        }
                                                        expect(answer.body).toEqual(exactlyOneField("m=audio"));
                                                        expect(answer.body).toEqual(exactlyOneField("m=video"));
                                                    });
                                                    it("answer has at least one a=candidate", () => {
                                                        if (!answer) {
                                                            fail("Answer undefined");
                                                            return;
                                                        }
                                                        expect(answer.body).toEqual(atLeastOneField("a=candidate"));
                                                    });
                                                    it("hasDescription should be true", () => {
                                                        expect(answer).not.toBe(undefined);
                                                        if (answer) {
                                                            expect(sdh2.hasDescription(answer.contentType)).toBe(true);
                                                        }
                                                    });
                                                    it("signaling state should be stable", () => {
                                                        var _a;
                                                        expect((_a = sdh2.peerConnection) === null || _a === void 0 ? void 0 : _a.signalingState).toBe("stable");
                                                    });
                                                    it("local media stream state", () => {
                                                        expect(sdh2LocalOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                                        expect(sdh2LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                                    });
                                                    it("remote media stream state", () => {
                                                        expect(sdh2RemoteOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                                        expect(sdh2RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                                    });
                                                    describe("sdh1 setDescription", () => {
                                                        beforeEach(async () => {
                                                            resetSpies();
                                                            if (!answer) {
                                                                throw new Error("Answer undefined.");
                                                            }
                                                            return sdh1.setDescription(answer.body);
                                                        });
                                                        it("signaling state should be stable", () => {
                                                            var _a;
                                                            expect((_a = sdh1.peerConnection) === null || _a === void 0 ? void 0 : _a.signalingState).toBe("stable");
                                                        });
                                                        it("local media stream state", () => {
                                                            expect(sdh1LocalOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                                            expect(sdh1LocalOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                                        });
                                                        it("remote media stream state", () => {
                                                            expect(sdh1RemoteOnAddTrackSpy).toHaveBeenCalledTimes(0);
                                                            expect(sdh1RemoteOnRemoveTrackSpy).toHaveBeenCalledTimes(0);
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                        describe("sdh1 sendDtmf", () => {
                            let result = false;
                            beforeEach(() => {
                                result = sdh1.sendDtmf("1");
                            });
                            it("dtmf should send", () => {
                                expect(result).toBe(true);
                            });
                            it("signaling state should be stable", () => {
                                var _a;
                                expect((_a = sdh1.peerConnection) === null || _a === void 0 ? void 0 : _a.signalingState).toBe("stable");
                            });
                        });
                    });
                });
            });
        });
    });
});
