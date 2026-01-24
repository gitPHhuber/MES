class ApiError extends Error {
  constructor(status, message) {
    super();
    this.status = status;
    this.message = message;
  }

  // Ошибка валидации или некорректных данных (400)
  static badRequest(message) {
    return new ApiError(400, message);
  }

  // Ресурс не найден (404)
  static notFound(message) {
    return new ApiError(404, message);
  }

  // Внутренняя ошибка сервера (500)
  static internal(message) {
    return new ApiError(500, message);
  }

  // Доступ запрещен (права есть, но не для этого ресурса) (403)
  static forbidden(message) {
    return new ApiError(403, message);
  }

  // Пользователь не авторизован (нет токена или он неверный) (401)
  static unauthorized(message) {
    return new ApiError(401, message);
  }
}

module.exports = ApiError;