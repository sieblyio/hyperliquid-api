import { HyperliquidApiError, RestClient } from '../../src/index.js';

class ErrorTestClient extends RestClient {
  mockPost(implementation: () => Promise<unknown>): void {
    jest
      .spyOn(this.axios, 'post')
      .mockImplementation(implementation as unknown as typeof this.axios.post);
  }
}

describe('REST errors', () => {
  test('turns status err responses into typed errors', async () => {
    const client = new ErrorTestClient();
    client.mockPost(async () => ({
      data: {
        status: 'err',
        response: 'Rejected',
        signature: { r: 'secret-r', s: 'secret-s', v: 27 },
      },
      status: 200,
    }));

    await expect(client.getAllMids()).rejects.toMatchObject({
      name: 'HyperliquidApiError',
      message: 'Rejected',
      response: {
        status: 'err',
        response: 'Rejected',
        signature: { r: 'secret-r', s: 'secret-s', v: 27 },
      },
      status: 200,
    });
  });

  test('normalizes Axios failures without rewriting the response', async () => {
    const client = new ErrorTestClient();
    client.mockPost(async () => {
      throw {
        code: 'ECONNRESET',
        isAxiosError: true,
        message: 'socket reset',
        response: {
          data: {
            request: {
              authorization: 'Bearer secret',
              signature: { r: 'secret-r', s: 'secret-s' },
            },
          },
          status: 503,
        },
      };
    });

    let caught: unknown;
    try {
      await client.getAllMids();
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(HyperliquidApiError);
    expect(caught).toMatchObject({
      code: 'ECONNRESET',
      message: 'socket reset',
      response: {
        request: {
          authorization: 'Bearer secret',
          signature: { r: 'secret-r', s: 'secret-s' },
        },
      },
      status: 503,
    });
  });

  test('does not hide non-HTTP programming errors', async () => {
    const client = new ErrorTestClient();
    const error = new TypeError('broken adapter');
    client.mockPost(async () => {
      throw error;
    });

    await expect(client.getAllMids()).rejects.toBe(error);
  });
});
