import { parseISO, isWithinInterval, format, getSeconds, add } from "date-fns";
import type { MeasurementRecord } from ".";
import { Array as A, pipe } from "effect";
import { getMinutes } from "date-fns/fp";

export type MS = MeasurementRecord;

const buildKey = (data: MS): string =>
    `${data.for_datetime}::${data.placeOfMeasurementId}::${data.measurementMethodId}`;

export const removeDuplicates = (data: MS[]): MS[] => {
    const map = new Map<string, MS>();

    const noDupMap = A.reduce(data, map, (acc, cur) => {
        const key = buildKey(cur);
        const existing = acc.get(key);
        if (
            !existing ||
            Number.parseFloat(existing.value) > Number.parseFloat(cur.value)
        ) {
            acc.set(key, cur);
            return acc;
        }

        return acc;
    });

    return Array.from(noDupMap.values());
};

export const groupByPlaceAndMethod = (arr: MS[]): Map<string, MS[]> => {
    const map = new Map<string, MS[]>();

    const group = A.reduce(arr, map, (acc, cur) => {
        const key = `${cur.placeOfMeasurementId}::${cur.measurementMethodId}`;
        const existing = acc.get(key);
        if (!existing) {
            acc.set(key, [cur]);
            return acc;
        }
        acc.set(key, [...existing, cur]);
        return acc;
    });

    return group;
};

function toDateISOString(dateSqlFormat: string): string {
    return dateSqlFormat.replace(" ", "T") + "Z";
}

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
        const aDate = pipe(a.for_datetime, toDateISOString, (d) => parseISO(d));

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
            toDateISOString,
            parseISO,
            (d) => {
                const mins = getMinutes(d);
                if (mins >= 0 && mins <= 15) {
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

export const groupByDates = (arr: MS[]): Map<string, MS[]> => {
    const map = new Map<string, MS[]>();
    const midnightDates = getUniqueMidnightDates(arr);

    const newMap = A.reduce(midnightDates, map, (acc, date) => {
        const key = date.toISOString();

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
                pipe(item.for_datetime, toDateISOString, parseISO),
                timeWindow,
            ),
        );
        acc.set(key, items);
        return acc;
    });
    return map;
};

export const findMaxValueInGroup = (map: Map<string, MS[]>) => {
    const maxValueOfGroup = [...map.entries()].flatMap(([key, value]) => {
        const head = value[0];

        if (value.length === 0 || head === undefined) {
            return [];
        }

        const maxValueItem = A.reduce(value, head, (acc, cur) => {
            if (Number.parseFloat(cur.value) > Number.parseFloat(acc!.value)) {
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

export const replaceMidnightValue = (arr: MS[]): MS[] => {
    const group = groupByPlaceAndMethod(arr);

    const final = [...group.entries()].map(([key, value]) => {
        const group = groupByDates(value);
        const maxInGroup = findMaxValueInGroup(group);
        console.log(key, "max in group", maxInGroup);

        const newMSList = value.map((ms) => {
            const find = maxInGroup.find((max) => {
                if (
                    max.date.toISOString() === toDateISOString(ms.for_datetime)
                ) {
                    return true;
                }
                return false;
            });
            if (!find) return ms;
            console.log("find", find);
            return {
                ...find.maxItem,
                for_datetime: find.date.toISOString(),
            };
        });

        return newMSList;
    });

    return final.flat();
};
