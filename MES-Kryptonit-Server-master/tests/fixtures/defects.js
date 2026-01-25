const defects = [
  {
    id: 201,
    boardType: 'FC',
    status: 'OPEN',
    detectedAt: new Date('2024-01-10T10:00:00Z'),
    serialNumber: 'SN-001',
    categoryId: 1,
  },
  {
    id: 202,
    boardType: 'ELRS915',
    status: 'REPAIRED',
    detectedAt: new Date('2024-01-08T09:30:00Z'),
    serialNumber: 'SN-002',
    categoryId: 2,
  },
];

const defectStats = [
  { status: 'OPEN', count: '1' },
  { status: 'REPAIRED', count: '1' },
];

const categories = [
  { id: 1, code: 'COLD_SOLDER', title: 'Холодная пайка', severity: 'MAJOR' },
  { id: 2, code: 'BROKEN_TRACE', title: 'Повреждение дорожки', severity: 'CRITICAL' },
];

module.exports = {
  defects,
  defectStats,
  categories,
};
