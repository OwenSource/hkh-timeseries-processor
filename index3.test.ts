import { describe, it, expect } from "vitest";
import {
    replaceMidnightValue,
    findMaxValueInDateGroup,
    getByMidnightWindow,
    getUniqueMidnightDates,
    groupByMidnightDates,
    groupByPlaceAndMethod,
    removeDuplicates,
    type MS,
} from "./index3";
import json4Test from "./tso-value-4.json"
import json100Test from "./value100.json"
import jsonTest from "./tso-value.json"

describe("removeDuplicates", async () => {
    const json4 = json4Test as MS[];
    const json = jsonTest as MS[];

    describe("remove dup", () => {
        it("remove dup for json100", () => {
            const result = removeDuplicates(json);
            expect(result.length).toBeLessThan(json.length);
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
            // console.log({ group });
            expect(Array.from(group.keys()).length).toBe(41);
        });
    });

    describe("filter midnight window", () => {
        it("midnight list for json100", () => {
            const result = removeDuplicates(json);
            const midnightList = getByMidnightWindow(result);
            // console.log(midnightList);

            expect(midnightList.length).toBe(4);
        });

        it("get midnight", () => {
            const result = removeDuplicates(json);
            const midnightList = getByMidnightWindow(result);

            const midNightDates = getUniqueMidnightDates(midnightList);
            expect(midNightDates.length).toBe(2);
        });
    });

    describe("max value", () => {
        it("group midnight data", () => {
            const result = removeDuplicates(json);

            const group = groupByMidnightDates(result);

            const groupArr = [...group.values()];

            expect(groupArr.length).toBe(2);
        });

        it("should get max value json 4", () => {
            const result = removeDuplicates(json4);

            const final = replaceMidnightValue(result);

            expect(final).toMatchSnapshot();
        });

        it("should get max value json 100", () => {
            const result = removeDuplicates(json);
            console.log("result", result)

            const final = replaceMidnightValue(result);
            console.log("final", final)

            expect(final).toMatchSnapshot();
        });
    });
});
