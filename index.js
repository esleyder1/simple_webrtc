import { Inviter, SessionState, UserAgent } from "sip.js";

// Create user agent instance (caller)
const userAgent = new UserAgent({
  uri: UserAgent.makeURI("sip:User1@asterisk.ccpml.com"),
  transportOptions: {
    server: "wss://asterisk.ccpml.com:8089/ws"
  },
});

// Connect the user agent
userAgent.start().then(() => {

  // Set target destination (callee)
  const target = UserAgent.makeURI("sip:777@asterisk.ccpml.com");
  if (!target) {
    throw new Error("Failed to create target URI.");
  }

  // Create a user agent client to establish a session
  const inviter = new Inviter(userAgent, target, {
    sessionDescriptionHandlerOptions: {
      constraints: { audio: true, video: false }
    }
  });

  // Handle outgoing session state changes
  inviter.stateChange.addListener((newState) => {
    switch (newState) {
      case SessionState.Establishing:
        // Session is establishing
        break;
      case SessionState.Established:
        // Session has been established
        break;
      case SessionState.Terminated:
        // Session has terminated
        break;
      default:
        break;
    }
  });

  // Send initial INVITE request
  inviter.invite()
    .then(() => {
      // INVITE sent
    })
    .catch((error) => {
      // INVITE did not send
      console.log(error);
    });

});
