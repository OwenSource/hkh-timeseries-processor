import rawData from "./tso_value_of_measurement.json"
// import rawData from "./test.json"
import { processTimeSeriesData, type MeasurementRecord } from "./index"

const data: MeasurementRecord[] = rawData;

function testProcessor() {
  console.log("=== MOCK DATA TEST ===\n");
  
  const mockData = data
  console.log("Input data count:", mockData.length);
  
  const processed = processTimeSeriesData(mockData);
  console.log("Output data count:", processed.length);
  console.log("\n=== PROCESSED RESULTS ===\n");
  
//   processed.forEach(record => {
//     console.log(`ID: ${record.id} | DateTime: ${record.for_datetime} | Value: ${record.value} | Place: ${record.placeOfMeasurementId} | Method: ${record.measurementMethodId}`);
//   });
}

testProcessor();
