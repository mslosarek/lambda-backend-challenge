import fetch from 'node-fetch'
import AbortController from 'abort-controller'
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
    const abortController = new AbortController()

    // timeout after 6 seconds
    // this could/should be an environment variable or something similar
    const abortTimeout = setTimeout(() => {
      abortController.abort()
    }, 6000)

    // the url this could/should be an environment variable or something similar
    const res = await fetch('https://dog.ceo/api/breeds/list/all', {
      signal: abortController.signal,
    })
    clearTimeout(abortTimeout)

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
    const errorType = err.code || err.type

    switch (errorType) {
      case 'ECONNRESET': // likely means that the server timed out on the request
      case 'aborted': // server took too long to respond ans was aborted
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
