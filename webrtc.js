const ari = require('ari-client');
const WebSocket = require('websocket').w3cwebsocket;

// Conexión a Asterisk ARI (Asterisk REST Interface)
ari.connect('http://asterisk.ccpml.com:8089', 'User1', '1234', (err, client) => {
  if (err) {
    console.error('Error al conectarse a Asterisk ARI:', err);
    return;
  }else{
    console.log( "Connected" );
  }
  client.start('myApp');

  // Conexión WebSocket para la señalización
  const socket = new WebSocket('ws://asterisk.ccpml.com:8089/ws');

  socket.onopen = () => {
    console.log('Conexión WebSocket establecida');
    // Implementa la lógica de señalización aquí, como la creación de ofertas SDP.
    // Envía la oferta SDP al servidor Asterisk a través del WebSocket.

    // Ejemplo:
    const sdpOffer = '...'; // Obtén la oferta SDP de la señalización.

    // Configura la lógica para contestar la llamada en Asterisk y establecer la oferta SDP
    client.channels.originate({
      endpoint: '777',
      app: 'myApp',
      appArgs: 'sdpOffer=' + sdpOffer,
    }, (err, channel) => {
      if (err) {
        console.error('Error al originar la llamada:', err);
        return;
      }

      channel.on('ChannelDtmfReceived', (event, channel) => {
        // Implementa la lógica para manejar los DTMF (tonos) recibidos, si es necesario.
      });
    });
  };

  socket.onmessage = (message) => {
    // Maneja los mensajes recibidos del servidor Asterisk a través del WebSocket.
    // Esto podría incluir respuestas SDP, candidatos ICE, etc.
  };

  socket.onclose = () => {
    console.log('Conexión WebSocket cerrada');
  };
});


