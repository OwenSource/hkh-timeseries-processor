import { parseISO, isWithinInterval, format, add, formatISO } from "date-fns";
// import { format as formatFp, addMinutes } from "date-fns/fp";
import { Array as A, Brand, pipe } from "effect";
import { getMinutes } from "date-fns/fp";

export interface MS {
  value: number
  tso_id: number
  tso__id: string
  tso_time: string
  for_datetime: string
  measurement_method: MeasurementMethod
  place_of_measurement: PlaceOfMeasurement
}

export interface MeasurementMethod {
  name: string
  unit: string
}

export interface PlaceOfMeasurement {
  name: string
  source_name: string
}

const buildKey = (data: MS): string =>
    `${data.for_datetime}::${JSON.stringify(data.place_of_measurement)}::${JSON.stringify(data.measurement_method)}`;

export const removeDuplicates = (data: MS[]): MS[] => {
    const map = new Map<string, MS>();

    const noDupMap = A.reduce(data, map, (acc, cur) => {
        const key = buildKey(cur);
        const existing = acc.get(key);
        if ( !existing ||existing.value > cur.value) {
            acc.set(key, cur);
            return acc;
        }

        return acc;
    });

    return Array.from(noDupMap.values());
};

export const measurementRecordListToMap = (arr: MS[]): Map<DateISO, MS> =>
    A.reduce(arr, new Map<DateISO, MS>(), (acc, cur) => {
        const key = pipe(
            cur.for_datetime,
            parseISO,
            formatISO,
            DateISO,
        );

        acc.set(key, cur);
        return acc;
    });

type PlaceAndMethod = string & Brand.Brand<"PlaceAndMethod">;
const PlaceAndMethod = Brand.nominal<PlaceAndMethod>();
export const groupByPlaceAndMethod = (arr: MS[]): Map<PlaceAndMethod, MS[]> => {
    const map = new Map<PlaceAndMethod, MS[]>();

    const group = A.reduce(arr, map, (acc, cur) => {
        const key = `${JSON.stringify(cur.place_of_measurement)}::${JSON.stringify(cur.measurement_method)}`;
        const pmKey = PlaceAndMethod(key);
        const existing = acc.get(pmKey);
        if (!existing) {
            acc.set(pmKey, [cur]);
            return acc;
        }
        acc.set(pmKey, [...existing, cur]);
        return acc;
    });

    return group;
};


const setHours = (
    date: Date,
    {
        hours,
        minutes,
        seconds,
    }: { hours: number; minutes: number; seconds: number },
): Date => {
    const d = new Date(date);
    d.setUTCHours(hours, minutes, seconds);
    return d;
};

export const getByMidnightWindow = (arr: MS[]): MS[] => {
    return arr.filter((a) => {
        const aDate = pipe(a.for_datetime, (d) => parseISO(d));

        const beforeMidnight = {
            start: setHours(aDate, { hours: 23, minutes: 45, seconds: 0 }),
            end: setHours(aDate, { hours: 23, minutes: 59, seconds: 59 }),
        };
        const afterMidnight = {
            start: setHours(aDate, { hours: 0, minutes: 0, seconds: 0 }),
            end: setHours(aDate, { hours: 0, minutes: 15, seconds: 0 }),
        };
        return (
            isWithinInterval(aDate, beforeMidnight) ||
            isWithinInterval(aDate, afterMidnight)
        );
    });
};

const setMidnight = (date: Date): Date =>
    setHours(date, { hours: 0, minutes: 0, seconds: 0 });

export const getUniqueMidnightDates = (arr: MS[]): Date[] => {
    const map = new Map<string, Date>();

    const dateMap = A.reduce(arr, map, (acc, cur) => {
        const date = pipe(
            cur.for_datetime,
            parseISO,
            (d) => {
                const mins = getMinutes(d);
                if (mins > 0 && mins <= 15) {
                    return add(d, { days: -1 });
                }
                return d;
            },
            setMidnight,
        );
        const key = date.toISOString();
        const existing = acc.get(key);
        if (!existing) {
            acc.set(key, date);
        }

        return acc;
    });

    return Array.from(dateMap.values());
};

type DateISO = string & Brand.Brand<"DateISO">;
const DateISO = Brand.nominal<DateISO>();
export const groupByMidnightDates = (arr: MS[]): Map<DateISO, MS[]> => {
    const map = new Map<DateISO, MS[]>();
    const midnightDates = getUniqueMidnightDates(arr);
    console.log(midnightDates)

    const newMap = A.reduce(midnightDates, map, (acc, date) => {
        const key = date.toISOString();
        const isoKey = DateISO(key);

        const timeWindow = {
            start: setHours(date, { hours: 23, minutes: 45, seconds: 0 }),
            end: setHours(add(date, { days: 1 }), {
                hours: 0,
                minutes: 15,
                seconds: 0,
            }),
        };

        const items = arr.filter((item) =>
            isWithinInterval(
                pipe(item.for_datetime, parseISO),
                timeWindow,
            ),
        );
        acc.set(isoKey, items);
        return acc;
    });
    return newMap;
};

export const findMaxValueInDateGroup = (map: Map<DateISO, MS[]>) => {
    const maxValueOfGroup = [...map.entries()].flatMap(([key, value]) => {
        const head = value[0];

        if (value.length === 0 || head === undefined) {
            return [];
        }

        const maxValueItem = A.reduce(value, head, (acc, cur) => {
            if (cur.value > acc!.value) {
                return cur;
            }
            return acc;
        });

        return {
            date: parseISO(key),
            maxItem: maxValueItem,
        };
    });

    return maxValueOfGroup;
};

const isSameDate = (a: Date, b: Date) =>
    format(a, "yyyy-MM-ddTHH:mm:ss") === format(b, "yyyy-MM-ddTHH:mm:ss");

export const replaceSingleMidnightValue = ([key, value]: [
    PlaceAndMethod,
    MS[],
]): MS[] => {
    const midnightGroup = groupByMidnightDates(value);
    console.log("group by midnight date", midnightGroup);
    const maxInGroup = findMaxValueInDateGroup(midnightGroup);
    console.log(key, "max in group", maxInGroup);
    const msValueMap = measurementRecordListToMap(value);

    maxInGroup.forEach((max) => {
        const key = pipe(max.date, formatISO, DateISO);
        msValueMap.set(key, {
            ...max.maxItem,
            for_datetime: max.date.toISOString(),
        });
    });

    return [...msValueMap.values()];
};

export const replaceMidnightValue = (arr: MS[]): MS[] => {
    const group = groupByPlaceAndMethod(arr);
    const final = [...group.entries()].flatMap(replaceSingleMidnightValue);
    return final;
};
