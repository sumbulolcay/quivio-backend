const { sequelize } = require('../config/database');

const Business = require('./Business');
const BusinessSettings = require('./BusinessSettings');
const Employee = require('./Employee');
const EmployeeWorkingHours = require('./EmployeeWorkingHours');
const Contact = require('./Contact');
const ContactTag = require('./ContactTag');
const ContactTagMap = require('./ContactTagMap');
const Customer = require('./Customer');
const OtpChallenge = require('./OtpChallenge');
const WaUser = require('./WaUser');
const Plan = require('./Plan');
const Subscription = require('./Subscription');
const SubscriptionEvent = require('./SubscriptionEvent');
const Invoice = require('./Invoice');
const WhatsappIntegration = require('./WhatsappIntegration');
const Appointment = require('./Appointment');
const AppointmentRequestLog = require('./AppointmentRequestLog');
const QueueEntry = require('./QueueEntry');
const WhatsappSession = require('./WhatsappSession');
const WhatsappMessageLog = require('./WhatsappMessageLog');
const BookingSettings = require('./BookingSettings');

Business.hasOne(BusinessSettings, { foreignKey: 'business_id' });
BusinessSettings.belongsTo(Business, { foreignKey: 'business_id' });

Business.hasOne(BookingSettings, { foreignKey: 'business_id' });
BookingSettings.belongsTo(Business, { foreignKey: 'business_id' });

Business.hasMany(Employee, { foreignKey: 'business_id' });
Employee.belongsTo(Business, { foreignKey: 'business_id' });

Employee.hasMany(EmployeeWorkingHours, { foreignKey: 'employee_id' });
EmployeeWorkingHours.belongsTo(Employee, { foreignKey: 'employee_id' });

Business.hasMany(Contact, { foreignKey: 'business_id' });
Contact.belongsTo(Business, { foreignKey: 'business_id' });

Business.hasMany(ContactTag, { foreignKey: 'business_id' });
ContactTag.belongsTo(Business, { foreignKey: 'business_id' });

Contact.belongsToMany(ContactTag, { through: ContactTagMap, foreignKey: 'contact_id', otherKey: 'tag_id' });
ContactTag.belongsToMany(Contact, { through: ContactTagMap, foreignKey: 'tag_id', otherKey: 'contact_id' });

Business.hasMany(Customer, { foreignKey: 'business_id' });
Customer.belongsTo(Business, { foreignKey: 'business_id' });

Business.hasMany(OtpChallenge, { foreignKey: 'business_id' });
OtpChallenge.belongsTo(Business, { foreignKey: 'business_id' });

Business.hasMany(WaUser, { foreignKey: 'business_id' });
WaUser.belongsTo(Business, { foreignKey: 'business_id' });

Business.hasMany(Subscription, { foreignKey: 'business_id' });
Subscription.belongsTo(Business, { foreignKey: 'business_id' });

Subscription.hasMany(SubscriptionEvent, { foreignKey: 'subscription_id' });
SubscriptionEvent.belongsTo(Subscription, { foreignKey: 'subscription_id' });

Business.hasMany(Invoice, { foreignKey: 'business_id' });
Invoice.belongsTo(Business, { foreignKey: 'business_id' });
Subscription.hasMany(Invoice, { foreignKey: 'subscription_id' });
Invoice.belongsTo(Subscription, { foreignKey: 'subscription_id' });

Business.hasOne(WhatsappIntegration, { foreignKey: 'business_id' });
WhatsappIntegration.belongsTo(Business, { foreignKey: 'business_id' });

Business.hasMany(Appointment, { foreignKey: 'business_id' });
Appointment.belongsTo(Business, { foreignKey: 'business_id' });
Employee.hasMany(Appointment, { foreignKey: 'employee_id' });
Appointment.belongsTo(Employee, { foreignKey: 'employee_id' });
Customer.hasMany(Appointment, { foreignKey: 'customer_id' });
Appointment.belongsTo(Customer, { foreignKey: 'customer_id' });
WaUser.hasMany(Appointment, { foreignKey: 'wa_user_id' });
Appointment.belongsTo(WaUser, { foreignKey: 'wa_user_id' });

Appointment.hasMany(AppointmentRequestLog, { foreignKey: 'appointment_id' });
AppointmentRequestLog.belongsTo(Appointment, { foreignKey: 'appointment_id' });

Business.hasMany(QueueEntry, { foreignKey: 'business_id' });
QueueEntry.belongsTo(Business, { foreignKey: 'business_id' });
Employee.hasMany(QueueEntry, { foreignKey: 'employee_id' });
QueueEntry.belongsTo(Employee, { foreignKey: 'employee_id' });
Customer.hasMany(QueueEntry, { foreignKey: 'customer_id' });
QueueEntry.belongsTo(Customer, { foreignKey: 'customer_id' });
WaUser.hasMany(QueueEntry, { foreignKey: 'wa_user_id' });
QueueEntry.belongsTo(WaUser, { foreignKey: 'wa_user_id' });

Business.hasMany(WhatsappSession, { foreignKey: 'business_id' });
WhatsappSession.belongsTo(Business, { foreignKey: 'business_id' });

Business.hasMany(WhatsappMessageLog, { foreignKey: 'business_id' });
WhatsappMessageLog.belongsTo(Business, { foreignKey: 'business_id' });

module.exports = {
  sequelize,
  Business,
  BusinessSettings,
  BookingSettings,
  Employee,
  EmployeeWorkingHours,
  Contact,
  ContactTag,
  ContactTagMap,
  Customer,
  OtpChallenge,
  WaUser,
  Plan,
  Subscription,
  SubscriptionEvent,
  Invoice,
  WhatsappIntegration,
  Appointment,
  AppointmentRequestLog,
  QueueEntry,
  WhatsappSession,
  WhatsappMessageLog,
};
