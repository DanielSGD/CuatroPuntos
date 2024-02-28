import { Component } from '@angular/core';
import { tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../services/task.service';




@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']

})

export class HomeComponent {
  numRollo :string ="";
  longTela : number | undefined;
  anchoTela:number | undefined;
  codError : string = "";
  met : number | undefined ;
  punt : number | undefined ;
  isInvalid: boolean = true;
  btnInsertMensaje: string ="El puntaje debe estar entre 0 y 4"
  numeroRolloError: string = '';
  longitudTelaError: string = '';
  anchoTelaError: string = '';
  mapeo : any ={
    numeroRollo : "",
    longitudTela : 0,
    anchoTela : 0,
    codigoError : [],
    metros : [],
    puntaje : [],
    puntMax :0

  }
  alert :any = true
  configuracion :number | undefined;

// inserta los datos de puntaje, codigo y meto al json mapeo cuando se le da click en el boton insertar
  insertMapeo(){
    this.mapeo.codigoError.push(this.codError);
    this.mapeo.puntaje.push(this.punt);
    this.mapeo.metros.push(this.met);
    this.codError = "";
    this.punt=undefined;
    this.met = undefined;
    console.log(this.mapeo)
  }
  //elimina los datos se la posicion index al dar clik al boton eliminar en la tabla
  deleteMapeo(index : number){
    this.mapeo.puntaje.splice(index, 1)
    this.mapeo.metros.splice(index, 1)
    this.mapeo.codigoError.splice(index, 1)
    console.log(this.mapeo)
  }
  // habilita o sedabilita el boton de insetar si el puntaje cumple con lo requerido
  onPuntajeChange() {
    if (this.punt === undefined || this.punt < 0 || this.punt > 4 ) {
      this.isInvalid = true;
    } else {
      this.isInvalid = false;
    }
  }

  constructor(
    private taskService : TaskService
   ){}
// coloca la informacon en el json de mapeo y lo envia al back
  enviarMapeo(){
    this.mapeo.numeroRollo = this.numRollo;
    this.mapeo.longitudTela=this.longTela;
    this.mapeo.anchoTela = this.anchoTela;
    this.mapeo.puntMax = this.configuracion;

    console.log(this.mapeo)


    this.taskService.sendDataToBackend(this.mapeo).subscribe(response => {
      console.log('Respuesta del servidor:', response);
      this.alert = response
      if(response === false){
        alert("Numero de rollo incorrecto")

      }else{
        alert("Mapeo enviado exitosamente")
        this.mapeo = {
          numeroRollo : "",
          longitudTela : 0,
          codigoError : [],
          metros : [],
          puntaje : []

        }
        this.numRollo="";
        this.longTela=undefined;
        this.anchoTela=undefined;
      }
    });



  }
// verifica si la referencia, el rollo asignado y la longitud cumplan el numero de caracteres espesificado y da un mensaje de error si no cumple
  validateForm() {
    this.numeroRolloError = this.numRollo.length === 14 ? '' : 'El número de rollo debe tener 14 caracteres';
    this.longitudTelaError = this.longTela && this.longTela > 0 ? '' : 'El tamaño de tela debe ser mayor que 0';
    this.anchoTelaError = this.anchoTela && this.anchoTela > 0 ? '' : 'El ancho de tela debe ser mayor que 0';
  }
  //verifica si la referencia, el rollo asignado y la longitud tienen algun error, para abilitar o desabilitar el boton de enviar
  isFormValid() {

    return !this.numeroRolloError && !this.longitudTelaError && !this.anchoTelaError && this.configuracion !== undefined;
  }

  soloNumeros(event: any): void {
    const input = event.target;
    const value = input.value;
    const numericValue = value.replace(/[^0-9]/g, ''); // Filtra los caracteres no numéricos

    if (value !== numericValue) {
      input.value = numericValue;
    }
  }

}
