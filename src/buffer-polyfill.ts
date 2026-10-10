function base64ToUint8Array(base64: string): Uint8Array {
  try {
    const raw = window.atob(base64.trim().replace(/=+$/, ''));
    const uint8Array = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      uint8Array[i] = raw.charCodeAt(i);
    }
    return uint8Array;
  } catch (e) {
    return new Uint8Array(0);
  }
}

function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  try {
    let binary = '';
    const len = uint8Array.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return window.btoa(binary);
  } catch (e) {
    return '';
  }
}

export class Buffer extends Uint8Array {
  static isBuffer(obj: any): boolean {
    return obj instanceof Uint8Array || (obj && obj._isBuffer);
  }

  static from(value: any, encodingOrOffset?: any, length?: any): Uint8Array {
    if (typeof value === 'string') {
      if (encodingOrOffset === 'base64') {
        return base64ToUint8Array(value);
      }
      const encoder = new TextEncoder();
      return encoder.encode(value);
    }
    if (value instanceof ArrayBuffer) {
      return new Uint8Array(value, encodingOrOffset, length);
    }
    if (ArrayBuffer.isView(value)) {
      return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    }
    if (Array.isArray(value)) {
      return new Uint8Array(value);
    }
    return new Uint8Array(value);
  }

  static alloc(size: number, fill?: any, encoding?: string): Uint8Array {
    const arr = new Uint8Array(size);
    if (fill !== undefined) {
      arr.fill(fill);
    }
    return arr;
  }

  static concat(list: readonly Uint8Array[], totalLength?: number): Uint8Array {
    if (!Array.isArray(list)) {
      throw new TypeError('"list" argument must be an Array of Buffers or Uint8Arrays');
    }

    if (list.length === 0) {
      return new Uint8Array(0);
    }

    let length = totalLength;
    if (length === undefined) {
      length = 0;
      for (let i = 0; i < list.length; i++) {
        length += list[i].length;
      }
    }

    const buffer = new Uint8Array(length);
    let pos = 0;
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      buffer.set(item, pos);
      pos += item.length;
    }

    return buffer;
  }

  toString(encoding?: string): string {
    if (encoding === 'base64') {
      return uint8ArrayToBase64(this);
    }
    const decoder = new TextDecoder(encoding || 'utf-8');
    return decoder.decode(this);
  }
}

// Add prototype property for backwards compatibility
(Buffer.prototype as any)._isBuffer = true;

export default Buffer;
