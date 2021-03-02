// types specific to function handlers

export interface Response {
  statusCode: number
}

export interface ErrorResponse extends Response {
  message: string
}
