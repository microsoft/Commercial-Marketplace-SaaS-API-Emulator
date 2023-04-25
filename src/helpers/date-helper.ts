import moment from 'moment';

export const durationToMS = (duration: string | number, durationInSeconds: boolean = true, defaultValue: number = 0): number => {
  if (duration === undefined) {
    return defaultValue;
  }
  if (typeof duration === 'number') {
    return duration / (durationInSeconds ? 1000 : 1);
  }

  return moment.duration(duration).asMilliseconds();
};
