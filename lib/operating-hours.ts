export const OPERATING_TIME_ZONE = "Asia/Kolkata";
export const OPERATING_START_HOUR = 6;
export const OPERATING_END_HOUR = 21;
export const OPERATING_HOURS_LABEL = "6:00 AM–9:00 PM IST";

const hourInOperatingTimeZone = (date: Date) => {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: OPERATING_TIME_ZONE,
    hour: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(date)
    .find((part) => part.type === "hour")?.value;

  return Number(hour ?? -1);
};

export const isWithinOperatingHours = (date = new Date()) => {
  const hour = hourInOperatingTimeZone(date);
  return hour >= OPERATING_START_HOUR && hour < OPERATING_END_HOUR;
};
