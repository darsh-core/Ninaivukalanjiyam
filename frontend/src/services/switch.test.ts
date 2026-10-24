import * as real from './api';
import * as mock from './mockApi';
import * as services from './index';
import { NotAvailableError } from './errors';

test('mockApi exports exactly the same functions as api', () => {
  const fns = (m: object) => Object.keys(m).filter(k => typeof (m as any)[k] === 'function' && k !== 'NotAvailableError').sort();
  expect(fns(mock)).toEqual(fns(real));
});
test('services forwards to the mock when VITE_USE_MOCK is true', () => {
  expect(services.IS_MOCK).toBe(true);
  expect(services.getNarrators).toBe(mock.getNarrators);
});
test.each(['getConsent', 'getTopicProgress'])('real %s is a stub that throws NotAvailableError', async (name) => {
  await expect((real as any)[name]('n1')).rejects.toBeInstanceOf(NotAvailableError);
});
