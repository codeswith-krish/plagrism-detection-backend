import jwt from 'jsonwebtoken';

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'your_jwt_secret_key_here', {
    expiresIn: '1d',
  });
};

export default generateToken;
