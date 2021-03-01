import fetch from 'node-fetch'
import { Response, ErrorResponse } from '../types'

export interface DogBreedsListResponse extends Response {
  body: string[]
}

interface DogBreedsObject {
  message: {
    [key: string]: string[]
  }
  status: string
}

function reduceBreedResponse(
  collector: string[],
  [breed, subBreeds]: [string, string[]],
): string[] {
  if (subBreeds && subBreeds.length) {
    return [...collector, ...subBreeds.map((subBreed) => `${subBreed} ${breed}`)]
  }
  return [...collector, breed]
}

export async function handler(): Promise<DogBreedsListResponse | ErrorResponse> {
  try {
    // this could be wrapped in a Promise.race to force a timeout (lambda should stop execution)
    // or an AbortController could be used: https://github.com/node-fetch/node-fetch#request-cancellation-with-abortsignal
    
    // the url could/should be replace with a environment variable or something similar
    const res = await fetch('https://dog.ceo/api/breeds/list/all')

    if (!res.ok) {
      return {
        statusCode: res.status,
        message: res.statusText || 'Error Loading Dog Breeds',
      }
    }

    const payload: DogBreedsObject = await res.json()
    const flattenedDogList: string[] = Object.entries(payload.message).reduce(
      reduceBreedResponse,
      [],
    )

    return {
      statusCode: 200,
      body: flattenedDogList,
    }
  } catch (err) {
    switch (err.code) {
      case 'ECONNRESET': // likely means that the server timed out on the request
        return {
          statusCode: 408,
          message: 'Request Timeout',
        }
      default:
        return {
          statusCode: 500,
          message: 'Something went wrong',
        }
    }
  }
}
