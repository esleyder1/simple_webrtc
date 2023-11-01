import { fileURLToPath } from 'url';
import { dirname } from 'path';
import express from 'express';
import JsSIP from 'jssip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Configuración de JsSIP
const configuration = {
  uri: 'sip:User1@asterisk.ccpml.com',
  password: '1234',
  sockets: [new JsSIP.WebSocketInterface('wss://asterisk.ccpml.com:8089/ws')],
};

const ua = new JsSIP.UA(configuration);

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: __dirname });
});

app.post('/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
  
    // Aquí puedes validar el nombre de usuario y la contraseña
    // y luego iniciar sesión con JsSIP si son correctos
  
    if (username === 'User1' && password === '1234') {
      ua.start();
      res.send('Iniciaste sesión correctamente');
    } else {
      res.send('Nombre de usuario o contraseña incorrectos');
    }
  });
  

app.listen(3000, () => {
  console.log('Servidor Express escuchando en el puerto 3000');
  ua.start();
});