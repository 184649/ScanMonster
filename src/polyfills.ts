type DOMExceptionConstructor = typeof globalThis.DOMException;
type RuntimeGlobal = typeof globalThis & {
  DOMException?: DOMExceptionConstructor;
  global?: unknown;
};

// React Native / Hermes では DOMException が存在しない場合がある。
// 一部のWeb互換ライブラリが起動時に DOMException を参照するため、
// Appより前に必ず定義しておく。
class RNPolyfillDOMException extends Error {
  public name: string;
  public code: number;

  constructor(message?: string, name?: string) {
    super(message ?? "");
    this.name = name ?? "DOMException";
    this.code = 0;

    if (typeof Object.setPrototypeOf === "function") {
      Object.setPrototypeOf(this, RNPolyfillDOMException.prototype);
    }
  }
}

const defineDOMException = (target: { DOMException?: DOMExceptionConstructor }) => {
  if (typeof target.DOMException === "undefined") {
    Object.defineProperty(target, "DOMException", {
      configurable: true,
      enumerable: false,
      writable: true,
      value: RNPolyfillDOMException
    });
  }
};

const installDOMExceptionPolyfill = () => {
  const g = globalThis as RuntimeGlobal;

  defineDOMException(g);

  if (typeof g.global === "undefined") {
    Object.defineProperty(g, "global", {
      configurable: true,
      enumerable: false,
      writable: true,
      value: g
    });
  }

  const maybeGlobal = g.global;

  if (maybeGlobal && (typeof maybeGlobal === "object" || typeof maybeGlobal === "function")) {
    defineDOMException(maybeGlobal as { DOMException?: DOMExceptionConstructor });
  }
};

installDOMExceptionPolyfill();

export {};
