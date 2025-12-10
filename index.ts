export type MeasurementRecord = {   
  id: string;
  value: string;
  tso_id: string;
  tso__id: string;
  tso_time: string;
  for_datetime: string;
  created_at: string;
  updated_at: string;
  placeOfMeasurementId: string;
  measurementMethodId: string;
}

// Sort records by for_datetime
function sortByDatetime(data: MeasurementRecord[]): MeasurementRecord[] {
  return [...data].sort((a, b) => 
    new Date(a.for_datetime).getTime() - new Date(b.for_datetime).getTime()
  );
}

// Remove duplicates, keeping only the one with most value
function removeDuplicates(data: MeasurementRecord[]): MeasurementRecord[] {
  const grouped = data.reduce((map, record) => {
    const key = `${record.for_datetime}|${record.placeOfMeasurementId}|${record.measurementMethodId}`;
    const existing = map.get(key);
    
    if (!existing || parseFloat(record.value) > parseFloat(existing.value)) {
      map.set(key, record);
    }
    
    return map;
  }, new Map<string, MeasurementRecord>());

  return Array.from(grouped.values());
}

// Helper: Check if time is in midnight window (23:45 - 00:15)
function isInMidnightWindow(datetime: string): boolean {
  const dt = new Date(datetime);
  const hours = dt.getHours();
  const minutes = dt.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  
  // 23:45 = 1425 minutes, 00:15 = 15 minutes
  return timeInMinutes >= 1425 || timeInMinutes <= 15;
}

// Helper: Check if time is exactly 00:00
function isMidnight(datetime: string): boolean {
  const dt = new Date(datetime);
  return dt.getHours() === 0 && dt.getMinutes() === 0;
}

// Helper: Format date as YYYY-MM-DD HH:MM:SS without timezone conversion
function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Build a map of max values in midnight window grouped by place, method, and target midnight date
function buildMidnightWindowMaxMap(data: MeasurementRecord[]): Map<string, number> {
  const midnightWindowRecords = data.filter(record => 
    isInMidnightWindow(record.for_datetime)
  );

  // Group by placeOfMeasurementId, measurementMethodId, and the target midnight date
  const grouped = midnightWindowRecords.reduce((map, record) => {
    const dt = new Date(record.for_datetime);
    const hours = dt.getHours();
    
    // Determine which midnight this record should update
    let targetMidnight: Date;
    if (hours >= 23) {
      // 23:45-23:59 updates the NEXT day's midnight
      targetMidnight = new Date(dt);
      targetMidnight.setDate(targetMidnight.getDate() + 1);
      targetMidnight.setHours(0, 0, 0, 0);
    } else {
      // 00:00-00:15 updates the SAME day's midnight
      targetMidnight = new Date(dt);
      targetMidnight.setHours(0, 0, 0, 0);
    }
    
    const targetMidnightStr = formatDateTime(targetMidnight);
    const key = `${record.placeOfMeasurementId}|${record.measurementMethodId}|${targetMidnightStr}`;
    const value = parseFloat(record.value);
    const existing = map.get(key);
    
    if (!existing || value > existing) {
      map.set(key, value);
    }
    
    return map;
  }, new Map<string, number>());

  return grouped;
}

// Replace midnight values if window has higher value for same place/method/date
function replaceMidnightValues(
  data: MeasurementRecord[], 
  midnightWindowMaxMap: Map<string, number>
): MeasurementRecord[] {
  return data.map(record => {
    if (isMidnight(record.for_datetime)) {
      const key = `${record.placeOfMeasurementId}|${record.measurementMethodId}|${record.for_datetime}`;
      const maxWindowValue = midnightWindowMaxMap.get(key);
      const currentValue = parseFloat(record.value);
      
      if (maxWindowValue !== undefined && maxWindowValue > currentValue) {
        return {
          ...record,
          value: maxWindowValue.toString()
        };
      }
    }
    
    return record;
  });
}

// Main function that orchestrates all steps
export function processTimeSeriesData(data: MeasurementRecord[]): MeasurementRecord[] {
  // Step 1: Sort by for_datetime
  const sorted = sortByDatetime(data);

  // Step 2: Remove duplicates, keeping only max value
  const deduplicated = removeDuplicates(sorted);

  // Step 3: Handle midnight replacement logic
  const midnightWindowMaxMap = buildMidnightWindowMaxMap(deduplicated);
  const result = replaceMidnightValues(deduplicated, midnightWindowMaxMap);

  return result;
}
