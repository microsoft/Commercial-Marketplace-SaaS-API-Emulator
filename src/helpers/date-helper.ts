import moment from 'moment';

export const durationToMS = (duration: string | number, durationInSeconds: boolean = true): number => {
  if (duration === undefined) {
    return 0;
  }
  if (typeof duration === 'number') {
    return duration / (durationInSeconds ? 1000 : 1);
  }

  return moment.duration(duration).asMilliseconds();
};
