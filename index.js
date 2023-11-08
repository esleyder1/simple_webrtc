document.addEventListener("DOMContentLoaded", () => {

  let configuration = null;    
  document.getElementById("loginButton").addEventListener("click", function () {
    var sipUsername = document.getElementById("sipUsername").value;
    var sipPassword = document.getElementById("sipPassword").value;



    // Initialize WebSocket
    const socket = new JsSIP.WebSocketInterface(
      "wss://asterisk.ccpml.com:8089/ws"
    );

    // Configuration with SIP credentials
    configuration = {
      sockets: [socket],
      uri: "sip:" + sipUsername + "@asterisk.ccpml.com",
      password: sipPassword,
    };

    console.log("conf",configuration);
    connectToWS(configuration);
  });


  var incomingCallAudio = new window.Audio("ringtone.mp3");
  incomingCallAudio.loop = true;
  var remoteAudio = new window.Audio();
  remoteAudio.autoplay = true;

  var localView = document.getElementById("localFeed");
  var remoteView = document.getElementById("remoteFeed");

  window.oSipAudio = document.createElement("audio");

  var callOptions = {
    mediaConstraints: {
      audio: true,
      video: true,
    },
    rtcOfferConstraints: {
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    },
    pcConfig: {
      iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
      iceTransportPolicy: "all",
    },
  };

  var phone;
  var session;


  function addStreams() {
    session.connection.addEventListener("addstream", function (streamEvent) {
      console.log("addstreams", streamEvent);
      incomingCallAudio.pause();

      //attach remote stream to remoteView
      remoteAudio.srcObject = streamEvent.stream;

      // Attach local stream to selfView
      const peerconnection = session.connection;
      console.log(
        "addstream peerconnection local and remote stream counts ",
        peerconnection.getLocalStreams.length,
        peerconnection.getRemoteStreams.length
      );
      localView.srcObject = peerconnection.getLocalStreams()[0];
      remoteView.srcObject = peerconnection.getRemoteStreams()[0];
    });
  }

  function connectToWS(configuration) {
    if (configuration && configuration.uri && configuration.password) {


      console.log("connect to sip server ", configuration);
      JsSIP.debug.enable("JsSIP:*"); // more detailed debug output
      phone = new JsSIP.UA(configuration);

      // WebSocket connection events
      phone.on("connecting", function (ev) {
        console.log("socket is connecting", ev);
        status("socket is connecting", ev)
      });
      phone.on("connected", function (ev) {
        console.log("socket is connected", ev);
        status("socket is connected", ev)
      });
      phone.on("disconnected", function (ev) {
        console.log("socket is disconnected", ev);
        status("socket is disconnected", ev)
      });

      // SIP registration events
      phone.on("unregistered", function (ev) {
        console.log("device is unregistered now", ev);
        status("device is unregistered now", ev)
        showLogin()
        document.getElementById("status").innerText = ""
        document.getElementById("callControl").style.display = "none"
      });
      phone.on("registered", function (ev) {
        console.log("device is registered now", ev);
        status("device is registered now", ev)
        status(configuration.uri)
        hideLogin()
        document.getElementById("callControl").style.display = "block"
      });
      phone.on("registrationFailed", function (ev) {
        alert("Registering on SIP server failed with error: " + ev.cause);
        status("Registering on SIP server failed with error", ev.cause)
        configuration.uri = null;
        configuration.password = null;
        updateUI();
      });
      phone.on("newMessage", function (ev) {});
      phone.on("newRTCSession", function (ev) {
        console.log("new session establishing ...", ev);
        status("new session establishing ...", ev)
        
        
        //ev.request.call_id
        var newSession = ev.session;
        if (session) {
          // hangup any existing call
          session.terminate();
        }
        session = newSession;
        if (ev.originator === "local") {
          console.trace(ev.request + " outgoing session");
          status("outgoing session")
        } else {
          console.trace(ev.request + " incoming session answering a call");
          status("incoming session answering a call")
        }
        // session handlers/callbacks
        var completeSession = function () {
          session = null;
          updateUI();
        };
        session.on("peerconnection", (e) => {
          console.log("peerconnection", e);
          status("peerconnection", e)
        });
        session.on("connecting", (e) => {
          console.log("connecting", e);
          status("connecting", e)
        });
        session.on("process", (e) => {
          console.log("process", e);
          status("process", e)
        });
        session.on("ended", (e) => {
          console.log("call ended");
          status("call ended")
          // need a way to show on UI
          completeSession();
        });
        session.on("failed", (e) => {
          console.log("session failed");
          status("session failed")
          completeSession();
        });
        session.on("accepted", (e) => {
          // when 2xx received
          console.log("session accepted by", e.originator);
          status("session accepted by", e.originator)
          updateUI();
        });
        session.on("confirmed", function (e) {
          //when ACK received or sent
          console.log("confirmed by", e.originator);
          status("confirmed by", e.originator)
          // count the local and remote streams
          const localStreams = session.connection.getLocalStreams();
          console.log(
            "confirmed with a number of local streams",
            localStreams.length
          );
          status("confirmed with a number of local streams",
          localStreams.length)

          const remoteStreams = session.connection.getRemoteStreams();
          console.log(
            "confirmed with a number of remote streams",
            remoteStreams.length
          );
          status("confirmed with a number of remote streams",
          remoteStreams.length)

          var localStream = localStreams[0];
          var dtmfSender = session.connection.createDTMFSender(
            localStream.getAudioTracks()[0]
          );
          session.sendDTMF = function (tone) {
            dtmfSender.insertDTMF(tone);
          };

          updateUI();
        });
        if (session.direction === "incoming") {
          console.log("incoming session direction");
          status("incoming session direction")
          incomingCallAudio.play();
        }
        updateUI();
      });
      phone.start();
    }
  }



  document.getElementById("connectCall").addEventListener("click", () => {
    const dest = document.getElementById("toField").value;
    phone.call(dest, callOptions);
    updateUI();
    addStreams();
  });

  // document.getElementById('initVideo').addEventListener('click', (e) => {
  //   // Descomenta para probar la cámara local
  //   // init(e);
  // });

  async function init(e) {
    const constraints = {
      audio: false,
      video: true,
    };
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      //const video = document.querySelector('video');
      const video = localView;
      const videoTracks = stream.getVideoTracks();
      console.log("Got stream with constraints:", constraints);
      console.log(`Using video device: ${videoTracks[0].label}`);
      window.stream = stream; // Hace la variable disponible en la consola del navegador
      video.srcObject = stream;

      e.target.disabled = true;
    } catch (ex) {
      console.log("getUserMedia exception", ex);
      alert("getUserMedia exception");
    }
  }

  document.getElementById("answer").addEventListener("click", () => {
    session.answer(callOptions);
    addStreams();
  });

  const hangup = () => {
    session.terminate();
  };

  document.getElementById("hangUp").addEventListener("click", hangup);
  document.getElementById("reject").addEventListener("click", hangup);

  document.getElementById("mute").addEventListener("click", () => {
    console.log("MUTE CLICKED");
    status("MUTE CLICKED")
    if (session.isMuted().audio) {
      session.unmute({
        audio: true,
      });
    } else {
      session.mute({
        audio: true,
      });
    }
    updateUI();
  });

  document.getElementById("btnHoldUnhold").addEventListener("click", () => {
    console.log("status ================>",session.isOnHold().local)
    if (!session.isOnHold().local) {

      session.hold()
      status("Hold")
      document.getElementById("btnHoldUnhold").innerText = "Quitar de espera"
      document.getElementById("btnHoldUnhold").style.backgroundColor = "#32CD32"
    } else {
      session.unhold()
      status("unHold")
      document.getElementById("btnHoldUnhold").innerText = "Poner en espera"
      document.getElementById("btnHoldUnhold").style.backgroundColor = "#4285F4"


    }
    updateUI();
  });

  document.getElementById("toField").addEventListener("keypress", (e) => {
    if (e.which === 13) {
      // Enter
      document.getElementById("connectCall").click();
    }
  });

  document.getElementById("inCallButtons").addEventListener("click", (e) => {
    if (e.target.classList.contains("dialpad-char")) {
      const value = e.target.getAttribute("data-value");
      session.sendDTMF(value.toString());
    }
  });

  function showLogin(){
    document.getElementById("loginForm").style.display = "block";
    document.getElementById("wrapper").style.display = "none";
  }
  function hideLogin(){
    document.getElementById("loginForm").style.display = "none";
    document.getElementById("wrapper").style.display = "block";
  }

  function status(message, ev){
    document.getElementById("status").innerText = message, ev
  }

  function updateUI() {
    console.log("CONFIGURACION =================>",configuration);
    if (configuration && configuration.uri && configuration.password) {
      document.getElementById("wrapLogin").style.display = "none";
      document.getElementById("wrapper").style.display = "block";
      if (session) {
        console.log("valid session");
        if (session.isInProgress()) {
          if (session.direction === "incoming") {
            console.log("inbound call");
            status("inbound call")
            document.getElementById("incomingCallNumber").innerHTML =
              session.remote_identity.uri;
            document.getElementById("incomingCall").style.display = "block";
            document.getElementById("callControl").style.display = "none";
            document.getElementById("incomingCall").style.display = "block";
          } else {
            document.getElementById("callInfoText").innerHTML = "Ringing...";
            document.getElementById("callInfoNumber").innerHTML =
              session.remote_identity.uri.user;
            document.getElementById("callStatus").style.display = "block";
          }
        } else if (session.isEstablished()) {
          console.log("session is established.");
          document.getElementById("callStatus").style.display = "block";
          document.getElementById("incomingCall").style.display = "none";
          document.getElementById("callInfoText").innerHTML = "In Call";
          document.getElementById("callInfoNumber").innerHTML =
            session.remote_identity.uri.user;
          document.getElementById("inCallButtons").style.display = "block";
          incomingCallAudio.pause();
        }
        document.getElementById("callControl").style.display = "none";
      } else {
        document.getElementById("incomingCall").style.display = "none";
        document.getElementById("callControl").style.display = "block";
        document.getElementById("callStatus").style.display = "none";
        document.getElementById("inCallButtons").style.display = "none";
        incomingCallAudio.pause();
      }
      // Icono de micrófono silenciado
      if (session && session.isMuted().audio) {
        document
          .getElementById("muteIcon")
          .classList.add("fa-microphone-slash");
        document.getElementById("muteIcon").classList.remove("fa-microphone");
      } else {
        document
          .getElementById("muteIcon")
          .classList.remove("fa-microphone-slash");
        document.getElementById("muteIcon").classList.add("fa-microphone");
      }
    } else {
      document.getElementById("wrapper").style.display = "none";
      document.getElementById("wrapLogin").style.display = "block";
    }
  }
});
