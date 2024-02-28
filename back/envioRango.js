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

function envioRango(rangosVer, id_rolloAsignado) {
  const cadenaRangosVer = JSON.stringify(rangosVer); // Convertimos el JSON a cadena para almacenarlo en la base de datos

  // realizamos la segunda coneccion a la BD para enviar los rangos de corte
  const connection2 = mysql.createConnection(dbConfig);

  connection2.connect((err) => {
    if (err) {
      console.error("Error al conectar a la base de datos: " + err.message);
      return;
    }

    // Construimos la consulta SQL para insertar en la tabla rangos_de_corte
    const sql2 = `INSERT INTO rangos_de_corte (id_rollo_asignado, rangos) VALUES (?,?)`;
    const values2 = [id_rolloAsignado, cadenaRangosVer];

    connection2.query(sql2, values2, (err, result) => {
      if (err) {
        console.error("Error en la consulta: " + err.message);
        return;
      }

      // Cerrar la conexión a la base de datos
      connection2.end((err) => {
        if (err) {
          console.error("Error al cerrar la conexión: " + err.message);
        } else {
          console.log("Conexión a la base de datos cerrada correctamente");
        }
      });
    });
  });
}

module.exports = envioRango;
