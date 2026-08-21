import { DefaultLogger } from '../../src/index.js';

describe('DefaultLogger', () => {
  test('keeps trace quiet and forwards info and errors to the console', () => {
    const info = jest.spyOn(console, 'info').mockImplementation(() => {});
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});

    DefaultLogger.trace('trace');
    DefaultLogger.info('info', 1);
    DefaultLogger.error('error', 2);

    expect(info).toHaveBeenCalledWith(['info', 1]);
    expect(error).toHaveBeenCalledWith(['error', 2]);

    info.mockRestore();
    error.mockRestore();
  });
});
