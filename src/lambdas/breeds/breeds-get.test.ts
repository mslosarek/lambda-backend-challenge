import fetch, { FetchError } from 'node-fetch'
import AbortController from 'abort-controller'

import { handler, DogBreedsListResponse } from './breeds-get'

const mockedFetch: jest.Mock = fetch as any
const mockedAbortController: jest.Mock = AbortController as any
let mockedAbort: jest.Mock
let promiseResolver: (response: any) => void
let promiseRejecter: (response: any) => void

jest.mock('node-fetch')
jest.mock('abort-controller')

interface AbortError extends Error {
  type?: string
}

const mockPayload = {
  message: {
    sheepdog: ['english', 'shetland'],
    beagle: [],
  },
}

function mockAbortController() {
  mockedAbortController.mockImplementationOnce(() => ({
    abort: jest.fn(),
  }))
}

describe('breeds-get handler', () => {
  afterEach(() => {
    mockedFetch.mockClear()
    mockedAbortController.mockClear()
  })

  describe('when the api returns the expected value', () => {
    beforeEach(() => {
      mockedFetch.mockReturnValueOnce({
        ok: true,
        json: () => {
          return mockPayload
        },
      })
    })

    it('returns payload from fetch request', async () => {
      const response = (await handler()) as DogBreedsListResponse
      expect(response.body).toEqual(
        expect.arrayContaining(['english sheepdog', 'shetland sheepdog', 'beagle']),
      )
      expect(response.body).toHaveLength(3)
    })
  })

  describe('when the api returns an error response', () => {
    beforeEach(() => {
      mockedFetch.mockReturnValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => {
          return null
        },
      })
    })

    it('returns an error response', async () => {
      const response = await handler()
      expect(response).toEqual({
        message: 'Not Found',
        statusCode: 404,
      })
    })
  })

  describe('when the api returns an invalid message', () => {
    beforeEach(() => {
      mockedFetch.mockReturnValueOnce({
        ok: true,
        json: () => {
          return 'invalid body response'
        },
      })
    })

    it('returns an error response', async () => {
      const response = await handler()
      expect(response).toEqual({
        message: 'Something went wrong',
        statusCode: 500,
      })
    })
  })

  describe('when the fetch throws an error', () => {
    beforeEach(() => {
      mockAbortController()
      mockedFetch.mockImplementationOnce(() => {
        throw new FetchError('request failed, reason: socket hang up', 'system')
      })
    })

    it('returns an error response', async () => {
      const response = await handler()
      expect(response).toEqual({
        message: 'Something went wrong',
        statusCode: 500,
      })
    })
  })

  describe('when the api does not return a value', () => {
    beforeEach(() => {
      mockAbortController()
      mockedFetch.mockImplementationOnce(() => {
        const err = new FetchError('request failed, reason: socket hang up', 'system')
        err.code = 'ECONNRESET'
        err.errno = 'ECONNRESET'
        throw err
      })
    })

    it('returns an error response', async () => {
      const response = await handler()
      expect(response).toEqual({
        message: 'Request Timeout',
        statusCode: 408,
      })
    })
  })

  describe('when the takes longer than the timeout', () => {
    beforeEach(() => {
      mockedFetch.mockImplementationOnce(() => {
        return new Promise((resolve, reject) => {
          promiseResolver = resolve
          promiseRejecter = reject

          // this should never get resolved
          setTimeout(() => {
            promiseResolver({
              ok: true,
              json: () => mockPayload,
            })
          }, 9000)
        })
      })

      mockedAbortController.mockImplementationOnce(() => {
        mockedAbort = jest.fn()
        return {
          abort: () => {
            const err = new Error('Request was aborted') as AbortError
            err.type = 'aborted'

            mockedAbort()
            promiseRejecter(err)
          },
        }
      })
    })

    it('returns an error response', async () => {
      const response = await handler()
      expect(mockedAbort).toHaveBeenCalledTimes(1)
      expect(response).toEqual({
        message: 'Request Timeout',
        statusCode: 408,
      })
    }, 10000)
  })
})
