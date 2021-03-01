import fetch, { FetchError } from 'node-fetch'
import { handler, DogBreedsListResponse } from './breeds-get'

const mockedFetch: jest.Mock = fetch as any

jest.mock('node-fetch')

class ResetError extends FetchError {
  constructor() {
    super('request failed, reason: socket hang up', 'system')
    this.code = 'ECONNRESET'
    this.errno = 'ECONNRESET'
  }
}

describe('breeds-get handler', () => {
  afterEach(() => {
    mockedFetch.mockClear()
  })

  describe('when the api returns the expected value', () => {
    const mockPayload = {
      message: {
        sheepdog: ['english', 'shetland'],
        beagle: [],
      },
    }
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

  describe('when the api does not return a value', () => {
    beforeEach(() => {
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
      mockedFetch.mockImplementationOnce(() => {
        throw new ResetError()
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
})
