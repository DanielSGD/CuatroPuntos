import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class TaskService {

  constructor(
    private http: HttpClient
  ) { }

  sendDataToBackend(data: any) {
    const url = "http://192.168.93.95:4000/tratamiento"; // Reemplaza con la URL de tu servidor Node.js
    return this.http.post(url, data);
  }




}

