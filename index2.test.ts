import { describe, it, expect } from "vitest";
import {
    findMaxValueInGroup,
    getByMidnightWindow,
    getUniqueMidnightDates,
    groupByDates,
    groupByPlaceAndMethod,
    removeDuplicates,
    replaceMidnightValue,
    type MS,
} from "./index2";

describe("removeDuplicates", async () => {
    const json4 = (await Bun.file("value4.json").json()) as MS[];
    const json100 = (await Bun.file("value100.json").json()) as MS[];
    const json = (await Bun.file(
        "tso_value_of_measurement.json",
    ).json()) as MS[];

    describe("remove dup", () => {
        it("remove dup for json100", () => {
            const result = removeDuplicates(json100);
            expect(result.length).toBeLessThan(json100.length);
        });

        it("remove dup for json", () => {
            const result = removeDuplicates(json);
            expect(result.length).toBeLessThan(json.length);
        });
    });

    describe("group by place and method", () => {
        it("get group", () => {
            const result = removeDuplicates(json);
            const group = groupByPlaceAndMethod(result);
            console.log({ group });
            expect(Array.from(group.keys()).length).toBe(41);
        });
    });

    describe("filter midnight window", () => {
        it("midnight list for json100", () => {
            const result = removeDuplicates(json100);
            const midnightList = getByMidnightWindow(result);
            console.log(midnightList);

            expect(midnightList.length).toBe(4);
        });

        it("get midnight", () => {
            const result = removeDuplicates(json100);
            const midnightList = getByMidnightWindow(result);

            const midNightDates = getUniqueMidnightDates(midnightList);
            expect(midNightDates.length).toBe(2);
        });
    });

    describe("max value", () => {
        it("group midnight data", () => {
            const result = removeDuplicates(json100);

            const group = groupByDates(result);

            const groupArr = [...group.values()];

            expect(groupArr.length).toBe(2);
        });

        it("should get max value", () => {
            const result = removeDuplicates(json4);

            const final = replaceMidnightValue(result);

            const expected = [
                {
                    id: "66991539",
                    value: "500000",
                    tso_id: "25",
                    tso__id: "655d76a8472ca292a2015f22",
                    tso_time: "2025-12-09 23:12:06",
                    for_datetime: "2025-12-09 23:45:00",
                    created_at: "2025-12-09 09:13:09.505916",
                    updated_at: "2025-12-09 09:13:09.505916",
                    placeOfMeasurementId: "774",
                    measurementMethodId: "333965",
                },
                {
                    id: "66991538",
                    value: "1000",
                    tso_id: "24",
                    tso__id: "655d76a8472ca292a2015f21",
                    tso_time: "2025-12-09 23:12:06",
                    for_datetime: "2025-12-08 00:00:00",
                    created_at: "2025-12-09 09:13:09.501152",
                    updated_at: "2025-12-09 09:13:09.501152",
                    placeOfMeasurementId: "775",
                    measurementMethodId: "333963",
                },
                {
                    id: "66991537",
                    value: "65.62369848632812",
                    tso_id: "24",
                    tso__id: "655d76a8472ca292a2015f21",
                    tso_time: "2025-12-09 23:12:06",
                    for_datetime: "2025-12-09 23:46:00",
                    created_at: "2025-12-09 09:13:09.499956",
                    updated_at: "2025-12-09 09:13:09.499956",
                    placeOfMeasurementId: "775",
                    measurementMethodId: "333963",
                },
                {
                    id: "66991536",
                    value: "66.15499169921875",
                    tso_id: "23",
                    tso__id: "655d76a8472ca292a2015f20",
                    tso_time: "2025-12-09 23:12:06",
                    for_datetime: "2025-12-09 00:14:00",
                    created_at: "2025-12-09 09:13:09.495789",
                    updated_at: "2025-12-09 09:13:09.495789",
                    placeOfMeasurementId: "774",
                    measurementMethodId: "333963",
                },
            ];

            expect(final).toEqual(expected);
        });
    });
});
