const JsSip = require('jssip');

class JsSipWrapper {
  constructor(configuration) {
    this.ua = new JsSip.UA(configuration);

    // Manejadores de eventos
    this.ua.on('connecting', () => {
      console.log('Conectando...');
    });

    this.ua.on('connected', () => {
      console.log('Conexión establecida');
    });

    this.ua.on('disconnected', () => {
      console.log('Conexión cerrada o perdida');
    });

    this.ua.on('registered', () => {
      console.log('Usuario registrado');
    });

    this.ua.on('unregistered', () => {
      console.log('Usuario desregistrado');
    });

    this.ua.on('newRTCSession', (e) => {
      const session = e.session;
      console.log('Nueva sesión WebRTC:', session);
    });

    this.ua.on('newMessage', (e) => {
      const message = e.message;
      console.log('Nuevo mensaje SIP:', message);
    });

    this.ua.on('userMediaRequest', () => {
      console.log('Solicitando acceso a dispositivos de medios del usuario');
    });

    this.ua.on('userMedia', () => {
      console.log('Acceso a dispositivos de medios concedido');
    });

    this.ua.on('iceConnection', () => {
      console.log('Estableciendo conexión ICE...');
    });

    this.ua.on('iceConnectionClosed', () => {
      console.log('Conexión ICE cerrada');
    });
  }

  connect() {
    this.ua.start();
  }

  disconnect() {
    this.ua.stop();
  }

  register() {
    this.ua.register();
  }

  unregister() {
    this.ua.unregister();
  }

  call(target, mediaOptions) {
    const session = this.ua.call(target, mediaOptions);
    return session;
  }

  answer(session, options) {
    session.answer(options);
  }

  hangup(session, options) {
    session.terminate(options);
  }

  hold(session) {
    session.hold();
  }

  unhold(session) {
    session.unhold();
  }

  mute(session) {
    session.mute();
  }

  unmute(session) {
    session.unmute();
  }

  sendMessage(target, body, options) {
    const message = this.ua.sendMessage(target, body, options);
    return message;
  }
}

// Uso de la clase JsSip
const jssipConfig = {
  uri: 'sip:100@asterisk.ccpml.com',
  password: '100',
  display_name: 'Agent 1',
  sockets: [new JsSip.WebSocketInterface('wss://asterisk.ccpml.com:8089/ws')],
};

const jssip = new JsSipWrapper(jssipConfig);

jssip.connect();
jssip.register();


