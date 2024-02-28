const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mysql = require("mysql");
const app = express();

//Configuración
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

function resultadoRango(mapeos, rendimientos, anchoTelas, tam, puntos) {
  let punto = puntos;
  console.log("este es el puntaje en 100m2: " + punto);
  let mapeo = mapeos;
  let rendimiento = rendimientos;
  let anchoTela = anchoTelas;
  let t = tam;
  const tamTela = tam;
  mapeo = ordenarMetrosConPuntos(mapeo);
  mapeo = quirarRepetidos(mapeo);
  console.log("mapeo despues de quitar los repetidos");
  console.log(mapeo);
  /**
   * Configuración de parámetros segun la referencia de la tela.
   */
  const config = {
    rendimiento: rendimiento, // Rendimiento en metros por kilogramo para cada referencia

    ancho: anchoTela, // Ancho de la tela en metros para cada referencia

    peso_maximo: 24, // Peso máximo permitido para levantar por un operario en kilogramos
  };

  const m_maximo = Math.round(config.peso_maximo * config.rendimiento); //tamaño maximo permitido por cada rollo o rango

  let m_minimo = 15; // tamaño minimo permitido por caa rollo o rango

  /**
   * Calcula los rangos de corte que deben estar or encima de la longitud mínima y por debajo de la longitud máxima.
   * @param {number} t - Tamaño total de la tela a cortar.
   * @param {number} l_maximo - Longitud máxima permitida por cada rollo o rango.
   * @param {number} l_minimo - Longitud mínima permitida por cada rollo o rango.
   * @returns {object} - Objeto con los rangos de inicio y fin de corte.
   */

  // divide la tela en los rangos mas grandes posibles que sean mayores o iguales a m_minimo y menores o iguales a m_maximo
  function calcularRangos(t, l_maximo, l_minimo) {
    let rango = {
      inicio: [],

      fin: [],
      vld: [],
    };

    let inicio = 0;

    while (inicio < t) {
      let fin = inicio + l_maximo;

      if (fin > t) {
        fin = t;
      }

      if (t - fin < l_minimo && t - fin != 0) {
        // verificacion de si queda suficiente tela para el sigiente rollo

        fin = fin - (l_minimo - (t - fin));

        if (fin - inicio >= l_minimo) {
          rango.fin.push(Math.floor(fin));

          rango.inicio.push(Math.floor(inicio));
        } else {
          let indice = rango.fin.length - 1;

          console.log(rango.fin[indice]);

          rango.fin[indice] = rango.fin[indice] - (l_minimo - (fin - inicio));

          inicio = rango.fin[indice];

          rango.fin.push(Math.floor(fin));

          rango.inicio.push(Math.floor(inicio));
        }
      } else if (fin - inicio >= l_minimo) {
        rango.fin.push(Math.floor(fin));

        rango.inicio.push(Math.floor(inicio));
      } else {
        let indice = rango.fin.length - 1;

        console.log(rango.fin[indice]);

        rango.fin[indice] = rango.fin[indice] - (l_minimo - (fin - inicio));

        inicio = rango.fin[indice];

        rango.fin.push(Math.floor(fin));

        rango.inicio.push(Math.floor(inicio));
      }

      inicio = fin;
    }

    return rango;
  }
  // rangos de corte que estan detro de la longitud maxima y minima.
  let rango = calcularRangos(t, m_maximo, m_minimo);

  // Espacio donde se guardarán los rangos después de pasar toda la verificación.
  let rangosVer = {
    inicio: [],
    fin: [],
    calidad: [],
    mensaje: [],
  };

  verificacionDosM();

  // verifica los puntos en todos los rangos y ajusta de ser posible para que todo quede en primera
  function verifPuntos() {
    let puntos_maximos; // Puntos maximos permitidos por rango.
    let suma_puntos; // suma de los puntos por rango
    let validacion; // valido o invalido segun la comparativa de puntos_maximos y suma_puntos
    let cont = 0;
    while (/* (validacion === "invalido" ) */ cont < 10) {
      for (let i = 0; i < rango.fin.length; i++) {
        // calcula los puntos maximos por cada rango
        puntos_maximos = Math.ceil(
          ((rango.fin[i] - rango.inicio[i]) * config.ancho * punto) / 100
        );
        suma_puntos = 0;

        // recorremos cada rango teniendo w como metro
        for (let w = rango.inicio[i]; w < rango.fin[i]; w++) {
          // recorremos los errores
          for (let x = 0; x < mapeo.metros.length; x++) {
            // si en el metro w hay un error suma los puntos
            if (w == mapeo.metros[x] && mapeo.puntos[i] != "*") {
              suma_puntos += mapeo.puntos[x];
            }
          }
          // si la suma de los errores subrepasa a el maximo de los errores se le da una calificacion de invalido
          if (suma_puntos > puntos_maximos) {
            validacion = "invalido";
            rango.vld[i] = validacion;
          } else {
            validacion = "valido";
            ultimoValido = w;
            rango.vld[i] = validacion;
          }
        }
        // si es invalido, dejar el rango hast donde es valido y agregar el resto a los demas rangos
        if (validacion == "invalido") {
          rango.fin[i] = ultimoValido - 1;
          if (typeof rango.inicio[i + 1] != "undefined") {
            rango.inicio[i + 1] = rango.fin[i];

            /* cumplirMinMax();
        verificacionDosM() */
          }
        }
      }

      cumplirMinMax();
      verificacionDosM();
      for (let i = 0; i < rango.fin.length; i++) {
        rango.vld[i] = puntosRango(rango.inicio[i], rango.fin[i]);
        if (rango.vld[i] === "invalido") {
          validacion = "invalido";
        }
      }

      cont++;
    }
    for (let i = 0; i < rango.fin.length; i++) {
      rango.vld[i] = puntosRango(rango.inicio[i], rango.fin[i]);
      if (rango.vld[i] === "invalido") {
      }
    }
  }
  verifPuntos();

  // varifica el tamaño de los rangos si todos estan validos
  if (rango.vld.every((valor) => valor === "valido") === true) {
    verifTamaño(rango);
  }
  verificacionDosM();

  // verifica los  puntos por rango y da un veredicto de valido o invalido con la funcion puntosRango
  for (let i = 0; i < rango.fin.length; i++) {
    rango.vld[i] = puntosRango(rango.inicio[i], rango.fin[i]);
  }
  /* verifTamaño(rango)  */

  verifPuntos();

  //si rango s invalido, quita el retazo que de la funcion encontrarGruposDeMetros y verifica si ya es valido
  rango.vld.forEach((element) => {
    if (element === "invalido") {
      let metr = "nada";
      let { grupos, grupoMaxPuntos } = encontrarGruposDeMetros(mapeo);
      if (grupoMaxPuntos.puntos > 0) {
        for (let i = 0; i < rango.fin.length; i++) {
          for (let w = rango.inicio[i]; w <= rango.fin[i]; w++) {
            for (let x = 0; x < grupoMaxPuntos.metros.length; x++) {
              if (w === grupoMaxPuntos.metros[x]) {
                metr = grupoMaxPuntos.metros[x - 1];

                break;
              }
            }
          }
          if (metr != "nada") {
            if (i === rango.fin.length - 1) {
              rango.fin[i] = grupoMaxPuntos.metros[0];
              if (
                t -
                  (grupoMaxPuntos.metros[grupoMaxPuntos.metros.length - 1] +
                    1) <
                5
              ) {
                rangosVer.inicio.push(grupoMaxPuntos.metros[0]);
                rangosVer.fin.push(t);
                rangosVer.calidad.push("retazo");
                t = grupoMaxPuntos.metros[0];
                cumplirMinMax();
                verificacionDosM();
                verifPuntos();
              } else {
                rango.inicio[i + 1] =
                  grupoMaxPuntos.metros[grupoMaxPuntos.metros.length - 1] + 1;
                rango.fin[i + 1] = t;
                t = grupoMaxPuntos.metros[0];
              }

              break;
            } else if (
              grupoMaxPuntos.metros[0] - rango.inicio[i - 1] <
              m_maximo
            ) {
              rango.fin[i - 1] = grupoMaxPuntos.metros[0];
              rango.inicio[i + 1] =
                grupoMaxPuntos.metros[grupoMaxPuntos.metros.length - 1] + 1;
              rango.inicio.splice(i, 1);
              rango.fin.splice(i, 1);
              rango.vld.splice(i, 1);
              rangosVer.inicio.push(grupoMaxPuntos.metros[0]);
              rangosVer.fin.push(
                grupoMaxPuntos.metros[grupoMaxPuntos.metros.length - 1] + 1
              );
              rangosVer.calidad.push("retazo");
              break;
            } else if (grupoMaxPuntos.metros[0] - rango.inicio[0] < 5) {
              rangosVer.inicio.push(rango.inicio[0]);
              rangosVer.fin.push(
                grupoMaxPuntos.metros[grupoMaxPuntos.metros.length - 1] + 1
              );
              rangosVer.calidad.push("retazo");
              rango.inicio[i] =
                grupoMaxPuntos.metros[grupoMaxPuntos.metros.length - 1] + 1;
              break;
            } else {
              rango.fin[i] = grupoMaxPuntos.metros[0];
              rango.inicio[i + 1] =
                grupoMaxPuntos.metros[grupoMaxPuntos.metros.length - 1] + 1;

              rangosVer.inicio.push(grupoMaxPuntos.metros[0]);
              rangosVer.fin.push(
                grupoMaxPuntos.metros[grupoMaxPuntos.metros.length - 1] + 1
              );
              rangosVer.calidad.push("retazo");
              break;
            }
          }
        }
      }
    }
  });

  // si hay un invalido despues de quitar la parte de encontrarGruposDeMetros(mapeo) entonces organiza los rangos y verifica si ya es valido
  rango.vld.forEach((element) => {
    if (element === "invalido") {
      for (let i = 0; i < rango.fin.length; i++) {
        if (i === 0) {
          if (rango.fin[i] != rango.inicio[i + 1]) {
            if (rango.fin[i] - rango.inicio[i] < m_minimo) {
              rangosVer.inicio.push(rango.inicio[i]);
              rangosVer.fin.push(rango.fin[i]);
              rangosVer.calidad.push("Empalme");
              rango.inicio.splice(i, 1);
              rango.fin.splice(i, 1);
              rango.vld.splice(i, 1);
            } else if (rango.fin[i] - rango.inicio[i] < m_maximo) {
              let resultado = puntosRango(rango.inicio[i], rango.fin[i]);
              if (resultado == "valido") {
                rangosVer.inicio.push(rango.inicio[i]);
                rangosVer.fin.push(rango.fin[i]);
                rangosVer.calidad.push("primera");
                rango.inicio.splice(i, 1);
                rango.fin.splice(i, 1);
                rango.vld.splice(i, 1);
              } else {
                rangosVer.inicio.push(rango.inicio[i]);
                rangosVer.fin.push(rango.fin[i]);
                rangosVer.calidad.push("segunda");
                rango.inicio.splice(i, 1);
                rango.fin.splice(i, 1);
                rango.vld.splice(i, 1);
              }
            }
          }
        } else if ((i = rango.fin.length - 1)) {
          if (rango.inicio[i] != rango.fin[i - 1]) {
            if (rango.fin[i] - rango.inicio[i] < m_minimo) {
              rangosVer.inicio.push(rango.inicio[i]);
              rangosVer.fin.push(rango.fin[i]);
              rangosVer.calidad.push("Empalme");
              rango.inicio.splice(i, 1);
              rango.fin.splice(i, 1);
              rango.vld.splice(i, 1);
            } else if (rango.fin[i] - rango.inicio[i] < m_maximo) {
              let resultado = puntosRango(rango.inicio[i], rango.fin[i]);
              if (resultado == "valido") {
                rangosVer.inicio.push(rango.inicio[i]);
                rangosVer.fin.push(rango.fin[i]);
                rangosVer.calidad.push("primera");
                rango.inicio.splice(i, 1);
                rango.fin.splice(i, 1);
                rango.vld.splice(i, 1);
              } else {
                rangosVer.inicio.push(rango.inicio[i]);
                rangosVer.fin.push(rango.fin[i]);
                rangosVer.calidad.push("segunda");
                rango.inicio.splice(i, 1);
                rango.fin.splice(i, 1);
                rango.vld.splice(i, 1);
              }
            }
          }
        }
      }
      cumplirMinMax();
      verificacionDosM();
      verifPuntos;
    }
  });

  verifPuntos();

  tamPuntos();
  /* verifTamaño(rango); */
  // si hay un invalido en rango, entonces recorte el pesazo de la funcion encontrarParesCercanos y organize
  rango.vld.forEach((element) => {
    if (element === "invalido") {
      let parRecorte = encontrarParesCercanos(mapeo);
      let metr = "nada";

      for (let i = 0; i < rango.fin.length; i++) {
        for (let w = rango.inicio[i]; w <= rango.fin[i]; w++) {
          for (let x = 0; x < parRecorte.length; x++) {
            if (w === parRecorte[x]) {
              metr = parRecorte[x];

              break;
            }
          }
        }
        if (metr != "nada") {
          rango.fin[i] = parRecorte[0];
          rango.inicio[i + 1] = parRecorte[1] + 1;
          if (parRecorte[1] + 1 - parRecorte[0] >= 8) {
            if (
              puntosRangoSegunda(parRecorte[0], parRecorte[1] + 1) == "valido"
            ) {
              rangosVer.inicio.push(parRecorte[0]);
              rangosVer.fin.push(parRecorte[1] + 1);
              rangosVer.calidad.push("segunda");
              break;
            } else {
              rangosVer.inicio.push(parRecorte[0]);
              rangosVer.fin.push(parRecorte[1] + 1);
              rangosVer.calidad.push("retazo");
              break;
            }
          } else {
            rangosVer.inicio.push(parRecorte[0]);
            rangosVer.fin.push(parRecorte[1] + 1);
            rangosVer.calidad.push("retazo");

            break;
          }
        }
      }

      for (let i = 0; i < rango.fin.length; i++) {
        if (i === 0) {
          if (rango.fin[i] != rango.inicio[i + 1]) {
            if (rango.fin[i] - rango.inicio[i] < m_minimo) {
              rangosVer.inicio.push(rango.inicio[i]);
              rangosVer.fin.push(rango.fin[i]);
              rangosVer.calidad.push("Empalme");
              rango.inicio.splice(i, 1);
              rango.fin.splice(i, 1);
              rango.vld.splice(i, 1);
            } else if (rango.fin[i] - rango.inicio[i] < m_maximo) {
              let resultado = puntosRango(rango.inicio[i], rango.fin[i]);
              if (resultado == "valido") {
                rangosVer.inicio.push(rango.inicio[i]);
                rangosVer.fin.push(rango.fin[i]);
                rangosVer.calidad.push("primera");
                rango.inicio.splice(i, 1);
                rango.fin.splice(i, 1);
                rango.vld.splice(i, 1);
              } else {
                rangosVer.inicio.push(rango.inicio[i]);
                rangosVer.fin.push(rango.fin[i]);
                rangosVer.calidad.push("segunda");
                rango.inicio.splice(i, 1);
                rango.fin.splice(i, 1);
                rango.vld.splice(i, 1);
              }
            }
          }
        } else if ((i = rango.fin.length - 1)) {
          if (rango.inicio[i] != rango.fin[i - 1]) {
            if (rango.fin[i] - rango.inicio[i] < m_minimo) {
              rangosVer.inicio.push(rango.inicio[i]);
              rangosVer.fin.push(rango.fin[i]);
              rangosVer.calidad.push("Empalme");
              rango.inicio.splice(i, 1);
              rango.fin.splice(i, 1);
              rango.vld.splice(i, 1);
            } else if (rango.fin[i] - rango.inicio[i] < m_maximo) {
              let resultado = puntosRango(rango.inicio[i], rango.fin[i]);
              if (resultado == "valido") {
                rangosVer.inicio.push(rango.inicio[i]);
                rangosVer.fin.push(rango.fin[i]);
                rangosVer.calidad.push("primera");
                rango.inicio.splice(i, 1);
                rango.fin.splice(i, 1);
                rango.vld.splice(i, 1);
              } else {
                rangosVer.inicio.push(rango.inicio[i]);
                rangosVer.fin.push(rango.fin[i]);
                rangosVer.calidad.push("segunda");
                rango.inicio.splice(i, 1);
                rango.fin.splice(i, 1);
                rango.vld.splice(i, 1);
              }
            }
          }
        }
      }

      cumplirMinMax();
      verificacionDosM();
      verifPuntos();
    }
  });

  cumplirMinMax();
  verifPuntos();
  rango.vld.forEach((element) => {
    if (element === "invalido") {
      for (let i = 0; i < rango.fin.length; i++) {
        rango.vld[i] = puntosRango(rango.inicio[i], rango.fin[i]);
      }
    }
  });
  verificacionDosM();
  maximizarRango();

  // si en rango todo es valido envia eso a rangosVer
  resultadoFinal();

  

  // utilizo la funcion ordenarRangos, para ardenar de mayor a menor y para unir los recortes sucesivos
  rangosVer = ordenarRangos(rangosVer);
 rangosVer= faltaRetazo(rangosVer)
  // utilizo la funcion puntoAsterisco para verificar si puntos asterico(*) y en el ranque que tenga comoca un mensaje de advertencia.
  rangosVer.mensaje = puntAsterisco(rangosVer);

  // ---- correciones a los rangos finales antes de presentarlos, quita duplicados, quita errores de tamaño y verifica que este correcto el tamaño y la calificacion ----\\
  for (let i = 0; i < rangosVer.inicio.length; i++) {
    if (rangosVer.fin[i] === rangosVer.fin[i + 1]) {
      rangosVer.inicio.splice(i, 1);
      rangosVer.fin.splice(i, 1);
      rangosVer.calidad.splice(i, 1);
      rangosVer.mensaje.splice(i, 1);
    }
  }
  for (let i = 0; i < rangosVer.inicio.length; i++) {
    if (rangosVer.fin[i] < rangosVer.fin[i + 1]) {
      rangosVer.inicio.splice(i, 1);
      rangosVer.fin.splice(i, 1);
      rangosVer.calidad.splice(i, 1);
      rangosVer.mensaje.splice(i, 1);
    }
  }
  for (let i = 0; i < rangosVer.inicio.length; i++) {
    if (
      rangosVer.fin[i] == rangosVer.fin[i + 1] &&
      rangosVer.inicio[i] == rangosVer.inicio[i + 1]
    ) {
      rangosVer.inicio.splice(i, 1);
      rangosVer.fin.splice(i, 1);
      rangosVer.calidad.splice(i, 1);
      rangosVer.mensaje.splice(i, 1);
    }
  }

  for (let i = 0; i < rangosVer.inicio.length; i++) {
    if (rangosVer.inicio[i] < rangosVer.fin[i + 1]) {
      rangosVer.inicio[i] = rangosVer.fin[i + 1];
    }
  }
 


  rangosVer = sumPuntos(rangosVer, mapeo);

 
  rangosVer = invertirRango(rangosVer);
  for (let i = 0; i < rangosVer.inicio.length; i++) {
    if (rangosVer.inicio[i] === tamTela) {
      rangosVer.inicio.splice((i), 1 );
      rangosVer.fin.splice((i), 1 );
      rangosVer.calidad.splice((i), 1 );
      rangosVer.mensaje.splice((i), 1 );
      rangosVer.puntos.splice((i), 1 );

    }
  }
 // muestra el rango de manera ordenada en la consola.
  presentarRango(rangosVer);

  // utilizo la funcion resumen para que contabilice cuantos metros hay en primera, segunda, empalme y retazo
  let conteo = resumen(rangosVer);


  /* esta funcion verifica si hay errores de 3 o 4 puntos en los primeros 2 metros 
  o en los ultimos 2 metros de cada rango y ajusta los rangos si es neceario */
  function verificacionDosM() {
    let resta; //valor que se debe descontar de cada rango
    let calificacion; // califica si es valido o invalido si encuentra un error de 3 o 4 puntos en los 2 metros iniicales
    let mError; // el metro que tiene algun punto de error
    let contador = 0; // Contador para el seguimiento de rangos.
    let calificacionFin; // califica si es valido o invalido si encuentra un error de 3 o 4 puntos en los 2 metros finales

    while (
      (calificacion != "valido" && calificacionFin != "valido") ||
      contador < 7
    ) {
      //recorro cada rango
      for (let i = 0; i < rango.inicio.length; i++) {
        calificacion = "valido";

        //recorro los dos primeros rangos de cada corte
        for (let w = rango.inicio[i]; w < rango.inicio[i] + 2; w++) {
          //recorro el array de los errores
          for (let x = 0; x < mapeo.metros.length; x++) {
            //si encuenta un error que tenga mas de dos puntos ponga calificacion invalido
            if (w === mapeo.metros[x] && mapeo.puntos[x] > 2) {
              calificacion = "invalido";
              mError = w;
            }
          }
        }

        if (calificacion === "invalido") {
          //si el primer rango es invalido mande para retazo el rango del error
          if (i === 0) {
            rangosVer.inicio.push(rango.inicio[i]);
            rangosVer.fin.push(mError + 1);
            rangosVer.calidad.push("retazo");
            rango.inicio[i] = mError + 1;

            //si no es en el primer rango, modifique los rangos hacia la izquierda
          } else {
            resta = 2 - (mError - rango.inicio[i]);
            rango.fin[i - 1] = rango.fin[i - 1] - resta;
            rango.inicio[i] = rango.inicio[i] - resta;
          }
        }
        // verifico que cumpla con el tamaño permitido
        cumplirMinMax();
        calificacionFin = "valido";
        // recorre los ultimos dos metros de cada rango
        for (let w = rango.fin[i] - 2; w < rango.fin[i]; w++) {
          //si encuenta un error que tenga mas de dos puntos ponga calificacion invalido
          for (let x = 0; x < mapeo.metros.length; x++) {
            if (w === mapeo.metros[x] && mapeo.puntos[x] > 2) {
              calificacionFin = "invalido";
              mError = w;
            }
          }
        }

        if (calificacionFin == "invalido") {
          //si el ultimo rango es invalido mande para retazo el rango del error
          if (i == rango.fin.length - 1) {
            rangosVer.inicio.push(mError);
            rangosVer.fin.push(t);
            rangosVer.calidad.push("retazo");
            rango.fin[i] = mError;
            t = rango.fin[i];
            console.log("\nnuevo tamaño de la tela");
            console.log(t);
            // si no esta en el ultimo rango modifique el rango hacia la izquierda
          } else {
            cambio = 2;
            rango.fin[i] = mError - 2;
            rango.inicio[i + 1] = rango.fin[i];
          }
          // verifico que cumpla con el tamaño permitido
          cumplirMinMax();
        }
      }
      return rango;
    }
  }
  /* esta funcion ajusta los rangos para se mantengan entre el maximo y 
  el minimo permitido y/o crea un nuevo rango si el ultimo rango no llega al final de la tela  */
  function cumplirMinMax() {
    let cambio;
    let contador = 0;

    //recorre los rangos
    for (let i = 0; i < rango.inicio.length; i++) {
      //verficia la longitud del rango es menor a la longitud minima y ajusta el rango
      if (rango.fin[i] - rango.inicio[i] < m_minimo) {
        cambio = Math.ceil(m_minimo - (rango.fin[i] - rango.inicio[i]));

        //verifica si es el primer rango
        if (i === 0) {
          rango.fin[i] = rango.fin[i] + cambio;
          rango.inicio[i + 1] = rango.fin[i];

          //verifica si es el ultimo rango y agranda hacia la izquierda
        } else if (i === rango.fin.length - 1) {
          rango.inicio[i] = rango.inicio[i] - cambio;
          rango.fin[i - 1] = rango.inicio[i];
          // verifica si puede reducir a la izquierda y aplica el cambio
        } else if (rango.fin[i - 1] - rango.inicio[i - 1] - cambio > m_minimo) {
          rango.inicio[i] = rango.inicio[i] - cambio;
          rango.fin[i - 1] = rango.inicio[i];

          //verfica si puede reducir a la derecha y aplica el cambio
        } else if (rango.fin[i + 1] - rango.inicio[i + 1] - cambio > m_minimo) {
          rango.fin[i] = rango.fin[i] + cambio;
          rango.inicio[i + 1] = rango.fin[i];
        } else if (
          rango.fin[i - 1] -
            rango.inicio[i - 1] +
            (rango.fin[i] - rango.inicio[i]) >
          m_maximo
        ) {
          rango.fin[i - 1] = rango.fin[i];
          rango.inicio.splice(i, 1);
          rango.fin.splice(i, 1);
          rango.vld.splice(i, 1);
        }

        //verifica si el rango es menor a la longitud maxima y ajusta el rango
      } else if (rango.fin[i] - rango.inicio[i] > m_maximo) {
        cambio = Math.ceil(rango.fin[i] - rango.inicio[i] - m_maximo);
        // verifica si es el primer rango y acorta el rango hacia la derecha
        if (i === 0) {
          rango.fin[i] = rango.fin[i] - cambio;
          if (rango.inicio[i + 1] !== undefined) {
            rango.inicio[i + 1] = rango.fin[i];
          }

          // verifica si es el ultimo rango y acorta el rango hacia la izquerda.
        } else if (i === rango.fin.length - 1) {
          if (rango.fin[i - 1] - rango.inicio[i - 1] + cambio < m_maximo) {
            rango.inicio[i] = rango.inicio[i] + cambio;
            rango.fin[i - 1] = rango.inicio[i];
          } else {
            rango.fin[i] = rango.fin[i] - cambio;
            rango.inicio.push(rango.fin[i]);
            rango.fin.push(t);
          }
        } else {
          rango.fin[i] = rango.fin[i] - cambio;
          if (rango.inicio[i + 1] !== undefined) {
            rango.inicio[i + 1] = rango.fin[i];
          }
        }
      }

      //verifica si el ultimo rango no se pasa del tamaño de la tela y si lo es o corrige
      if (rango.fin[rango.fin.length - 1] > t) {
        rango.fin[rango.fin.length - 1] = t;

        //verifica si el ultimo rango es menor al tamaño de la tela, si lo es lo corrige
      } else if (rango.fin[rango.fin.length - 1] < t) {
        rango.inicio.push(rango.fin[rango.fin.length - 1]);
        rango.fin.push(t);
      }
    }

    for (let x = 0; x < rango.fin.length; x++) {
      if (rango.fin[x] - rango.inicio[x] < m_minimo) {
        if (
          rango.fin[x - 1] -
            rango.inicio[x - 1] +
            (rango.fin[x] - rango.inicio[x]) <
          m_maximo
        )
          rango.fin[x - 1] = rango.fin[x];
        rango.inicio.splice(x, 1);
        rango.fin.splice(x, 1);
        rango.vld.splice(x, 1);
      } else if (
        rango.fin[x + 1] -
          rango.inicio[x + 1] +
          (rango.fin[x] - rango.inicio[x]) <
        m_maximo
      ) {
        rango.inicio[x + 1] = rango.inicio[x];
        rango.inicio.splice(x, 1);
        rango.fin.splice(x, 1);
        rango.vld.splice(x, 1);
      }
    }
  }

  // funcion para precentar el rango mas legible en consola
  function mostrarRango(rango) {
    for (let i = 0; i < rango.inicio.length; i++) {
      console.log(
        "rango " +
          (i + 1) +
          ": ( " +
          rango.inicio[i] +
          " - " +
          rango.fin[i] +
          ")"
      );
    }
  }

  // Función para encontrar grupos de metros
  function encontrarGruposDeMetros(mapeo) {
    let grupos = [];
    let grupoActual = { puntos: 0, metros: [] };
    let grupoMaxPuntos = { puntos: 0, metros: [] };

    for (let i = 0; i < mapeo.metros.length; i++) {
      if (grupoActual.metros.length === 0) {
        grupoActual.metros.push(mapeo.metros[i]);
        grupoActual.puntos += mapeo.puntos[i];
      } else {
        let distancia =
          mapeo.metros[i] - grupoActual.metros[grupoActual.metros.length - 1];
        if (distancia <= 2) {
          grupoActual.metros.push(mapeo.metros[i]);
          grupoActual.puntos += mapeo.puntos[i];
        } else {
          if (grupoActual.puntos > 5) {
            grupos.push({
              puntos: grupoActual.puntos,
              metros: grupoActual.metros,
            });
            if (grupoActual.puntos > grupoMaxPuntos.puntos) {
              grupoMaxPuntos = { ...grupoActual };
            }
          }
          grupoActual = { puntos: 0, metros: [] };
          i--; // Revisar nuevamente el metro actual en el próximo ciclo
        }
      }
    }

    // Añadir el último grupo si cumple con los requisitos
    if (grupoActual.puntos > 5) {
      grupos.push({ puntos: grupoActual.puntos, metros: grupoActual.metros });
      if (grupoActual.puntos > grupoMaxPuntos.puntos) {
        grupoMaxPuntos = { ...grupoActual };
      }
    }

    return { grupos, grupoMaxPuntos };
  }

  // encuentra un par de puntos que sean superiores a 5 y este cercano al centro
  function encontrarParesCercanos(mapeo) {
    const metros = mapeo.metros;
    const puntos = mapeo.puntos;

    // Primero, ordenamos los metros de manera ascendente.
    metros.sort((a, b) => a - b);

    let mejoresPares = [];
    let distanciaMinima = Infinity;
    const centro = metros[Math.floor(metros.length / 2)];

    for (let i = 0; i < metros.length - 1; i++) {
      for (let j = i + 1; j < metros.length; j++) {
        const metroA = metros[i];
        const metroB = metros[j];
        const sumaPuntos =
          puntos[metros.indexOf(metroA)] + puntos[metros.indexOf(metroB)];

        // Calculamos la distancia al centro del arreglo de metros.
        const distanciaAlCentro =
          Math.abs(metroA - centro) + Math.abs(metroB - centro);

        // Verificamos si la suma de puntos es mayor a 5 y si la distancia es menor que la mínima actual.
        if (sumaPuntos > 5 && distanciaAlCentro < distanciaMinima) {
          mejoresPares = [metroA, metroB];
          distanciaMinima = distanciaAlCentro;
        } else if (sumaPuntos === 5 && distanciaAlCentro === distanciaMinima) {
          // Si encontramos otro par con la misma distancia, lo agregamos al array.
          mejoresPares.push(metroA, metroB);
        }
      }
    }

    return mejoresPares;
  }

  // verifica los puntos en un rango espesifico
  function puntosRango(inicio, fin) {
    let puntosmax = Math.ceil(((fin - inicio) * config.ancho * punto) / 100);
    let sPuntos = 0;
    let resultado;
    for (let x = inicio; x < fin; x++) {
      for (let j = 0; j < mapeo.metros.length; j++) {
        if (x === mapeo.metros[j] && mapeo.metros[j] != "*") {
          sPuntos += mapeo.puntos[j];
        }
      }
    }
    if (sPuntos > puntosmax) {
      resultado = "invalido";
    } else {
      resultado = "valido";
    }
    return resultado;
  }

  //precenta el rango mas legible en la consola
  function presentarRango(rango) {
    rango = eliminarUndefined(rango);

    for (let i = 0; i < rango.inicio.length; i++) {
      console.log(
        "rango " +
          (i + 1) +
          ": ( " +
          rango.inicio[i] +
          " - " +
          rango.fin[i] +
          ")" +
          ", Calidad: " +
          rango.calidad[i] +
          ", " +
          rango.mensaje[i]
      );
    }
  }

  // verifica que los tamaños sea correcto y les da una calificacion
  function verifTamaño(rango) {
    for (let i = 0; i < rango.inicio.length; i++) {
      if (
        rango.fin[i] - rango.inicio[i] >= m_minimo &&
        rango.fin[i] - rango.inicio[i] <= m_maximo
      ) {
        rango.vld[i] = "valido";
      } else {
        rango.vld[i] = "invalido";
        /* cumplirMinMax() */
      }
    }
  }
  // separa los retazos en un json y las otras calides en otro
  function separarJSON(jsonObj) {
    const retazoJSON = {
      inicio: [],
      fin: [],
      calidad: [],
    };

    const otrasCalidadesJSON = {
      inicio: [],
      fin: [],
      calidad: [],
    };

    for (let i = 0; i < jsonObj.calidad.length; i++) {
      if (jsonObj.calidad[i] === "retazo") {
        retazoJSON.inicio.push(jsonObj.inicio[i]);
        retazoJSON.fin.push(jsonObj.fin[i]);
        retazoJSON.calidad.push(jsonObj.calidad[i]);
      } else {
        otrasCalidadesJSON.inicio.push(jsonObj.inicio[i]);
        otrasCalidadesJSON.fin.push(jsonObj.fin[i]);
        otrasCalidadesJSON.calidad.push(jsonObj.calidad[i]);
      }
    }

    return {
      retazoJSON,
      otrasCalidadesJSON,
    };
  }

  //combina los rangos segidos o superpuestos
  function combinarRangos(jsonObj) {
    const inicio = jsonObj.inicio;
    const fin = jsonObj.fin;
    const calidad = jsonObj.calidad;

    const resultado = {
      inicio: [],
      fin: [],
      calidad: [],
    };

    // Ordenar los rangos por el inicio
    const sortedIndices = inicio
      .map((_, index) => index)
      .sort((a, b) => inicio[a] - inicio[b]);

    let currentInicio = inicio[sortedIndices[0]];
    let currentFin = fin[sortedIndices[0]];
    let currentCalidad = calidad[sortedIndices[0]];

    for (let i = 1; i < sortedIndices.length; i++) {
      const currentIndex = sortedIndices[i];
      if (inicio[currentIndex] <= currentFin) {
        // Los rangos se superponen o son consecutivos
        if (fin[currentIndex] > currentFin) {
          currentFin = fin[currentIndex];
        }
      } else {
        // Los rangos no se superponen, agregar el rango actual al resultado
        resultado.inicio.push(currentInicio);
        resultado.fin.push(currentFin);
        resultado.calidad.push(currentCalidad);

        // Establecer el nuevo rango actual
        currentInicio = inicio[currentIndex];
        currentFin = fin[currentIndex];
        currentCalidad = calidad[currentIndex];
      }
    }

    // Agregar el último rango al resultado
    resultado.inicio.push(currentInicio);
    resultado.fin.push(currentFin);
    resultado.calidad.push(currentCalidad);

    return resultado;
  }

  // ordena los rangos de mayor a menor
  function ordenarRangos(x) {
    const resultado = separarJSON(x);

    const rest = combinarRangos(resultado.retazoJSON);

    let rangos = resultado.otrasCalidadesJSON;

    for (let i = 0; i < rest.fin.length; i++) {
      rangos.inicio.push(rest.inicio[i]);
      rangos.fin.push(rest.fin[i]);
      rangos.calidad.push(rest.calidad[i]);
    }

    // Crear un arreglo de índices para ordenar los arreglos 'inicio' y 'fin'
    const indices = Array.from(rangos.inicio.keys());

    // Ordenar los arreglos 'inicio' y 'fin' en función de los valores de 'inicio'
    indices.sort((a, b) => rangos.inicio[b] - rangos.inicio[a]);

    // Crear un nuevo JSON ordenado en función de los índices ordenados
    const rangoOrdenado = {
      inicio: indices.map((index) => rangos.inicio[index]),
      fin: indices.map((index) => rangos.fin[index]),
      calidad: indices.map((index) => rangos.calidad[index]),
    };

    return rangoOrdenado;
  }
  // elimina espacios vacios de los arrays
  function eliminarUndefined(obj) {
    for (const key in obj) {
      if (Array.isArray(obj[key])) {
        obj[key] = obj[key].filter((item) => item !== undefined);
      }
    }
    return obj;
  }
  // verifica si hay puntos asteriscos en los rangos y emite un mensaje en consecuencia
  function puntAsterisco(rangosVer) {
    let metrosAst = [];
    let mensaje = [];
    for (let i = 0; i < rangosVer.inicio.length; i++) {
      metrosAst = [];
      for (let w = rangosVer.inicio[i]; w <= rangosVer.fin[i]; w++) {
        for (let x = 0; x < mapeo.metros.length; x++) {
          if (w == mapeo.metros[x] && mapeo.puntos[x] === 0) {
            metrosAst.push(tamTela - mapeo.metros[x]);
          }
        }
      }
      if (metrosAst[0] > 0) {
        mensaje.push(
          "antes de cortar valide con el supervisor de turno los defectos en los metros: " +
            metrosAst
        );
      } else {
        mensaje.push("listo para cortar");
      }
    }
    return mensaje;
  }

  //calcula cuantros metros hay en primera, segunda, empalme y retazo
  function resumen(rangosVer) {
    let resumen = { primera: 0, empalme: 0, retazo: 0, segunda: 0 };
    for (let i = 0; i < rangosVer.inicio.length; i++) {
      if (rangosVer.calidad[i] === "primera") {
        resumen.primera += rangosVer.fin[i] - rangosVer.inicio[i];
      } else if (rangosVer.calidad[i] === "Empalme") {
        resumen.empalme += rangosVer.fin[i] - rangosVer.inicio[i];
      } else if (rangosVer.calidad[i] === "retazo") {
        resumen.retazo += rangosVer.fin[i] - rangosVer.inicio[i];
      } else if (rangosVer.calidad[i] === "segunda") {
        resumen.segunda += rangosVer.fin[i] - rangosVer.inicio[i];
      }
    }
    return resumen;
  }

  // agranda los rangos ingresados a lo mas grande posible
  function maximizarRango() {
    for (let i = 0; i < rango.fin.length; i++) {
      if (
        rango.fin[i] === rango.inicio[i + 1] &&
        rango.fin[i + 1] - rango.inicio[i] <= m_maximo
      ) {
        let validacion = puntosRango(rango.inicio[i], rango.fin[i + 1]);
        if (validacion == "valido") {
          rango.inicio[i + 1] = rango.inicio[i];
          rango.inicio.splice(i, 1);
          rango.fin.splice(i, 1);
          rango.vld.splice(i, 1);
        }
      }
    }
  }

  // verifica si puede agrandar los rangos para aceptar cierta cantidad de puntos
  function tamPuntos() {
    let rango1 = rango;
    let sumatoria = 0;

    for (let i = 0; i < rango1.vld.length; i++) {
      if (rango1.vld[i] === "invalido") {
        for (let x = rango1.inicio[i]; x < rango1.fin[i]; x++) {
          for (let j = 0; j < mapeo.metros.length; j++) {
            if (x === mapeo.metros[j] && mapeo.puntos[j] != "*") {
              sumatoria += mapeo.puntos[j];
            }
          }
        }

        let metrosNecesarios = (sumatoria * (100 / config.ancho)) / punto;
        let dif = Math.ceil(
          metrosNecesarios - (rango1.fin[i] - rango1.inicio[i])
        );
        if (rango1.fin[i - 1] - rango1.inicio[i - 1] - dif > m_minimo) {
          rango1.inicio[i - 1] = rango1.inicio[i - 1];
          rango1.fin[i - 1] = rango1.fin[i - 1] - dif;
          rango1.inicio[i] = rango1.fin[i - 1];
          rango1.fin[i] = rango1.fin[i];
        }
      }
    }

    for (let a = 0; a < rango1.inicio.length; a++) {
      rango1.vld[a] = puntosRango(rango1.inicio[a], rango1.fin[a]);
    }
    let todosSonValidos2 = rango1.vld.every((element) => element === "valido");

    if (todosSonValidos2 && rango1.inicio[0] != undefined) {
      rango = rango1;
    } else {
      rango = rango;
    }
  }

  // pasa todos los rangos, los clasifica a primera, segunda, emplame y retazo y los pasa a rangosVer
  function resultadoFinal() {
    for (let i = 0; i < rango.inicio.length; i++) {
      if (rango.vld[i] == "valido") {
        rangosVer.inicio.push(rango.inicio[i]);
        rangosVer.fin.push(rango.fin[i]);
        rangosVer.calidad.push("primera");
      } else if (rango.fin[i] - rango.inicio[i] < m_minimo) {
        if (puntosRango(rango.inicio[i], rango.fin[i]) == "valido") {
          rangosVer.inicio.push(rango.inicio[i]);
          rangosVer.fin.push(rango.fin[i]);
          rangosVer.calidad.push("Empalme");
        } else if (
          puntosRangoSegunda(rango.inicio[i], rango.fin[i]) == "valido"
        ) {
          rangosVer.inicio.push(rango.inicio[i]);
          rangosVer.fin.push(rango.fin[i]);
          rangosVer.calidad.push("segunda");
        } else {
          rangosVer.inicio.push(rango.inicio[i]);
          rangosVer.fin.push(rango.fin[i]);
          rangosVer.calidad.push("retazo");
        }
      } else if (
        puntosRangoSegunda(rango.inicio[i], rango.fin[i]) == "valido"
      ) {
        rangosVer.inicio.push(rango.inicio[i]);
        rangosVer.fin.push(rango.fin[i]);
        rangosVer.calidad.push("segunda");
      } else {
        rangosVer.inicio.push(rango.inicio[i]);
        rangosVer.fin.push(rango.fin[i]);
        rangosVer.calidad.push("retazo");
      }
    }
    rango = ["termine"];
  }

  // verifica los puntos en un rango espesifico para calidad segunda
  function puntosRangoSegunda(inicio, fin) {
    let puntosmax = Math.ceil(((fin - inicio) * config.ancho * 60) / 100);
    let sPuntos = 0;
    let resultado;
    for (let x = inicio; x < fin; x++) {
      for (let j = 0; j < mapeo.metros.length; j++) {
        if (x === mapeo.metros[j] && mapeo.metros[j] != "*") {
          sPuntos += mapeo.puntos[j];
        }
      }
    }
    if (sPuntos > puntosmax) {
      resultado = "invalido";
    } else {
      resultado = "valido";
    }
    return resultado;
  }

  // invierte los valores del rango
  function invertirRango(rango) {
    let fin = rango.fin[0];
    rangoInvertido = {
      inicio: [],
      fin: [],
      calidad: [],
      mensaje: [],
      puntos: [],
    };

    for (let i = 0; i < rango.fin.length; i++) {
      rangoInvertido.inicio.push(fin - rango.fin[i]);
      rangoInvertido.fin.push(fin - rango.inicio[i]);
      rangoInvertido.calidad.push(rango.calidad[i]);
      rangoInvertido.mensaje.push(rango.mensaje[i]);
      rangoInvertido.puntos.push(rango.puntos[i]);
    }

    return rangoInvertido;
  }

  // ordena de menor a mayor el mapeo.
  function ordenarMetrosConPuntos(mapeo) {
    const metrosConPuntos = mapeo.metros.map((metro, index) => ({
      metro,
      puntos: mapeo.puntos[index],
    }));

    metrosConPuntos.sort((a, b) => a.metro - b.metro);

    const metrosOrdenados = metrosConPuntos.map(
      (metroConPuntos) => metroConPuntos.metro
    );
    const puntosOrdenados = metrosConPuntos.map(
      (metroConPuntos) => metroConPuntos.puntos
    );

    return { puntos: puntosOrdenados, metros: metrosOrdenados };
  }

  // suma los puntos de los metros duplicados y elimina el duplicado
  function quirarRepetidos(mapeo) {
    let mapeo1 = mapeo;
    let flag = false;
    while (flag === false) {
      flag = true;
      for (let i = 0; i < mapeo1.metros.length; i++) {
        if (mapeo1.metros[i] === mapeo1.metros[i + 1]) {
          flag = false;
          let sumaPuntos = mapeo1.puntos[i] + mapeo1.puntos[i + 1];
          if (sumaPuntos <= 4) {
            mapeo1.puntos[i] = sumaPuntos;
            mapeo1.metros.splice(i + 1, 1);
            mapeo1.puntos.splice(i + 1, 1);
          } else {
            mapeo1.puntos[i] = 4;
            mapeo1.metros.splice(i + 1, 1);
            mapeo1.puntos.splice(i + 1, 1);
          }
        }
      }
    }

    return mapeo1;
  }

  function sumPuntos(rangosVer, mapeo) {
    let rangosPunto = {
      inicio: [],
      fin: [],
      calidad: [],
      mensaje: [],
      puntos: [],
    };
    rangosPunto.inicio = rangosVer.inicio;
    rangosPunto.fin = rangosVer.fin;
    rangosPunto.calidad = rangosVer.calidad;
    rangosPunto.mensaje = rangosVer.mensaje;
    let sumaPunt = 0;
    for (let i = 0; i < rangosPunto.fin.length; i++) {
      sumaPunt = 0;
      for (let x = rangosPunto.inicio[i]; x < rangosPunto.fin[i]; x++) {
        for (let w = 0; w < mapeo.metros.length; w++) {
          if (x === mapeo.metros[w]) {
            sumaPunt += mapeo.puntos[w];
          }
        }
      }
      rangosPunto.puntos.push(sumaPunt);
    }
    return rangosPunto;
  }
  function faltaRetazo(rangos){
    let rangosVer = rangos
    
      for(let i = 0; i<rangosVer.fin.length; i++){
        if(rangosVer.inicio[i] != rangosVer.fin[i+1]){
          rangosVer.inicio.splice((i + 1), 0, rangosVer.fin[i+1])
          rangosVer.fin.splice((i+1), 0, rangosVer.inicio[i])
          rangosVer.calidad.splice((i+1), 0,  "retazo")
          break;
        }
      }
      
      return rangosVer
    }



  return rangosVer;
}

module.exports = resultadoRango;
