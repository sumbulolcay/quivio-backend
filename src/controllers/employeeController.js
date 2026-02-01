const { Employee, EmployeeWorkingHours } = require('../models');
const subscriptionService = require('../services/subscriptionService');

async function list(req, res, next) {
  try {
    await subscriptionService.requireCoreSubscription(req.businessId);
    const list = await Employee.findAll({
      where: { business_id: req.businessId },
      include: [{ model: EmployeeWorkingHours, as: 'EmployeeWorkingHours', required: false }],
    });
    res.json({ employees: list });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    await subscriptionService.requireCoreSubscription(req.businessId);
    const { name, surname, role, is_active, working_hours } = req.body;
    if (!name || !surname) {
      return res.status(400).json({ code: 'validation_error', message: 'name ve surname zorunlu' });
    }
    const employee = await Employee.create({
      business_id: req.businessId,
      name,
      surname,
      role: role || null,
      is_active: is_active !== false,
    });
    if (Array.isArray(working_hours) && working_hours.length > 0) {
      for (const wh of working_hours) {
        await EmployeeWorkingHours.create({
          employee_id: employee.id,
          day_of_week: wh.day_of_week,
          start_time: wh.start_time,
          end_time: wh.end_time,
          breaks_json: wh.breaks_json || [],
        });
      }
    }
    res.status(201).json(employee);
  } catch (err) {
    next(err);
  }
}

async function patch(req, res, next) {
  try {
    await subscriptionService.requireCoreSubscription(req.businessId);
    const employee = await Employee.findOne({
      where: { id: req.params.id, business_id: req.businessId },
    });
    if (!employee) {
      return res.status(404).json({ code: 'not_found', message: 'Çalışan bulunamadı' });
    }
    const { name, surname, role, is_active, working_hours } = req.body;
    if (name !== undefined) employee.name = name;
    if (surname !== undefined) employee.surname = surname;
    if (role !== undefined) employee.role = role;
    if (typeof is_active === 'boolean') employee.is_active = is_active;
    await employee.save();
    if (Array.isArray(working_hours)) {
      await EmployeeWorkingHours.destroy({ where: { employee_id: employee.id } });
      for (const wh of working_hours) {
        await EmployeeWorkingHours.create({
          employee_id: employee.id,
          day_of_week: wh.day_of_week,
          start_time: wh.start_time,
          end_time: wh.end_time,
          breaks_json: wh.breaks_json || [],
        });
      }
    }
    res.json(employee);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, patch };
