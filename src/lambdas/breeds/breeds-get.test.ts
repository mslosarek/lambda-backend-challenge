import fetch, { FetchError } from 'node-fetch'
import { handler, DogBreedsListResponse } from './breeds-get'

const mockedFetch: jest.Mock = fetch as any

jest.mock('node-fetch')

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
        status: 408,
        statusText: 'Request Timeout',
        json: () => {
          return null
        },
      })
    })

    it('returns an error response', async () => {
      const response = (await handler()) as DogBreedsListResponse
      expect(response).toEqual({
        message: 'Request Timeout',
        statusCode: 408,
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
      const response = (await handler()) as DogBreedsListResponse
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
      const response = (await handler()) as DogBreedsListResponse
      expect(response).toEqual({
        message: 'Something went wrong',
        statusCode: 500,
      })
    })
  })
})
