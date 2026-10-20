import { describe, expect, it } from 'vitest';
import { microsToReais, reaisToMicros } from '../../src/index.js';

describe('dinheiro em micros', () => {
  it('converte sem ponto flutuante', () => {
    expect(microsToReais('1000000')).toBe('1');
    expect(microsToReais('1234500')).toBe('1.2345');
    expect(microsToReais('0')).toBe('0');
    expect(microsToReais('-500000')).toBe('-0.5');
    expect(microsToReais('123456789012345678901')).toBe('123456789012345.678901');
    expect(microsToReais('1234567', 2)).toBe('1.23');
    expect(microsToReais('1235000', 2)).toBe('1.24');
    expect(microsToReais('-500000', 2)).toBe('-0.50');
    expect(microsToReais('4000', 2)).toBe('0.00');
  });
  it('valida entrada e faz o caminho inverso', () => {
    expect(() => microsToReais('1.5')).toThrow(TypeError);
    expect(reaisToMicros('12.34')).toBe('12340000');
    expect(reaisToMicros('-0.000001')).toBe('-1');
  });
});
