const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mysql = require("mysql");
const app = express();

//Configuración
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
const dbConfig = {
  host: "10.50.1.34",
  user: "mecatronicos",
  password: "mysqlpr0t3l4",
  database: "protela_data_cuatro_puntos",
};


function coneccionMapeo(id_rolloAsignado, tamTela, cadenaMapeoCod, anchoTela){



const connectionMapeo = mysql.createConnection(dbConfig);

connectionMapeo.connect((err) => {
  if (err) {
    console.error("Error al conectar a la base de datos: " + err.message);
    return;
  }

  // Construimos la consulta SQL para insertar en la tabla mapeo
  const sql = `INSERT INTO mapeo (id_rollo_asignado, longiud_tela, errores, ancho_tela) VALUES (?,?,?,?)`;
  const values = [id_rolloAsignado, tamTela, cadenaMapeoCod, anchoTela];

  connectionMapeo.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error en la consulta: " + err.message);
      return;
    }

    // Cerrar la conexión a la base de datos
    connectionMapeo.end((err) => {
      if (err) {
        console.error("Error al cerrar la conexión: " + err.message);
      } else {
        console.log("Conexión a la base de datos cerrada correctamente");
      }
    });
  });
});
}


module.exports = coneccionMapeo;
