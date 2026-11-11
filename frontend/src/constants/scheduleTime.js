export const PERIODS = [
  { id: 1, name: 'Tiết 1', start: '07:00', end: '07:50' },
  { id: 2, name: 'Tiết 2', start: '07:55', end: '08:45' },
  { id: 3, name: 'Tiết 3', start: '08:50', end: '09:40' },
  { id: 4, name: 'Tiết 4', start: '09:50', end: '10:40' },
  { id: 5, name: 'Tiết 5', start: '10:45', end: '11:35' },
  { id: 6, name: 'Tiết 6', start: '12:30', end: '13:20' },
  { id: 7, name: 'Tiết 7', start: '13:25', end: '14:15' },
  { id: 8, name: 'Tiết 8', start: '14:20', end: '15:10' },
  { id: 9, name: 'Tiết 9', start: '15:20', end: '16:10' },
  { id: 10, name: 'Tiết 10', start: '16:15', end: '17:05' },
  { id: 11, name: 'Tiết 11', start: '17:30', end: '18:20' },
  { id: 12, name: 'Tiết 12', start: '18:25', end: '19:15' },
  { id: 13, name: 'Tiết 13', start: '19:20', end: '20:10' },
  { id: 14, name: 'Tiết 14', start: '20:15', end: '21:05' },
];

export const SESSION_LABELS = ['Sáng', 'Chiều', 'Tối'];

export const CLASS_SHIFT_OPTIONS = [
  { label: 'Ca 1 (07:00 - 08:45)', start: 1, end: 2 },
  { label: 'Ca 2 (08:50 - 10:40)', start: 3, end: 4 },
  { label: 'Ca 3 (10:45 - 13:20)', start: 5, end: 6 },
  { label: 'Ca 4 (13:25 - 15:10)', start: 7, end: 8 },
  { label: 'Ca 5 (15:20 - 17:05)', start: 9, end: 10 },
  { label: 'Ca 6 (17:30 - 19:15)', start: 11, end: 12 },
  { label: 'Ca 7 (19:20 - 21:05)', start: 13, end: 14 },
];

export const SHIFT_TO_PERIODS = CLASS_SHIFT_OPTIONS.reduce((acc, item) => {
  acc[item.label] = { start: item.start, end: item.end };
  return acc;
}, {});

export const getPeriodById = (id) => PERIODS.find((period) => period.id === Number(id));

export const formatPeriodLabel = (start, end = start) => {
  const startId = Number(start);
  const endId = Number(end || start);
  return `Tiết ${startId}${endId && endId !== startId ? `-${endId}` : ''}`;
};

export const formatPeriodTimeRange = (start, end = start) => {
  const first = getPeriodById(start);
  const last = getPeriodById(end || start);
  if (!first || !last) return '';
  return `${first.start} - ${last.end}`;
};

export const getSessionLabelFromPeriod = (start) => {
  const periodId = Number(start);
  if (!periodId || periodId <= 5) return 'Sáng';
  if (periodId <= 10) return 'Chiều';
  return 'Tối';
};

export const getAvailablePeriodRanges = (periodCount = 1) => {
  const length = Math.max(1, Math.min(Number(periodCount) || 1, PERIODS.length));
  const ranges = [];

  for (let start = 1; start <= PERIODS.length - length + 1; start += 1) {
    const end = start + length - 1;
    ranges.push({
      id: length === 1 ? `${start}` : `${start}-${end}`,
      start,
      end,
      label: `${formatPeriodLabel(start, end)} (${formatPeriodTimeRange(start, end)})`,
    });
  }

  return ranges;
};
