const express = require('express')
var cors = require('cors')
const bodyParser = require('body-parser')
const path = require('path');
const app = express()
require('dotenv').config(); 
const fileUpload = require('express-fileupload');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

var corsOptions = {
    origin: 'http://localhost:5173',
}
app.use(cors(corsOptions))

app.use(express.static('public'));

app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
}));


app.use('/public', express.static(path.join(__dirname, 'public')));

const db = require('./models');

db.sequelize.sync({
 //force: true // drop tables and recreate
}).then(() => {
    console.log("db resync");
});

// middleware para validación de errores en JSON
app.use(function (error, req, res, next) {
    if (error instanceof SyntaxError) {
        res.status(400).json({
            msg: 'Error en el JSON'
        });
    } else {
        next();
    }
});

//require('./routes')(app);

app.listen(3000, function () {
    console.log('Ingrese a http://localhost:3000')
})