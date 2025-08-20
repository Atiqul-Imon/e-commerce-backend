import { validationResult } from 'express-validator'
import { ApiError } from '../utils/ApiError.js'

export const validateRequest = (req, res, next) => {
  const errors = validationResult(req)
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }))
    
    // Return first error message for simplicity
    const firstError = errorMessages[0]
    throw new ApiError(400, firstError.message, errorMessages)
  }
  
  next()
}
