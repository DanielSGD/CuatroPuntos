//Paquetes y módulos
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const mysql = require("mysql");

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

// Ruta para manejar la solicitud POST desde Angular
app.post("/tratamiento", (req, res) => {
  let data = req.body;
  console.log(data);
  let puntos = parseInt(data.puntMax)
  let id_rolloAsignado = data.numeroRollo;
  const tamTela = data.longitudTela;
  let t = data.longitudTela;
  let anchoTela = data.anchoTela;
  let mapeo = { puntos: [], metros: [] };
  mapeo.puntos = data.puntaje;
  mapeo.metros = data.metros;
  let producto = 0;
  console.log(mapeo);
  let mapeoCod = { puntos: [], metros: [], codigoError: [] };
  mapeoCod.puntos = data.puntaje;
  mapeoCod.metros = data.metros;
  mapeoCod.codigoError = data.codigoError;
  const cadenaMapeoCod = JSON.stringify(mapeoCod); // Convertimos el JSON a cadena para almacenarlo en la base de datos
  const connection = mysql.createConnection(dbConfig);
  const resultadoRango = require("./resultadoRango");
  const envioRango = require("./envioRango");
 const coneccionMapeo = require("./coneccionMapeo")

  connection.connect((err) => {
    if (err) {
      console.error("Error al conectar a la base de datos: " + err.message);
      res.status(500).json({ message: "Error al conectar a la base de datos" }); // Devuelve un error al cliente
      return;
    }

    // Construimos la consulta SQL para insertar en la tabla mapeo
    const sql = "SELECT * FROM	productos WHERE  id_rollo_asignado = ?";
    /*  const values = [id_rolloAsignado]; */

    connection.query(sql, [id_rolloAsignado], (err, result) => {
      if (err) {
        console.error("Error en la consulta: " + err.message);
        res.json({ message: "error en la consulta" });
        res.status(500).json({ message: "Error en la consulta" }); // Devuelve un error al cliente
        return;
      }

      // Cerrar la conexión a la base de datos
      connection.end((err) => {
        if (err) {
          console.error("Error al cerrar la conexión: " + err.message);
        } else {
          console.log("Conexión a la base de datos cerrada correctamente");
        }
      });

      if (result.length === 0) {
        // Si no se encontraron resultados, el ID es incorrecto

        res.json(false);
      } else {
        coneccionMapeo(id_rolloAsignado, tamTela, cadenaMapeoCod, anchoTela)
        const jsonData = JSON.parse(JSON.stringify(result));
        producto = jsonData[0];
        console.log("este es producto");
        console.log(producto);
        let rendimiento = producto.rendimiento;
     

        let rangosVer = resultadoRango(
          mapeo,
          rendimiento,
          anchoTela,
          tamTela,
          puntos
        );
        console.log("rangos de corte");
        console.log(rangosVer);
        envioRango(rangosVer, id_rolloAsignado);
        //reinicio data
        data = 0;
        // Envía una respuesta al cliente (Angular) si es necesario
        res.json(true);
      }
    });
  });
});

app.post("/resultado", (req, res) => {
  let numRollo = req.body;
  let rangos;
  console.log(numRollo);
  id_rolloAsignado = numRollo.numeroRollo;

  const connection = mysql.createConnection(dbConfig);

  connection.connect((err) => {
    if (err) {
      console.error("Error al conectar a la base de datos: " + err.message);
      res.status(500).json({ message: "Error al conectar a la base de datos" }); // Devuelve un error al cliente
      return;
    }

    // Construimos la consulta SQL para insertar en la tabla mapeo
    const sql =
      "SELECT rangos FROM	rangos_de_corte WHERE  id_rollo_asignado = ?";
    /*  const values = [id_rolloAsignado]; */

    connection.query(sql, [id_rolloAsignado], (err, result) => {
      if (err) {
        console.error("Error en la consulta: " + err.message);
        res.json({ message: "error en la consulta" });
        res.status(500).json({ message: "Error en la consulta" }); // Devuelve un error al cliente
        return;
      }

      // Cerrar la conexión a la base de datos
      connection.end((err) => {
        if (err) {
          console.error("Error al cerrar la conexión: " + err.message);
        } else {
          console.log("Conexión a la base de datos cerrada correctamente");
        }
      });

      console.log(result);
      if (result.length === 0) {
        // Si no se encontraron resultados, el ID es incorrecto

        res.json("id erroneo");
      } else {
        // Envía una respuesta al cliente (Angular) con los datos encontrados
        let jsonString = result[0].rangos;
        rangos = JSON.parse(jsonString);
        res.json(rangos);
      }
    });
  });
});

//Puerto y escucha del servidor
app.listen(4000, "0.0.0.0", function () {
  console.log("--------------------------------------");
  console.log("Servidor funcionando corrrrrrrrrrectamente");
});
  