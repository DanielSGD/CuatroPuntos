import { Component } from '@angular/core';
import { ResultService } from '../services/result.service';
import { range } from 'rxjs';

@Component({
  selector: 'app-resultados',
  templateUrl: './resultados.component.html',
  styleUrls: ['./resultados.component.css'],
})
export class ResultadosComponent {
  constructor(private resultService: ResultService) {}

  numRollo: string = '';
  primera: number = 0;
  segunda: number = 0;
  empalme: number = 0;
  retazo: number = 0;
  puntos: number = 0;
  mostrarAlerta: boolean = false;
  peso : number | undefined;
  unRango:any={
    inicio : 0,
    fin: 0,
    calidad:"",
    mensaje: "",
    puntos:0,
    metros:0,
    peso:0
  }

  numEnviado = {
    numeroRollo: '',
  };
  rangos: any = {
    inicio: [],
    fin: [],
    calidad: [],
    mensaje: [],
  };

  enviarNumRollo() {
    this.primera = 0;
    this.segunda = 0;
    this.empalme = 0;
    this.retazo = 0;
    this.rangos = {
      inicio: [],
      fin: [],
      calidad: [],
      mensaje: [],
      puntos:[]
    };

    this.numEnviado.numeroRollo = this.numRollo;

    this.resultService.sendResultados(this.numEnviado).subscribe((response) => {
      console.log("este es response")
      console.log(response);
      if (response == "id erroneo") {
        this.mostrarAlerta = true;
      }else{
        console.log("no alerta")
        this.mostrarAlerta = false ;

      this.rangos = response;
      console.log(this.rangos);
      for (let i = 0; i < this.rangos.fin.length; i++) {
        this.puntos += this.rangos.puntos[i]
        switch (this.rangos.calidad[i]) {
          case 'primera':
            this.primera =
              this.primera + (this.rangos.fin[i] - this.rangos.inicio[i]);
            break;
          case 'segunda':
            this.segunda =
              this.segunda + (this.rangos.fin[i] - this.rangos.inicio[i]);
            break;
          case 'Empalme':
            this.empalme =
              this.empalme + (this.rangos.fin[i] - this.rangos.inicio[i]);
            break;
          case 'retazo':
            this.retazo =
              this.retazo + (this.rangos.fin[i] - this.rangos.inicio[i]);
            break;
        }
      }
    }

    });
  }

  soloNumeros(event: any): void {
    const input = event.target;
    const value = input.value;
    const numericValue = value.replace(/[^0-9]/g, ''); // Filtra los caracteres no numéricos

    if (value !== numericValue) {
      input.value = numericValue;
    }
  }

  ngOnInit() {
    // Supongamos que tienes datos en calidad, por ejemplo:
    this.rangos.calidad = this.rangos.calidad.map((item: any) =>
      this.capitalizarPrimeraLetra(item)
    );
    this.rangos.mensaje = this.rangos.mensaje.map((item: any) =>
      this.capitalizarPrimeraLetra(item)
    );
  }

  capitalizarPrimeraLetra(texto: string): string {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  enviarUnRango(index:number){
    this.unRango.inicio = this.rangos.inicio[index];
    this.unRango.fin = this.rangos.fin[index];
    this.unRango.calidad = this.rangos.calidad[index];
    this.unRango.mensaje = this.rangos.mensaje[index];
    this.unRango.puntos = this.rangos.puntos[index];
    this.unRango.metros =(this.rangos.fin[index] -  this.rangos.inicio[index] );
    this.unRango.peso = this.peso;
    this.rangos.inicio.splice(index, 1);
    this.rangos.fin.splice(index, 1);
    this.rangos.calidad.splice(index, 1);
    this.rangos.mensaje.splice(index, 1);
    this.rangos.puntos.splice(index, 1);
    console.log(this.unRango)
  }

}
