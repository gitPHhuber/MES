const users = [
  {
    id: 1,
    login: 'tester',
    name: 'Тест',
    surname: 'Пользователь',
    role: 'WAREHOUSE_MASTER',
  },
  {
    id: 2,
    login: 'qc_user',
    name: 'ОТК',
    surname: 'Инженер',
    role: 'QC_ENGINEER',
  },
];

module.exports = {
  users,
  primaryUser: users[0],
  qcUser: users[1],
};
