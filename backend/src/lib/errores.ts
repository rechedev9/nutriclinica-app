// ErrorHttp corta la petición con un estado y un mensaje apto para el usuario ({ error }).
export class ErrorHttp extends Error {
  constructor(
    readonly estado: 400 | 401 | 403 | 404 | 409 | 429,
    mensaje: string,
  ) {
    super(mensaje)
    this.name = 'ErrorHttp'
  }
}
