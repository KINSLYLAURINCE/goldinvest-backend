const success = (res, data, message = 'Succès', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

const error = (res, message = 'Erreur', statusCode = 400) =>
  res.status(statusCode).json({ success: false, message });

module.exports = { success, error };
