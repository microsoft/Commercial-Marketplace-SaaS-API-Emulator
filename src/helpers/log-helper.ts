export const logObject: (o: any, indentLevel?: number) => void = (o, indentLevel = 0) => {
  for (const i in o) {
    if (!Object.prototype.hasOwnProperty.call(o, i)) {
      return;
    }
    const v = o[i];
    if (typeof v === 'object') {
      console.log(`${' '.repeat(indentLevel * 2)}${i}:`);
      logObject(v, indentLevel + 1);
    } else {
      console.log(`${' '.repeat(indentLevel * 2)}${i}: ${v as string}`);
    }
  }
};
