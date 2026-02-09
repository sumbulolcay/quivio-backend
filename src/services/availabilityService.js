const { Employee, EmployeeWorkingHours, Appointment } = require('../models');
const { Op } = require('sequelize');

function parseTime(str) {
  if (!str) return null;
  const [h, m] = String(str).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatSlot(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getDayOfWeek(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.getDay();
}

function getTodayDateStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

async function getSlotsForEmployee(businessId, employeeId, dateStr) {
  const todayStr = getTodayDateStr();
  if (dateStr < todayStr) return [];
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const employee = await Employee.findOne({
    where: { id: employeeId, business_id: businessId, is_active: true },
  });
  if (!employee) return [];
  const day = getDayOfWeek(dateStr);
  const wh = await EmployeeWorkingHours.findAll({
    where: { employee_id: employeeId, day_of_week: day },
  });
  const dayWh = wh;
  if (dayWh.length === 0) return [];

  const slotDuration = 30;
  const slots = [];
  for (const row of dayWh) {
    const startMin = parseTime(row.start_time);
    const endMin = parseTime(row.end_time);
    if (startMin == null || endMin == null) continue;
    for (let m = startMin; m + slotDuration <= endMin; m += slotDuration) {
      slots.push(formatSlot(m));
    }
  }

  const appointments = await Appointment.findAll({
    where: {
      business_id: businessId,
      employee_id: employeeId,
      status: { [Op.ne]: 'cancelled' },
      starts_at: {
        [Op.gte]: new Date(dateStr + 'T00:00:00'),
        [Op.lt]: new Date(dateStr + 'T23:59:59'),
      },
    },
    attributes: ['starts_at'],
  });

  const taken = new Set();
  for (const a of appointments) {
    const d = new Date(a.starts_at);
    const slot = formatSlot(d.getHours() * 60 + d.getMinutes());
    taken.add(slot);
  }

  let result = slots.filter((s) => !taken.has(s));
  if (dateStr === todayStr) {
    result = result.filter((s) => parseTime(s) > nowMinutes);
  }
  return result;
}

module.exports = {
  getSlotsForEmployee,
  getDayOfWeek,
  formatSlot,
};
