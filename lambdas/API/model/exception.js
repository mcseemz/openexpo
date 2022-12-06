const Forbidden = '[Forbidden]';
const NotFound = '[NotFound]';
const Invalid = '[Invalid]';
const InternalServerError = '[InternalServerError]';
const None = '[None]';

class ApiError extends Error {
  constructor(code = None,...params) {
    // Pass remaining arguments (including vendor specific ones) to parent constructor
    super(...params)

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError)
    }

    switch (code) {
      case Forbidden: this.errorCode = 403; break;
      case NotFound: this.errorCode = 404; break;
      case Invalid: this.errorCode = 405; break;
      case InternalServerError: this.errorCode = 502; break;
      case None: this.errorCode = 200; break;
      default: this.errorCode = 200;
    }

    this.name = 'ApiError';
    this.code = code;
    // Custom debugging information
    this.errorMessage = `${this.code} ${this.message}`;
//    this.date = new Date();
  }
}

function ApiException(code, message) {
  this.errorCode = code;
  this.errorMessage = `${code} ${message}`;
}

exports.Forbidden = Forbidden;
exports.Invalid = Invalid;
exports.InternalServerError = InternalServerError;
exports.NotFound = NotFound;

exports.ApiException = ApiException;
exports.ApiError = ApiError;