import { JsonRpcProvider } from '@ethersproject/providers'
import { ENS } from '..'
import setup from '../tests/setup'
import { ENSJSError } from '../utils/errors'
import { Owner } from './getOwner'

let ensInstance: ENS
let revert: Awaited<ReturnType<typeof setup>>['revert']
let provider: JsonRpcProvider
let accounts: string[]

beforeAll(async () => {
  ;({ ensInstance, revert, provider } = await setup())
  accounts = await provider.listAccounts()
})

afterAll(async () => {
  await revert()
})

describe('getOwner', () => {
  it('should return undefined for an nonexistent .eth name', async () => {
    const result = await ensInstance.getOwner('nonexistent.eth', {
      skipGraph: false,
    })
    expect(result).toBeUndefined()
  })

  it('should return correct ownership level and values for a wrapped .eth name', async () => {
    const result = await ensInstance.getOwner('wrapped.eth')
    expect(result).toEqual({
      ownershipLevel: 'nameWrapper',
      owner: accounts[1],
      expired: false,
    })
  })
  it('should return correct ownership level and values for an expired wrapped .eth name', async () => {
    const result = await ensInstance.getOwner('expired-wrapped.eth', {
      skipGraph: false,
    })
    expect(result).toEqual({
      ownershipLevel: 'nameWrapper',
      owner: '0x0000000000000000000000000000000000000000',
      expired: true,
    })
  })
  it('should return correct ownership level and values for an unwrapped .eth name', async () => {
    const result = await ensInstance.getOwner('test123.eth')
    expect(result).toEqual({
      ownershipLevel: 'registrar',
      owner: accounts[1],
      registrant: accounts[1],
      expired: false,
    })
  })
  it('should return correct ownership level and values for an expired unwrapped .eth name', async () => {
    const result = await ensInstance.getOwner('expired.eth', {
      skipGraph: false,
    })
    expect(result).toEqual({
      ownershipLevel: 'registrar',
      owner: accounts[1],
      registrant: accounts[1].toLowerCase(),
      expired: true,
    })
  })

  describe('subname', () => {
    it('should return correct ownership level and values for a unwrapped name', async () => {
      const result = await ensInstance.getOwner('test.with-subnames.eth')
      expect(result).toEqual({
        ownershipLevel: 'registry',
        owner: accounts[2],
      })
    })
    it('should return correct ownership level and values for a wrapped name', async () => {
      const result = await ensInstance.getOwner(
        'test.wrapped-with-subnames.eth',
      )
      expect(result).toEqual({
        ownershipLevel: 'nameWrapper',
        owner: accounts[2],
      })
    })

    it('should return correct ownership level and values for an expired wrapped name', async () => {
      const result = await ensInstance.getOwner('test.expired-wrapped.eth')
      expect(result).toEqual({
        ownershipLevel: 'nameWrapper',
        owner: accounts[2],
      })
    })
  })

  // Only 2LDEth names need to be tested
  describe('skipGraph', () => {
    it('should return undefined for an nonexistent .eth name', async () => {
      const result = await ensInstance.getOwner('nonexistent.eth', {
        skipGraph: true,
      })
      expect(result).toBeUndefined()
    })

    it('should return correct ownership level and values for a wrapped .eth name', async () => {
      const result = await ensInstance.getOwner('wrapped.eth', {
        skipGraph: true,
      })
      expect(result).toEqual({
        ownershipLevel: 'nameWrapper',
        owner: accounts[1],
        expired: false,
      })
    })

    it('should return correct ownership level and values for an expired wrapped .eth name', async () => {
      const result = await ensInstance.getOwner('expired-wrapped.eth', {
        skipGraph: true,
      })

      expect(result).toEqual({
        ownershipLevel: 'nameWrapper',
        owner: '0x0000000000000000000000000000000000000000',
        expired: true,
      })
    })

    it('should return correct ownership level and values for an unwrapped .eth name', async () => {
      const result = await ensInstance.getOwner('test123.eth', {
        skipGraph: true,
      })
      expect(result).toEqual({
        ownershipLevel: 'registrar',
        owner: accounts[1],
        registrant: accounts[1],
        expired: false,
      })
    })

    it('should return registrant undefined if skipGraph is true for an unwrapped .eth name', async () => {
      const result = await ensInstance.getOwner('expired.eth', {
        skipGraph: true,
      })
      expect(result).toEqual({
        ownershipLevel: 'registrar',
        owner: accounts[1],
        expired: true,
      })
    })

    it('should return correct ownership level and values for a unwrapped subname', async () => {
      const result = await ensInstance.getOwner('test.with-subnames.eth', {
        skipGraph: true,
      })
      expect(result).toEqual({
        ownershipLevel: 'registry',
        owner: accounts[2],
      })
    })

    it('should return correct ownership level and values for a wrapped subname', async () => {
      const result = await ensInstance.getOwner(
        'test.wrapped-with-subnames.eth',
        { skipGraph: true },
      )
      expect(result).toEqual({
        ownershipLevel: 'nameWrapper',
        owner: accounts[2],
      })
    })
  })

  describe('errors', () => {
    beforeAll(() => {
      process.env.NODE_ENV = 'development'
      jest
        .spyOn(provider, 'getBlock')
        .mockImplementation(() =>
          Promise.resolve({ timestamp: 1671169189 } as any),
        )
    })
    afterAll(() => {
      process.env.NODE_ENV = 'test'
      localStorage.removeItem('ensjs-debug')
    })

    describe('ENSJSSubgraphIndexingError', () => {
      beforeAll(() => {
        localStorage.setItem('ensjs-debug', 'ENSJSSubgraphIndexingError')
      })
      afterAll(() => {
        localStorage.removeItem('ensjs-debug')
      })

      it('should return correct ownership level and values for an expired wrapped .eth name', async () => {
        try {
          await ensInstance.getOwner('expired-wrapped.eth', {
            skipGraph: false,
          })
          expect(true).toBeFalsy()
        } catch (e: unknown) {
          const error = e as ENSJSError<Owner>
          expect(error).toBeInstanceOf(ENSJSError)
          expect(error.name).toBe('ENSJSSubgraphIndexingError')
          expect(error.data).toEqual({
            owner: '0x0000000000000000000000000000000000000000',
            ownershipLevel: 'nameWrapper',
            expired: true,
          })
          expect(error.timestamp).toBe(1671169189)
        }
      })

      it('should return correct ownership level and values for an expired unwrapped .eth name', async () => {
        try {
          await ensInstance.getOwner('expired.eth', { skipGraph: false })
          expect(true).toBeFalsy()
        } catch (e) {
          const error = e as ENSJSError<Owner>
          expect(error).toBeInstanceOf(ENSJSError)
          expect(error.name).toBe('ENSJSSubgraphIndexingError')
          expect(error.data).toEqual({
            registrant: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
            owner: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
            ownershipLevel: 'registrar',
            expired: true,
          })
          expect(error.timestamp).toBe(1671169189)
        }
      })
    })

    describe('ENSJSUnknownError', () => {
      beforeAll(() => {
        localStorage.setItem('ensjs-debug', 'ENSJSUnknownError')
      })

      afterAll(() => {
        localStorage.removeItem('ensjs-debug')
      })

      it('should return undefined for a name that does not exist', async () => {
        await expect(
          ensInstance.getOwner('notexistent.eth', {
            skipGraph: true,
          }),
        ).resolves.toBeUndefined()
      })

      it('should throw error for wrapped 2LD eth', async () => {
        await expect(
          ensInstance.getOwner('expired-wrapped.eth', { skipGraph: false }),
        ).rejects.toThrow(ENSJSError)
      })

      it('should throw error for unwrapped 2LD eth', async () => {
        await expect(
          ensInstance.getOwner('expired.eth', { skipGraph: false }),
        ).rejects.toThrow(ENSJSError)
      })

      it('should not throw error for subname eth', async () => {
        await expect(
          ensInstance.getOwner('test.expired-wrapped.eth', {
            skipGraph: false,
          }),
        ).resolves.toBeDefined()
      })
    })
  })
})
